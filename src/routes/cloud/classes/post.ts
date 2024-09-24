import axios from "axios";
import "parse/node";
//import { ParseCloudClass } from 'parse-server-addon-cloud-class';
import { removeAllAssociatedSessions, isAdminAsync } from "../util";
import * as Validate from "../validation";
// require('parse-server-addon-cloud-class')

import DbObject, * as Requests from "./dbobject";
import { parentPort } from "worker_threads";
import { isRoomModOrAdmin, isRoomUser } from "../functions/room";

export class Post extends DbObject {
  static instance = new Post();

  private constructor() {
    super("Post");
  }

  /* type
    Unknown = 0,
    Request = 1,
    Problem = 2,
    News = 3,
    Question = 4,
    PracticeSet = 5,
    Chapter = 6
  */
  /* subtype
    subtype: 0 = unknown
    ...  depends on type
  */

  validate(req: Requests.BeforeSaveRequest): void {
    console.log("Validating Post");
    Validate.required(req, "type");
    Validate.immutable(req, "type");
    Validate.numberField(req, "type", { min: 0, max: 10 }); //only one type for now

    Validate.required(req, "subtype");
    Validate.immutable(req, "subtype");
    Validate.numberField(req, "subtype", { min: 0, max: 100 }); //only one type for now

    Validate.required(req, "title");
    const t = req.object.get("type");
    if (t != 1 && t != 5 && t != 6) Validate.immutable(req, "title");
    Validate.stringField(req, "title", { minLength: 6, maxLength: 350 }); //any characters allowed, emojis etc, maybe should add check for bad words

    Validate.immutable(req, "comments");
    Validate.numberField(req, "comments", {
      min: 0,
      max: 9999,
      maxIncrement: 1,
    });

    var reactions = req.object.get("reactions");
    if (reactions) {
      Object.keys(reactions).forEach((key) => {
        Validate.numberField(req, "reactions." + key, {
          min: 0,
          max: 99999,
          maxIncrement: 1,
        });
      });
    }
    var info = req.object.get("info");
    if (info) {
      Object.keys(info).forEach((key) => {
        Validate.stringField(req, "info." + key, {
          minLength: 0,
          maxLength: 100,
        });
      });
      Validate.string("info", JSON.stringify(info), { maxLength: 1500 });
    }
    if (req.object.get("type") == 1) Validate.required(req, "data"); // ONLY REQUESTS NEED DESCRIPTION MANDATORY
    if (false) Validate.immutable(req, "data");
    Validate.stringField(req, "data", { minLength: 0, maxLength: 10000 });

    // Validate.required(req, 'data2');
    if (false) Validate.immutable(req, "data2");
    Validate.stringField(req, "data2", { minLength: 0, maxLength: 10000 });

    if (req.object.isNew()) {
      // Validate.maxDiff(req, 'comments', 1);//this and maxIncrement????
      // set default values
      // Validate.setDefaultValue(req, 'comments', 0);
      // Validate.setDefaultValue(req, 'reactions', {});
      // Validate.setDefaultValue(req, 'type', 0);
    }
    const type = req.object.get("type");
    if (type == 4 || type == 5 || type == 6) {
      // questions, practice sets, chapters
      Validate.required(req, "room");
      if (type != 4) Validate.required(req, "parent"); //can be course for example, question does not need subtype
    }

    Validate.setDefaultValue(req, "reactions", undefined);
    Validate.setDefaultValue(req, "info", undefined);
    Validate.setDefaultValue(req, "comments", undefined);
    console.log("Validating Post Done");
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    const type = req.object.get("type");
    if (type == 3 && !req.master)
      await isAdminAsync(req.user).catch((e) => {
        throw new Error("Only admins can create news items");
      });

    if (type == 4 || type == 5 || type == 6) {
      //questions, practice sets, chapters
      //check room exists with query
      const room = await new Parse.Query("Room")
        .equalTo("objectId", req.object.get("room"))
        .first({ useMasterKey: true });
      if (!room) throw new Error("Room does not exist.");
      //check parent exists
      if (
        req.object.get("parent") &&
        req.object.get("parent") != req.object.get("room")
      ) {
        const course = await new Parse.Query("Course")
          .equalTo("objectId", req.object.get("parent"))
          .first({ useMasterKey: true });
        const post = await new Parse.Query("Post")
          .equalTo("objectId", req.object.get("parent"))
          .first({ useMasterKey: true });
        if (!course && !post) throw new Error("Parent anchor does not exist.");
      }
      if (type != 4) {
        // practice set or chapter
        //if user is room moderator or admin, allow
        if (
          !(await isRoomModOrAdmin(req.object.get("room"), req.user)) &&
          !req.master
        )
          throw new Error(
            "Only room moderators allowed to add or modify chapters and practice sets."
          );
      } else {
        //question
        //if user is room moderator or room user, allow
        if (
          !(await isRoomUser(req.object.get("room"), req.user)) &&
          !(await isRoomModOrAdmin(req.object.get("room"), req.user)) &&
          !req.master
        )
          throw new Error(
            "Only room users are allowed to add or modify room questions."
          );
      }
    } else if (type === 1) {
      const title = req.object.get("title");
      // check if title is exactly the same somewhere else. low chance maybe just inefficient-. doesnt even handle lower uppercase.
      // const q = new Parse.Query("Post").equalTo("type", 1).equalTo("")
    }

    if (!req.user && !req.master) throw new Error("Must be signed in to post.");
    if (req.master && req.context.noValidation) return;

    if (req.object.isNew()) {
      req.object.set("archived", false);
      if (req.user) req.object.set("author", req.user); // Set the author to the current user
      const acl = new Parse.ACL();
      if (req.object.get("room")) {
        // acl.setPublicReadAccess(true);
        // acl.setPublicWriteAccess(false);
        const room = req.object.get("room");
        acl.setRoleReadAccess("roomMod-" + room, true);
        acl.setRoleWriteAccess("roomMod-" + room, true);
        if (req.object.get("type") == 4)
          //questions
          acl.setRoleReadAccess("roomUser-" + room, true);
        if (req.object.get("type") == 5) {
          //practice sets, is a child of chapter
          var chapter = await new Parse.Query("Post")
            .equalTo("type", 6)
            .equalTo("objectId", req.object.get("parent"))
            .first({ useMasterKey: true });
          if (!chapter)
            throw new Error("A practice set must have a chapter as parent.");
          acl.setRoleReadAccess("courseUser-" + chapter.get("parent"), true);
        }
        if (req.object.get("type") == 6)
          //chapters, is a child of course
          acl.setRoleReadAccess("courseUser-" + req.object.get("parent"), true);
      } else {
        acl.setPublicReadAccess(true);
        // acl.setPublicWriteAccess(false); //false
        acl.setRoleWriteAccess("admin", true);
      }
      if (req.user) acl.setWriteAccess(req.user.id, true);
      req.object.setACL(acl);
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (!req.original) {
      //create public chat
      console.log(
        "Creating chat... for post: " +
        req.object.id +
        " type: " +
        req.object.get("type")
      );
      if (req.object.get("type") == 5 || req.object.get("type") == 6) return; //practice sets, chapters

      const chat = new Parse.Object("Chat");
      chat.set("parent", req.object.id);

      if (!req.object.get("room")) chat.set("public", true);
      else chat.set("room", req.object.get("room"));

      const c = await chat.save(null, { useMasterKey: true });
      if (!c) throw new Error("Chat could not be created.");
      req.object.set("chat", c.id);
      console.log("Chat created: " + c.id);
      await req.object.save(null, {
        useMasterKey: true,
        context: { noValidation: true },
      });
    }
  }

  override async beforeDelete(
    req: Requests.BeforeDeleteRequest
  ): Promise<void> {
    //if admin just delete
    // if author check if post has votes or comments, then don't allow delete
    if (req.master) return;
    if (req.object.get("room")) {
      const mod = await isRoomModOrAdmin(req.object.get("room"), req.user);
      if (mod) return;
    } else {
      if (req.object.get("author").id != req.user?.id)
        throw new Error("Only the author can archive this post.");

      let nbrReactions = Object.values(
        req.object.get("reactions") as Object
      ).reduce((x, sum) => x + sum, 0);

      if (req.object.get("reactions") && nbrReactions > 0) {
        const ownReactions = await new Parse.Query("Reaction")
          .equalTo("target", req.object.id)
          .equalTo("type", 1) //post
          .equalTo("user", req.user?.id)
          .first({ useMasterKey: true });
        if (ownReactions) nbrReactions--;
        if (nbrReactions > 0)
          throw new Error(
            "This post has already been reacted on and can therefore not be archived."
          );
      }
      if (req.object.get("comments") > 0)
        throw new Error(
          "This post has already been commented on and can therefore not be archived."
        );
    }
  }
  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    //delete chat
    const chat = req.object.get("chat");

    if (chat) {
      try {
        await new Parse.Object("Chat", { id: chat }).destroy({
          useMasterKey: true,
        });
      } catch (e) {
        console.error("failed: Could not delete chat.");
      } //ignore error
    }

    //find all reactions and delete them
    const reactions = await new Parse.Query("Reaction")
      .equalTo("target", req.object.id)
      .equalTo("type", 1)
      .findAll({ useMasterKey: true });
    if (reactions)
      await Parse.Object.destroyAll(reactions, { useMasterKey: true });
  }
}
export default Post.instance;
