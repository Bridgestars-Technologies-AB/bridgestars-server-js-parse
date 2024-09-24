import axios from "axios";

import * as cloud from "parse-server/lib/cloud-code/Parse.Cloud.js";

import {
  removeAllAssociatedSessions,
  isAdminAsync,
  hasRoleBool,
} from "../util";
import * as Validate from "../validation";
import { REGEX } from "../validation";

import "parse/node";

import DbObject, * as Requests from "./dbobject";

class User extends DbObject {
  static instance = new User();

  private constructor() {
    super(Parse.User);
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.object.isNew()) {
      validateUserSignup(req);
      // Validate.setDefaultValue(req, 'emailVerified', false);
      // Validate.setDefaultValue(req, 'profileAccess', 0);
      // Validate.setDefaultValue(req, 'elo', 0);
      // Validate.setDefaultValue(req, 'xp', 0);
    } else validateUserUpdate(req);

    Validate.stringField(req, "first", {
      name: "firstName",
      minLength: 0,
      maxLength: 40,
      regex: `^[${REGEX.letters}]*$`,
    });
    Validate.stringField(req, "last", {
      name: "lastName",
      minLength: 0,
      maxLength: 25,
      regex: `^[${REGEX.letters}]*$`,
    });
    Validate.stringField(req, "bio", {
      minLength: 0,
      maxLength: 1000,
      regex: `^[${REGEX.letters + REGEX.numeric + REGEX.special}]*$`,
    });
    Validate.stringField(req, "nationality", {
      minLength: 0,
      maxLength: 30,
      regex: `^[${REGEX.letters}]*$`,
    });
    Validate.numberField(req, "elo", { min: 0, max: Infinity });
    Validate.numberField(req, "bal", { min: 0, max: Infinity });
    Validate.numberField(req, "xp", { min: 0, max: Infinity });
    Validate.immutable(req, "img");
    Validate.immutable(req, "friends");
    Validate.immutable(req, "ifr", { name: "incommingFriendRequests" });
    Validate.immutable(req, "ofr", { name: "outgoingFriendRequests" });
    Validate.required(req, "email");
    Validate.required(req, "username");
    Validate.required(req, "password");

