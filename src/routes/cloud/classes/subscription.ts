import 'parse/node'
import { removeAllAssociatedSessions, isAdminAsync, hasRoleBool } from '../util'
import * as Validate from '../validation';
import DbObject, * as Requests from './dbobject'
import { isRoomModOrAdmin } from '../functions/room';



/*

types
0 - unknown
1 - education room

*/




class Subscription extends DbObject {

  static instance = new Subscription();

  private constructor() {
    super("Subscription");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    console.log("NEW SUB 0")
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {

    console.log("NEW SUB 1")
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {
      console.log("NEW SUB 2")
      //if sub_id already exists, throw error
      const sub = await new Parse.Query(this.name)
        .equalTo("sub_id", req.object.get("sub_id"))
        .first({ useMasterKey: true });
      if (sub) throw new Error("Subscription already exists.")
      //add sub to user

      const user = await new Parse.Query("_User")
        .equalTo("objectId", req.object.get("user")).first({ useMasterKey: true });
      if (!user) throw new Error("User does not exist.")

      if (user.get("username").includes("bs_tester")) req.object.set("test", true)

      user.addUnique("subscriptions", req.object.get("name"))
      await user.save(null, { useMasterKey: true })
    }
    else {
      //Possible values are incomplete, incomplete_expired, trialing, active, past_due, canceled, or unpaid.
      if (req.object.dirty("status")) {
        const status = req.object.get("status")
        if (status == "active" || status == "trialing") {
          const user = await new Parse.Query("_User")
            .equalTo("objectId", req.object.get("user"))
            .first({ useMasterKey: true });
          if (user) {
            const usubs = user.get("subscriptions")
            if (usubs && usubs.includes(req.object.get("name"))) { }
            else {
              user.addUnique("subscriptions", req.object.get("name"))
              await user.save(null, { useMasterKey: true })
            }
          }
        }
        else {
          //remove sub from user
          const user = await new Parse.Query("_User")
            .equalTo("objectId", req.object.get("user"))
            .first({ useMasterKey: true });
          if (user) {
            user.remove("subscriptions", req.object.get("name"))
            await user.save(null, { useMasterKey: true })
          }
        }
      }
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }
  override async beforeDelete(req: Requests.BeforeDeleteRequest): Promise<void> {
    // if (req.master) return; //PREVENT LOOP
    //get user
    const user = await new Parse.Query("_User")
      .equalTo("objectId", req.object.get("user"))
      .first({ useMasterKey: true });
    if (user) {
      user.remove("subscriptions", req.object.get("name"))
      await user.save(null, { useMasterKey: true })
    }
  }
}


export default Subscription.instance;
