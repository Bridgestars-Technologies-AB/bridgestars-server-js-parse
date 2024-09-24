import "parse/node";
import {
  numberField,
  stringField,
  immutable,
  required,
  setDefaultValue,
} from "../validation";

// require('parse-server-addon-cloud-class')
import DbObject, * as Requests from "./dbobject";
import { hasRoleBool } from "../util";

class Message extends DbObject {
  static instance = new Message();

  private constructor() {
    super("Message");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    immutable(req, "chat");
    immutable(req, "sender");

    required(req, "chat");
    required(req, "text");

    numberField(req, "status", { min: 0, max: 3 }); //none, sent, delivered, read
    stringField(req, "text", { minLength: 1, maxLength: 2000 }); //no regex, can write anything
    stringField(req, "chat", { length: 10 });
    setDefaultValue(req, "reactions", undefined);
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    console.log("\n\n\n");
    console.log(JSON.stringify(req));
    if (req.object.isNew()) {
      if (!req.user)
        throw new Error("User must be signed in to send a message.");
      const chat = await new Parse.Query("Chat")
        .equalTo("objectId", req.object.get("chat"))
        .first({ useMasterKey: true });
      if (!chat) throw new Error("Chat does not exist.");

      const users: string[] = chat.get("users");
      console.log(JSON.stringify(users));
      if (
        !chat.get("public") &&
        !users.includes(req.user.id) &&
        !chat.get("room")
      )
        throw new Error(
          "Chat does not exist, or user is not a member of the chat."
        );
      if (chat.get("room")) {
        //fetch room roles and check if user has permission to send message
        const roomUser = await new Parse.Query(Parse.Role)
          .equalTo("name", "roomUser-" + chat.get("room"))
          .first();
        if (roomUser) {
          const roleUsers = roomUser.getUsers();
          const u = roleUsers.query().equalTo("objectId", req.user.id).first();
          if (!u) {
            const roomMod = await new Parse.Query(Parse.Role)
              .equalTo("name", "roomMod-" + chat.get("room"))
              .first();
            if (roomMod) {
              const u2 = roleUsers
                .query()
                .equalTo("objectId", req.user.id)
                .first();
              if (!u2)
                throw Error("You do not have permission to use this chat.");
            } else throw Error("Internal error: Chat is not set up right.");
          }
        } else throw Error("Internal error: Chat is not set up right.");
      }
      chat.increment("num_mess", 1);
      chat.save(null, { useMasterKey: true }); //should trigger save on chat and update parent comment count

      req.object.set("status", 1); //sent
      req.object.set("sender", req.user.id);
      const acl = new Parse.ACL(chat.getACL()?.toJSON());
      if (!acl) throw new Error("Chat is missing ACL.");
      acl.setWriteAccess(req.user, true);
      req.object.setACL(acl);
    } else {
      if (req.object.get("status") < req.original?.get("status"))
        req.object.set("status", req.original?.get("status"));
      //TODO SENDER CANT MARK AS READ OR DELIVERED?

      //mod cant modify but can delete
      if (req.user?.id == req.object.get("sender")) {
        if (req.original?.get("status") == 3)
          throw new Error("Message has already been read, cannot be edited."); //TODO REMOVE?
      } else if (!(await hasRoleBool("admin", req.user)) && !req.master)
        throw new Error(
          "Editing others messages is not allowed, moderators can only delete messages."
        );
    }
    const html = req.object.get("text");
    html.replace(/<p><br><\/p>$/, "");
    req.object.set("text", html);
  }
  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> { }
  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    const chat = await new Parse.Query("Chat")
      .equalTo("objectId", req.object.get("chat"))
      .first({ useMasterKey: true });
    if (chat) {
      chat.increment("num_mess", -1);
      chat.save(null, { useMasterKey: true }); //should trigger save on chat and update parent comment count
    }
    //find all reactions and delete them
    const reactions = await new Parse.Query("Reaction")
      .equalTo("target", req.object.id)
      .equalTo("type", 2)
      .findAll({ useMasterKey: true });
    if (reactions && reactions.length > 0)
      await Parse.Object.destroyAll(reactions, { useMasterKey: true });
  }
}

export default Message.instance;
