import "parse/node";
import {
  removeAllAssociatedSessions,
  isAdminAsync,
  hasRoleAsync,
  hasRoleBool,
} from "../util";
import * as Validate from "../validation";
import DbObject, * as Requests from "./dbobject";
import { isRoomModOrAdmin } from "../functions/room";

/*

types
0 - unknown
1 - education room

*/

class Course extends DbObject {
  static instance = new Course();

  private constructor() {
    super("Course");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

    Validate.required(req, "room");
    Validate.immutable(req, "room");

    Validate.required(req, "desc");
    Validate.required(req, "title");
    Validate.stringField(req, "title", { minLength: 5, maxLength: 50 });
    Validate.stringField(req, "desc", { minLength: 14, maxLength: 1000 });
    Validate.stringField(req, "data", { minLength: 0, maxLength: 15000 });

    Validate.immutable(req, "members");
    Validate.numberField(req, "length_weeks", { min: 0, max: 52 });
    Validate.dateField(req, "start");
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (
      req.master ||
      (await isRoomModOrAdmin(req.object.get("room"), req.user))
    ) {
      if (req.object.isNew()) {
        //make sure room exists:

        const room = await new Parse.Query("Room")
          .equalTo("objectId", req.object.get("room"))
          .first({ useMasterKey: true });
        if (!room) throw new Error("Room does not exist.");

        //check if course with same title exists in room
        const query = new Parse.Query("Course");
        query.equalTo("title", req.object.get("title"));
        query.equalTo("room", req.object.get("room"));
        const course = await query.first({ useMasterKey: true });
        if (course)
          throw new Error(
            "Course with this title already exists in this room."
          );

        const acl = new Parse.ACL();
        // acl.setRoleReadAccess("admin", true);
        // acl.setRoleWriteAccess("admin", true);
        // acl.setPublicReadAccess(false)
        // acl.setPublicWriteAccess(false) // UNDEFINED IS SAME AS FALSE
        acl.setRoleReadAccess("roomUser-" + req.object.get("room"), true);
        // acl.setRoleWriteAccess("roomUser-" + req.object.get("room"), false);
        acl.setRoleReadAccess("roomMod-" + req.object.get("room"), true);
        acl.setRoleWriteAccess("roomMod-" + req.object.get("room"), true);
        // if(req.object.get("public")) acl.setPublicReadAccess(true)
        req.object.setACL(acl);
        //Create couresUser role
      }
    } else
      throw new Error(
        "You are not allowed to add or edit courses in this room."
      );
  }
  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

    if (!req.original)
      await new Parse.Role("", new Parse.ACL()).save(
        { name: "courseUser-" + req.object.id },
        { useMasterKey: true }
      );
  }

  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    // we should not remove everything connected to this room unless we are testing.
    //remove this course's roles
    // const courseModRole = await new Parse.Query(Parse.Role)
    //   .equalTo("name", "courseMod-" + req.object.id)
    //   .first({ useMasterKey: true });
    // if (courseModRole) await courseModRole.destroy({ useMasterKey: true });

    const courseUserRole = await new Parse.Query(Parse.Role)
      .equalTo("name", "courseUser-" + req.object.id)
      .first({ useMasterKey: true });
    if (courseUserRole) await courseUserRole.destroy({ useMasterKey: true });
  }
}

export default Course.instance;
