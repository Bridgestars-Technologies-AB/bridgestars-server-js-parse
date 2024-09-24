import 'parse/node'
import { removeAllAssociatedSessions, isAdminAsync, hasRoleAsync, hasRoleBool } from '../util'
import * as Validate from '../validation';
import DbObject, * as Requests from './dbobject'
import { isRoomModOrAdmin } from '../functions/room';



/*

types
0 - unknown
1 - education room

*/




class Role extends DbObject {

  static instance = new Role();

  private constructor() {
    super("_Role");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew() && req.object.get("name") != "admin") {
      const adminRole = await new Parse.Query(Parse.Role).equalTo("name", "admin").first({ useMasterKey: true });
      (req.object as Parse.Role).getRoles().add(adminRole as Parse.Role);
      // adminRole?.save(null, { useMasterKey: true, context: { noValidation: true } });
    }
  }
  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //add this role to admin role as well
  }
}


export default Role.instance;
