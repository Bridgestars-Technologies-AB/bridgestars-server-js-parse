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




class Invoice extends DbObject {

  static instance = new Invoice();

  private constructor() {
    super("Invoice");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {

      //if inv_id already exists, throw error
      const inv = await new Parse.Query(this.name)
        .equalTo("inv_id", req.object.get("inv_id"))
        .first({ useMasterKey: true });
      if (inv) throw new Error("Invoice already exists.")
      //add sub to user

      let user = await new Parse.Query("_User")
        .equalTo("objectId", req.object.get("user")).first({ useMasterKey: true });
      if (!user) {
        const cus = await new Parse.Query("Customer")
          .equalTo("cus_id", req.object.get("cus_id"))
          .first({ useMasterKey: true })
        if (!cus) throw new Error("User does not exist.")
        user = await new Parse.Query("_User")
          .equalTo("objectId", cus.get("user"))
          .first({ useMasterKey: true })
        if(!user) throw new Error("User does not exist.")
      }
      if (user.get("username").includes("bs_tester")) req.object.set("test", true)
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //add this Payment to admin Subscription as well
  }
}


export default Invoice.instance;
