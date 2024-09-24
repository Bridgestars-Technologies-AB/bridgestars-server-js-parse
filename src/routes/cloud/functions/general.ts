import { removeAllAssociatedSessions, isAdminAsync } from '../util';

// import DB from '../DB'
import 'parse/node'


//return ok if local updatedAt is equal to server updatedAt, otherwise return object data
//params: className, uid, updatedAt
Parse.Cloud.define("fetchIfUpdated", async (req) => {
  if (!req.user) throw new Error("User not authenticated.")

  if(!req.params.className) throw new Error("className not provided.")
  if(!req.params.uid) throw new Error("uid not provided.")
  if(!req.params.updatedAt) {
    //return object dat
  }

  let query = new Parse.Query(req.params.className)

  query.equalTo("objectId", req.params.uid)
  let result = await query.first({sessionToken: req.user.getSessionToken()})
  if(!result) throw new Error("Object not found.")
  
  console.log("TIME COMPARISON: " + result.get("updatedAt").getTime() + " " + req.params.updatedAt)
  if(req.params.updatedAt) console.log("TIME COMPARISON: " + result.get("updatedAt").getTime() + " " + (req.params.updatedAt as Date).getTime())

  if(!req.params.updatedAt){
    return result;
  }
  else if(result.updatedAt.getTime() == (req.params.updatedAt as Date).getTime()) {
    return null;
  }
  else return result;
})

// Add uid to role with name role, but only if user is admin or master
//params: uid, role
Parse.Cloud.define("assignRole", async (req) => {
  if (!req.user) throw new Error("User not authenticated.")
  
  await isAdminAsync(req.user)
  if(!req.params.uid) throw new Error("uid not provided.")
  if(!req.params.role) throw new Error("role not provided.")

  let user = new Parse.User({id: req.params.uid})

  // Query for role
  let role = await new Parse.Query(Parse.Role)
    .equalTo("name", req.params.role).first({useMasterKey: true})
  if(!role) throw new Error("Role not found.")
 

  role.getUsers().add(user)
  await role.save(null, {useMasterKey: true})
  return 

})

// strip role from user  
//params: uid, role
Parse.Cloud.define("stripRole", async (req) => {
  if (!req.user) throw new Error("User not authenticated.")
  
  await isAdminAsync(req.user)
  if(!req.params.uid) throw new Error("uid not provided.")
  if(!req.params.role) throw new Error("role not provided.")

  let user = new Parse.User({id: req.params.uid})

  // Query for role
  let role = await new Parse.Query(Parse.Role)
    .equalTo("name", req.params.role).first({useMasterKey: true})
  if(!role) throw new Error("Role not found.")
 
  role.getUsers().remove(user)
  await role.save(null, {useMasterKey: true})
  return 

})

// Add user to roomMod role for room 
//params: uid, room
Parse.Cloud.define("assignRoomMod", async (req) => {
  if (!req.user) throw new Error("User not authenticated.")
  await isAdminAsync(req.user)

  if(!req.params.uid) throw new Error("uid not provided.")
  if(!req.params.room) throw new Error("room not provided.")

  let user = new Parse.User({id: req.params.uid}) as Parse.User

  // Query for role
  let role = await new Parse.Query(Parse.Role)
    .equalTo("name", "roomMod-"+req.params.room).first({useMasterKey: true})
  if(!role) throw new Error("Role not found.")
 

  role.getUsers().add(user)
  await role.save(null, {useMasterKey: true})

  user.add("rooms", req.params.room)
  await user.save(null, {useMasterKey: true})
  return 

})