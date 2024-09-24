import axios from 'axios';
import 'parse/node'

//import { ParseCloudClass } from 'parse-server-addon-cloud-class';
import { removeAllAssociatedSessions, isAdminAsync } from '../util'
import { immutable, required, stringField, string } from '../validation';
// require('parse-server-addon-cloud-class')

import DbObject, * as Requests from './dbobject'


export class Table extends DbObject{
  static instance = new Table();
  
  private constructor() {
    super("Table");
  }
  
  validate(req: Requests.BeforeSaveRequest): void {
    // required(req, 'data')
    // immutable(req, 'data')
    // stringField(req, 'data', { minLength: 0, maxLength: 2500 })
    const data : string[] = req.object.get('data');

    for (let i = 0; i < data.length; i++) {
      string('data['+i+']:', data[i], { maxLength: 150 });
    }

    if(data.length > 100){
      throw new Error("No more than 100 deals allowed.");
    }

    
    const players = ["north", "west", "south", "east"]
    
    let any_player = false;
    players.forEach(player => {
      if (req.object.dirty(player)) { 
        if(req.object.get(player)) any_player = true;
      }
        // immutable(req, player)
        stringField(req, player, { length: 10 })
    });
    // if(!any_player)
    //   throw new Error("At least one player must be set.")

  }

  override async beforeSave(req: Requests.BeforeSaveRequest): Promise<void> {
    // if(!req.user) throw new Error("You must be logged in to save a table"); //protected by CLP
    if (req.object.isNew()) {
      await isAdminAsync(req.user)
      .then(() => {
        const acl = new Parse.ACL();
        acl.setRoleReadAccess("admin", true);
        acl.setRoleWriteAccess("admin", true);
        acl.setPublicReadAccess(true)
        acl.setPublicWriteAccess(false)
        req.object.setACL(acl)
      })
    }
  }
}
export default Table.instance;