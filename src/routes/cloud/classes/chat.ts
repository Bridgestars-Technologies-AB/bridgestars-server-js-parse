import axios from 'axios';
import 'parse/node'
import { removeAllAssociatedSessions, isAdminAsync } from '../util'
import DbObject, * as Requests from './dbobject'
import * as Validation from '../validation';




class Chat extends DbObject {

  static instance = new Chat();
  
  private constructor() {
    super("Chat");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    Validation.setDefaultValue(req, 'num_mess', undefined)
    Validation.setDefaultValue(req, 'users', undefined)
    Validation.setDefaultValue(req, 'room', undefined)
    if(!req.object.get("public") && !req.object.get("room")) {
      Validation.required(req, 'users');
      Validation.isArray(req, 'users');
      req.object.get('users').forEach((user: string) => {
        Validation.string('user:'+user, user, { length: 10 });
      })
    }
    Validation.immutable(req, "public")
    Validation.immutable(req, "parent")
    Validation.stringField(req, 'name', {maxLength: 50})
 }
  
  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> { 
    //prevent loop
    if (req.master && req.context.noValidation) return;
    if (!req.user && !req.master) throw new Error("You must be logged in to save a chat"); //protected by CLP
    
    const users : string[] = req.object.get('users') ?? [];
    if (!req.object.isNew()) {
      if((req.object.get("public") || req.object.get("room")) && req.object.get("parent"))
      {
        if(req.object.dirty("num_mess"))
        {
          const par : Parse.Object = new Parse.Object("Post", {id: req.object.get("parent")})
          par.set("comments", req.object.get("num_mess"))
          par.save(null, {useMasterKey: true})
        }
      }
      else{
        //figure out difference and add/remove users from relation
        const oldUsers = new Set(req.original!.get('users') as string[]);
        const newUsers = new Set(users);
        const addedUsers = new Set([...newUsers].filter(x => !oldUsers.has(x)));
        const removedUsers = new Set([...oldUsers].filter(x => !newUsers.has(x)));
        var r: Parse.Role | undefined = await new Parse.Query(Parse.Role).equalTo('name', 'chat-' + req.object.id).first({ useMasterKey: true });
        console.log("ROLE: " + JSON.stringify(r));
        if (!r) throw new Error("Could not find role, this chat is not set up right");
        else {
          removeUsersFromRole(r, Array.from(removedUsers));
          addUsersToRole(r, Array.from(addedUsers));
          await r.save(null, { useMasterKey: true });
        }
      }
    } else {
        if(req.object.get("room")){
          if(!req.master) throw new Error("Only master can create a chat in a room"); //temp
          //check if room exist
          const room = await new Parse.Query("Room").equalTo("objectId", req.object.get("room")).first({useMasterKey: true});
          if(!room) throw new Error("Room does not exist");
          const acl = new Parse.ACL(room.getACL()?.toJSON());
          if(!acl) throw new Error("Room does not have ACL");
          // acl.setRoleReadAccess("admin", false);
          // acl.setRoleWriteAccess("admin", false);

          req.object.setACL(acl);


        }
    }
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> { 
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //SHOULD NOT BE UPDATED REALLY SO ITS OKAY TO DO THIS EVERY TIME
    //if object existed before this call
    if (!req.original) {
      if(req.object.get("room")) return;
      if(!req.object.get("public"))
      {
        await createRole(req, req.object.get('users'));
        const acl = new Parse.ACL();
        acl.setRoleReadAccess('chat-' + req.object.id, true);
        acl.setRoleWriteAccess('chat-' + req.object.id, true); //everyone can add/kick anyone
        // acl.setRoleWriteAccess('admin', true);
        // acl.setRoleReadAccess('admin', true);
        // acl.setPublicReadAccess(true); //CLP protects against only authenticated users so this is fine
        req.object.setACL(acl);
        await req.object.save(null, { useMasterKey: true, context: { noValidation: true } });
      }
      else {
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        req.object.setACL(acl);
        await req.object.save(null, { useMasterKey: true, context: { noValidation: true } });
      }
    }
  }

  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    var r: Parse.Role | undefined = await new Parse.Query(Parse.Role).equalTo('name', 'chat-' + req.object.id).first({ useMasterKey: true });
    if (r) await r.destroy({ useMasterKey: true });
    var messages = await new Parse.Query("Message").equalTo('chat', req.object.id).findAll({ useMasterKey: true });
    if(messages) await Parse.Object.destroyAll(messages, { useMasterKey: true });
  }
}


async function createRole(req: Parse.Cloud.BeforeSaveRequest, users : string[]) {
  const r = new Parse.Role("", new Parse.ACL());
  //for each users in req object add to users in role
  addUsersToRole(r, users);
  await r.save({name: 'chat-' + req.object.id}, {useMasterKey: true});
}

function addUsersToRole(role : Parse.Role, users : string[]) {
  for (let i = 0; i < users.length; i++) {
    const user = new Parse.User({id : users[i]});
    role.getUsers().add(user);
  }
}

function removeUsersFromRole(role : Parse.Role, users : string[]) {
  for (let i = 0; i < users.length; i++) {
    const user = new Parse.User({id : users[i]});
    role.getUsers().remove(user);
  }
}
  


export default Chat.instance;