    Validate.numberField(req, "profileAccess", { min: 0, max: 2 });
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {
      const acl = new Parse.ACL();
      acl.setRoleReadAccess("admin", true);
      acl.setRoleWriteAccess("admin", true);
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      req.object.setACL(acl);
      req.object.set("courses", undefined);
      req.object.set("rooms", undefined);
      req.object.set("subscriptions", undefined);
    } else {
      if (req.object.dirtyKeys().includes("courses")) {
        const oldCourses = new Set(req.original!.get("courses") as string[]);
        const newCourses = new Set(req.object.get("courses") as string[]);
        const addedCourses = new Set(
          [...newCourses].filter((x) => !oldCourses.has(x))
        );
        const removedCourses = new Set(
          [...oldCourses].filter((x) => !newCourses.has(x))
        );
        if (!(req.master || (await hasRoleBool("admin", req.user)))) {
          if (addedCourses.size > 0)
            throw new Error("This course is invite only.");
          //TODO: leave course, maybe mod endpoint to remove users is the easiest
          else if (removedCourses.size > 0)
            throw new Error("Contact support to leave a course");
        }
        if (!req.master)
          throw new Error(
            "To add or leave course, redeem a voucher or use a cloud function."
          );
        await addedCourses.forEach(async (c) => {
          const course: Parse.Object = new Parse.Object("Course", { id: c });
          course.increment("members");
          await course.save(null, { useMasterKey: true });
        });

        await removedCourses.forEach(async (c) => {
          const course: Parse.Object = new Parse.Object("Course", { id: c });
          course.increment("members", -1);
          await course.save(null, { useMasterKey: true });
        });
        // if (addedCourses.size > 0) {
        //   // only admin or master can add courses
        //   for (const course of addedCourses) {
        //     const role = await new Parse.Query(Parse.Role)
        //       .equalTo("name", "courseUser-" + course)
        //       .first({ useMasterKey: true });
        //     if (role) {
        //       role.getUsers().remove(req.object as Parse.User)
        //     }
        //   }
        // }
        // if (removedCourses.size > 0) {
        //   // only admin or master can remove course
        //   // remove all related roles
        //   for (const course of removedCourses) {
        //     const role = await new Parse.Query(Parse.Role)
        //       .equalTo("name", "courseUser-" + course)
        //       .first({ useMasterKey: true });
        //     if (role) {
        //       role.getUsers().remove(req.object as Parse.User)
        //     }
        //   }
        // }
      }
      if (req.object.dirtyKeys().includes("subscriptions")) {
        const oldSubs = new Set(req.original!.get("subscriptions") as string[]);
        const newSubs = new Set(req.object.get("subscriptions") as string[]);
        const addedSubs = new Set([...newSubs].filter((x) => !oldSubs.has(x)));
        const removedSubs = new Set(
          [...oldSubs].filter((x) => !newSubs.has(x))
        );
        if (!(req.master || (await hasRoleBool("admin", req.user)))) {
          if (addedSubs.size > 0)
            throw new Error("Subscription can't be added without payment.");
          //TODO: leave room
          else if (removedSubs.size > 0)
            throw new Error("Manage subscription via the billing dashboard.");
        }

        const courseIds = new Set([
          ...(req.object.get("courses") ?? []),
          ...(req.original?.get("courses") ?? []),
        ]);

        if (addedSubs.size > 0) {
          // only admin or master can add rooms
          if ([...addedSubs].includes("education")) {
            // add roles to all courses currently in user.get("courses")
            const roleNames = [...courseIds].map((c) => "courseUser-" + c);
            const roles = await new Parse.Query(Parse.Role)
              .containedIn("name", roleNames)
              .findAll({ useMasterKey: true });

            if (roles) {
              roles.forEach((role) =>
                role.getUsers().add(req.object as Parse.User)
              );
              await Parse.Object.saveAll(roles, { useMasterKey: true });
            }
          }
        }
        if (removedSubs.size > 0) {
          // only admin or master can add rooms
          // leave all courses but keep roles
          if ([...removedSubs].includes("education")) {
            //generate set of all role names
            const roleNames = Array.from(courseIds).map(
              (c) => "courseUser-" + c
            );
            console.log("\n\n\n\nremoved subs", roleNames);
            const roles = await new Parse.Query(Parse.Role)
              .containedIn("name", roleNames)
              .findAll({ useMasterKey: true });

            console.log(
              "\n\n\n\nremoved subs",
              roles.map((x) => x.get("name"))
            );
            if (roles) {
              roles.forEach((role) =>
                role.getUsers().remove(req.object as Parse.User)
              );
              await Parse.Object.saveAll(roles, { useMasterKey: true });
            }
          }
        }
      }
      if (req.object.dirtyKeys().includes("rooms")) {
        const oldRooms = new Set(req.original!.get("rooms") as string[]);
        const newRooms = new Set(req.object.get("rooms") as string[]);
        const addedRooms = new Set(
          [...newRooms].filter((x) => !oldRooms.has(x))
        );
        const removedRooms = new Set(
          [...oldRooms].filter((x) => !newRooms.has(x))
        );
        if (!(req.master || (await hasRoleBool("admin", req.user)))) {
          if (addedRooms.size > 0) throw new Error("This room is invite only.");
          else if (removedRooms.size > 0)
            throw new Error(
              "Internal error, room should be removed via cloud function"
            );
        }
        if (!req.master)
          throw new Error(
            "To add or leave room, redeem a voucher or use a cloud function."
          );
        // if (removedRooms.size > 0) {
        //   // only admin or master can add rooms
        //   const courseIds = new Set({ ...req.object.get("courses"), ...req.original?.get("courses") });

        //   for (const room of removedRooms) {

        //     //find all courses belonging to this room
        //     const courses = await new Parse.Query("Course")
        //       .equalTo("room", room)
        //       .containedIn("objectId", [...courseIds])
        //       .findAll({ useMasterKey: true })
        //     const user = new Parse.User({id: req.object.id}) as Parse.User
        //     for (const c of courses) {
        //       //leave course
        //       if(!courseIds.has(c.id)) throw new Error("INTERNAL ERROR: THIS SHOULD NEVER HAPPEN, user/dirtyKeys/rooms/addedRooms");

        //       user.remove("courses", c.id)
        //     }
        //     if(courses.length > 0) await user.save(null, {useMasterKey:true}) // this is so that course roles will be removed as well, recursively.

        //     const role = await new Parse.Query(Parse.Role)
        //       .equalTo("name", "roomUser-" + room)
        //       .first({ useMasterKey: true });
        //     if (role) {
        //       role.getUsers().remove(req.object as Parse.User)
        //       await role.save(null, { useMasterKey: true })
        //     }
        //   }
        // }
        // if (addedRooms.size > 0) {
        //   // only admin or master can remove rooms
        //   // remove all related roles
        //   for (const room of addedRooms) {
        //     const role = await new Parse.Query(Parse.Role)
        //       .equalTo("name", "roomUser-" + room)
        //       .first({ useMasterKey: true });
        //     if (role) {
        //       role.getUsers().add(req.object as Parse.User)
        //     }
        //   }
        // }
      }
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (!req.original) {
      if (!(req.object.get("email") as string).endsWith("@bridgestars.net")) {
        const emails = req.object.get("emails_sent");
        if (!emails || !emails.includes("welcome")) {
          await cloud.sendEmail({
            templateName: "welcomeEmail",
            user: req.object, // user with email address
          });
          req.object.addUnique("emails_sent", ["welcome"]);
          await req.object.save(null, {
            useMasterKey: true,
            context: { noValidation: true },
          });
        }
      }
    } else {
      //old exists
      if (req.original.get("avatar").url() !== req.object.get("avatar").url()) {
        //remove original
        await req.original.get("avatar").destroy();
      }
    }
  }
  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    console.log(
      "\n\n\nDELETE USER AND SESSIONS id: " + req.object.id + "\n\n\n"
    );
    await removeAllAssociatedSessions(req.object as Parse.User);
  }
}

