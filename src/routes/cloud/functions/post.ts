import { hasRoleBool, isAdminBool } from "../util";
// import DB from '../DB'
import "parse/node";

//params: uid
Parse.Cloud.define("archivePost", async (req) => {
  if (!req.user) throw new Error("User not authenticated.");
  if (!req.params.uid) throw new Error("uid not provided.");

  const obj = await new Parse.Query("Post")
    .equalTo("objectId", req.params.uid)
    .first();
  if (!obj) throw new Error("Object not found.");
  if (req.user !== obj.get("author")) {
    if (!(await isAdminBool(req.user))) {
      const room = obj.get("room");
      if (room && !(await hasRoleBool("roomMod-" + room, req.user))) {
        throw new Error("Action is not allowed.");
      }
    }
  }

  if (obj.get("type") == 1) {
    obj.set("archived", true);
    await obj.save(null, { useMasterKey: true });
  } else throw new Error("Object could not be archived.");
});
