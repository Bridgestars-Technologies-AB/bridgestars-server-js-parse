import axios from 'axios';
import 'parse/node'
//import { ParseCloudClass } from 'parse-server-addon-cloud-class';
import { removeAllAssociatedSessions, isAdminAsync } from '../util'
import * as Validate from '../validation';
// require('parse-server-addon-cloud-class')
import DbObject, * as Requests from './dbobject'


class Match extends DbObject {

  static instance = new Match();

  private constructor() {
    super("Match");
  }

  validate(req: Requests.BeforeSaveRequest): void {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    if (!req.user) throw new Error("You must be logged in to create a match.");
    
    Validate.required(req, 'tables')
    // Validate.required(req, 'players')

    req.object.get('tables').forEach((table: string) => {
      Validate.string('table:'+table, table, { length: 10 });
    })
    if (req.object.has('players')) {
      req.object.get('players').forEach((player: string) => {
        Validate.string('player:'+player, player, { length: 10 });
      })
    }

    // Validate.immutable(req, 'tables')
    Validate.immutable(req, 'players')

    Validate.stringField(req, 'name', {minLength:0, maxLength: 40 });

    
  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    await isAdminAsync(req.user)
    .catch(e => { throw new Error( "Only admins can create matches." )})
    .then(() => {
      if (req.object.isNew()) {
        const acl = new Parse.ACL();
        acl.setRoleReadAccess("admin", true);
        acl.setRoleWriteAccess("admin", true);
        acl.setPublicReadAccess(true)
        acl.setPublicWriteAccess(false)
        req.object.setACL(acl)
      }
      return req.object;
    })
    .catch(err => { throw err })
  }

  override async afterSave(req: Requests.AfterSaveRequest): Promise<void> {
    if (req.master && req.context.noValidation) return; //PREVENT LOOP
    //SHOULD NOT BE UPDATED REALLY SO ITS OKAY TO DO THIS EVERY TIME
    await new Parse.Query("Table").containedIn("objectId", req.object.get('tables')).find({useMasterKey:true})
      .then((tables: Parse.Object[]) => { 
        // console.log("found tables", tables)
        tables.forEach((table: Parse.Object) => {
          if(table.get('north')) req.object.addUnique('players', table.get('north'))
          if(table.get('south')) req.object.addUnique('players', table.get('south'))
          if(table.get('east')) req.object.addUnique('players', table.get('east'))
          if(table.get('west')) req.object.addUnique('players', table.get('west'))
        })
        return req.object.save(null, { useMasterKey: true, context: {noValidation:true} })
      })
  }
}


export default Match.instance;
