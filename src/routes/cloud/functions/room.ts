import { hasRoleBool } from '../util';
export async function isRoomModOrAdmin(room_id: string, user: Parse.User | undefined): Promise<boolean> {
   return await hasRoleBool("roomMod-"+room_id, user) || await hasRoleBool("admin", user)
}
export async function isRoomUser(room_id: string, user: Parse.User | undefined): Promise<boolean> {
   return await hasRoleBool("roomUser-"+room_id, user)
}