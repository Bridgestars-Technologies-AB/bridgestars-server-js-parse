import "parse/node";
import DbObject, * as Requests from "./dbobject";
import * as Validate from "../validation";
import { hasRoleAsync, hasRoleBool } from "../util";

/*

types
0 - unknown
1 - RoomEntry
2 - CourseEntry

*/

class Voucher extends DbObject {
  static instance = new Voucher();

  private constructor() {
    super("Voucher");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    Validate.immutable(req, "type");
    Validate.immutable(req, "uses");
    Validate.immutable(req, "usedBy");
    Validate.immutable(req, "usedAt");
    Validate.immutable(req, "pending");
    Validate.immutable(req, "lastUsedAt");
    Validate.immutable(req, "lastUsedBy");
    // Validate.immutable(req, "desc")
    // Validate.immutable(req, "validUntil")
    Validate.immutable(req, "data");
    // Validate.immutable(req, "maxUses")
    // Validate.immutable(req, "customCode")
    Validate.stringField(req, "customCode", {
      minLength: 0,
      maxLength: 30,
      name: "custom voucher code",
    });

    Validate.required(req, "type");
    Validate.required(req, "data");

    Validate.setDefaultValue(req, "enabled", true);
    //switch type course or roomentry verify that data field is length 10
    switch (req.object.get("type")) {
      case 1:
        Validate.stringField(req, "data", { length: 10 });
        break;
      case 2:
        Validate.stringField(req, "data", { length: 10 });
        break;
      default:
        throw "Invalid voucher type";
    }

    Validate.numberField(req, "uses", { min: 0, maxIncrement: 1 });

    if (req.object.get("usedAt")) {
      let i = 0;
      for (const usedAt of req.object.get("usedAt")) {
        Validate.number("usedAt[" + i + "]", usedAt, {
          min: 0,
          max: Date.now(),
        });
        i++;
      }
    }
    if (req.object.get("lastUsedAt")) Validate.dateField(req, "lastUsedAt");

    if (req.object.get("usedBy")) {
      let i = 0;
      for (const usedBy of req.object.get("usedBy")) {
        Validate.string("usedBy[" + i + "]", usedBy, { length: 10 });
        i++;
      }
    }

    //set maxlength of desc, data to 1000
    Validate.stringField(req, "desc", { maxLength: 1000 });
    Validate.stringField(req, "data", { maxLength: 1000 });

    Validate.numberField(req, "maxUses", { min: 0 });
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {
      // if type == room check if room exists
      switch (req.object.get("type")) {
        case 1:
          {
            const room = await new Parse.Query("Room")
              .equalTo("objectId", req.object.get("data"))
              .first({ useMasterKey: true });
            if (!room)
              throw new Error(
                "A RoomEntryVoucher must refer to a Room that exists."
              );

            //if user has role with name includes roomMod
            if (
              !req.master &&
              !(await hasRoleBool("roomMod-" + room.id, req.user)) &&
              !(await hasRoleBool("admin", req.user))
            )
              throw new Error("Only roomMods can create RoomEntryVouchers.");
            const acl = new Parse.ACL();
            acl.setRoleReadAccess("roomMod-" + room.id, true);
            acl.setRoleWriteAccess("roomMod-" + room.id, true);
            req.object.setACL(acl);
          }
          break;
        case 2:
          {
            const course = await new Parse.Query("Course")
              .equalTo("objectId", req.object.get("data"))
              .first({ useMasterKey: true });
            if (!course)
              throw new Error(
                "A CourseEntryVoucher must refer to a Course that exists."
              );
            const room = course.get("room");
            //if user has role with name includes roomMod
            if (
              !req.master &&
              !(await hasRoleBool("roomMod-" + room, req.user)) &&
              !(await hasRoleBool("admin", req.user))
            )
              throw new Error("Only roomMods can create CourseEntryVouchers.");
            const acl = new Parse.ACL();
            acl.setRoleReadAccess("roomMod-" + room, true);
            acl.setRoleWriteAccess("roomMod-" + room, true);
            req.object.setACL(acl);
          }
          break;
        default:
          throw new Error("Voucher type unknown.");
      }
    }

    const customCode = req.object.get("customCode");
    if (req.object.isNew() || customCode !== req.original?.get("customCode")) {
      //validate customCode
      var count = await new Parse.Query("Voucher")
        .equalTo("customCode", customCode)
        .count({ useMasterKey: true });
      if (count != 0)
        throw new Error(
          "Custom redeemption code has an invalid value, try something else."
        );
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //add this Voucher to admin Voucher as well
    if (!req.original) {
    }
  }

  override async beforeDelete(
    req: Requests.BeforeDeleteRequest
  ): Promise<void> {
    if (req.master) return; //PREVENT LOOP)
    if (await hasRoleBool("admin", req.user)) return;
    else
      throw new Error(
        "Vouchers are not meant to be deleted, disable it instead."
      );
  }
}

export default Voucher.instance;
