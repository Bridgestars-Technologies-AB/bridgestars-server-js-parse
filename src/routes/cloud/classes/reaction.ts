import 'parse/node'
import * as Validation from '../validation';
import DbObject, * as Requests from './dbobject'

class Reaction extends DbObject {

  static instance = new Reaction();


  private constructor() {
    super("Reaction");
  }

  private getParentType(req: any): string {
    const type = req.object.get("type");
    switch (type) {
      case 0:
        return "Unknown";
      case 1:
        return "Post";
      case 2:
        return "Message";
    }
    throw new Error("This object can not be reacted upon.");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    Validation.stringField(req, 'user', { length: 10 })
    Validation.immutable(req, 'user')

    Validation.required(req, 'target')
    Validation.immutable(req, 'target')
    Validation.stringField(req, 'target', { length: 10 })

    Validation.required(req, 'type')
    Validation.immutable(req, 'type')
    Validation.setDefaultValue(req, 'type', undefined)

    Validation.required(req, 'data')
    Validation.setDefaultValue(req, 'data', 0)
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (!req.user && !req.master) throw new Error("You must be logged in to react.")
    if (req.object.isNew()) {
      if (!req.user) throw new Error("You must be logged in to react.")
      //check and delete other reaction by the same user.

      req.object.set("user", req.user.id); // Set the author to the current user
      let acl = new Parse.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(false);
      acl.setRoleWriteAccess("admin", true);
      acl.setWriteAccess(req.user, true);
      req.object.setACL(acl);
      if (req.object.get("type")) {
        var oldReactions = await new Parse.Query("Reaction").equalTo("user", req.user.id).equalTo("type", req.object.get("type")).equalTo("target", req.object.get("target")).find({ sessionToken: req.user.getSessionToken() })
        if (oldReactions) Parse.Object.destroyAll(oldReactions, { sessionToken: req.user.getSessionToken() })
        let mess: Parse.Object = new Parse.Object(this.getParentType(req), { id: req.object.get("target") })
        mess.increment("reactions." + req.object.get("data"))
        await mess.save(null, { useMasterKey: true }) // throws if the parent object does not exist.
      }
      else throw new Error("Reaction target not set");
    }
    else if (req.object.dirty("data")) {
      let mess: Parse.Object = new Parse.Object(this.getParentType(req), { id: req.object.get("target") })
      mess.increment("reactions." + req.object.get("data"))
      if (req.object && req.original?.get("data")) {
        mess.increment("reactions." + req.original?.get("data"), -1)
      }
      await mess.save(null, { useMasterKey: true }) // throws if the parent object does not exist.
    }
  }

  override async afterDelete(req: Requests.AfterDeleteRequest): Promise<void> {
    if (req.object.get("type") && req.object.get("target") && req.object.get("data")) {
      let mess: Parse.Object[] | undefined = await new Parse.Query(this.getParentType(req))
        .equalTo("objectId", req.object.get("target"))
        .find({ useMasterKey: true })
      if (mess && mess.length > 0) {
        mess[0].increment("reactions." + req.object.get("data"), -1)
        await mess[0].save(null, { useMasterKey: true }) // throws if the parent object does not exist.
      }
    }
  }
}


export default Reaction.instance;