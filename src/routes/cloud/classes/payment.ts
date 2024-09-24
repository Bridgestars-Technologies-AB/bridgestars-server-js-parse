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




class Payment extends DbObject {

  static instance = new Payment();

  private constructor() {
    super("Payment");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew() && req.object.get("name") != "admin") {

    }
  }
  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //add this Payment to admin Payment as well
  }
}


export default Payment.instance;