function validateEmail(email: string) {
  var re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validateUsername(username: string) {
  var re = /^[A-Za-z0-9åäöÅÄÖøØæÆ][A-Za-z0-9_\-\.\#åäöÅÄÖøØæÆ]{2,15}$/;
  return re.test(username);
}

function validateUserSignup(req: Parse.Cloud.BeforeSaveRequest) {
  const user = req.object;
  const email = user.get("email").toLowerCase().trim();
  if (!email) throw new Error("Missing email.");
  else if (!validateEmail(email))
    throw new Error("Email does not meet the Email Policy requirements");
  user.set("email", email);

  //VALIDATE USERNAME
  const un = user.get("username").trim();
  if (!validateUsername(un))
    throw new Error("Username does not meet the Username Policy requirements");
  user.set("dispName", un);
  user.set("username", un.toLowerCase());
}

function validateUserUpdate(req: Parse.Cloud.BeforeSaveRequest) {
  const user = req.object;
  //VALIDATE USERNAME
  const dirty = user.dirtyKeys();
  if (dirty.includes("dispName")) {
    throw new Error("Display_username can't be updated");
  }
  if (dirty.includes("username")) {
    const un = user.get("username").trim();
    if (!validateUsername(un))
      throw new Error(
        "Username does not meet the Username Policy requirements"
      );
    user.set("dispName", un);
    user.set("username", un.toLowerCase());
  }

  if (dirty.includes("email")) throw new Error("Email can't be updated yet.");
  if (!req.master && dirty.includes("password"))
    throw new Error("Password can't be updated yet.");
}

export default User.instance;
