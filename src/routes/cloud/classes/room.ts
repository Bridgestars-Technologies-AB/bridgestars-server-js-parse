import 'parse/node'
import { removeAllAssociatedSessions, isAdminAsync, hasRoleAsync, hasRoleBool, isAdminBool } from '../util'
import * as Validate from '../validation';
import DbObject, * as Requests from './dbobject'
import { isRoomModOrAdmin as isRoomModOrAdmin } from '../functions/room';



/*

types
0 - unknown
1 - education room


TODO: delete all courses etc when room is deleted???, dont allow for room deletion?? what to do...
*/




class Room extends DbObject {

  static instance = new Room();

  private constructor() {
    super("Room");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if(!req.user && !req.master) throw new Error("You must be logged in to create a room.")
    if (req.master && req.context.noValidation) return; //PREVENT LOOP

    Validate.setDefaultValue(req, 'type', 1)
    Validate.required(req, 'name')
    Validate.required(req, 'desc')
    Validate.required(req, 'name')
    Validate.stringField(req, 'name', { minLength: 5, maxLength: 50 });
    Validate.stringField(req, 'desc', { minLength: 10, maxLength: 1000 });

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (req.object.isNew()) {
      if(!(req.master || await isAdminBool(req.user))) throw new Error("You must be master to create a room.");
      //only allow one room with the same name
      const query = new Parse.Query("Room");
      query.equalTo("name", req.object.get("name"));
      const room = await query.first({ useMasterKey: true });
      if (room) throw new Error("Room with this name already exists.")



      const acl = new Parse.ACL();
      // acl.setRoleReadAccess("admin", true);
      // acl.setRoleWriteAccess("admin", true);
      // acl.setPublicReadAccess(false)
      // acl.setPublicWriteAccess(false)
      // if(req.object.get("public")) acl.setPublicReadAccess(true)
      req.object.setACL(acl)
    }
    else {
      if (req.master || await isRoomModOrAdmin(req.object.id, req.user)) {
        // const acl = req.object.getACL();
        // acl?.setPublicReadAccess(req.object.get("public"))
        // if(acl) req.object.setACL(acl);
        return 
      }
      else {
        throw new Error("You are not allowed to edit this room.")
      }
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (!req.original) {//NEW ROOM
      //create role roomMod-<roomid> 
      await new Parse.Role("", new Parse.ACL()).save({name: 'roomMod-' + req.object.id}, {useMasterKey: true});
      //create role roomUser-<roomid>
      await new Parse.Role("", new Parse.ACL()).save({name: 'roomUser-' + req.object.id}, {useMasterKey: true});

      const acl = req.object.getACL();
      acl?.setRoleReadAccess("roomUser-" + req.object.id, true);
      // acl?.setRoleWriteAccess("roomUser-" + req.object.id, false);
      acl?.setRoleReadAccess("roomMod-" + req.object.id, true);
      acl?.setRoleWriteAccess("roomMod-" + req.object.id, true);
      if(acl) req.object.setACL(acl)
      await req.object.save(null, { useMasterKey: true, context: { noValidation: true } })
    }
  }

  override async beforeDelete(req: Requests.BeforeDeleteRequest): Promise<void> {
     if(req.object.get("desc") !== "BS_ROOM_TEST" && req.object.get("name") !== "BS_ROOM_TEST") 
      throw new Error("Rooms should not be deleted.") // TODO: what to do here?
  }



  override async afterDelete(req: Requests.AfterDeleteRequest):  Promise<void> {
     // we should not remove everything connected to this room unless we are testing.
     //remove this room's roles
        
      //remove all courses
      const courses = await new Parse.Query("Course").equalTo("room", req.object.id).findAll({useMasterKey: true});
      if(courses) await Parse.Object.destroyAll(courses, {useMasterKey: true});

      //remove all posts that are in this room
      const posts = await new Parse.Query("Post").equalTo("room", req.object.id).findAll({useMasterKey: true});
      if(posts) await Parse.Object.destroyAll(posts, {useMasterKey: true});

      const roomModRole = await new Parse.Query(Parse.Role)
        .equalTo("name", "roomMod-" + req.object.id)
        .first({useMasterKey: true}); 
      if(roomModRole) await roomModRole.destroy({useMasterKey: true});

      const roomUserRole = await new Parse.Query(Parse.Role)
        .equalTo("name", "roomUser-" + req.object.id)
        .first({useMasterKey: true});
      if(roomUserRole) await roomUserRole.destroy({useMasterKey: true});
  }
}


export default Room.instance;
