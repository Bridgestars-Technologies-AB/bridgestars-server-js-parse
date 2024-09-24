import 'parse/node'


export function removeAllAssociatedSessions(user: Parse.User) {
  const query = new Parse.Query("_Session");
  query.equalTo("user", user);
  return query.find({ useMasterKey: true })
    .then((obj) => {
      obj.forEach(s => {
        console.log("deleting session: " + s.id + " for user: " + s.get("user").id)
        s.destroy({ useMasterKey: true }).catch(e => console.log(e))
      })
    });
}


export async function hasRoleBool(roleName: string, user: Parse.User | undefined): Promise<boolean> {
  if (!user) return false
  var roleQuery = new Parse.Query(Parse.Role);
  roleQuery.equalTo('name', roleName);
  roleQuery.equalTo('users', user);

  const role = await roleQuery.first({ useMasterKey: true });
  if (!role) return false;
  else return true;
}

export function hasRoleAsync(roleName: string, user: Parse.User | undefined): Promise<void> {
  if (!user) return Promise.reject(new Error("User not authenticated"))
  var q = new Parse.Query(Parse.Role);
  q.equalTo('name', roleName);
  q.equalTo('users', user);

  return q.first({ useMasterKey: true })
    .then(function (admin) {
      console.log(JSON.stringify(admin))
      if (!admin) {
        throw new Error('User is missing role: ' + roleName);
      }
    })
}

export async function addRoleAsync(roleName: string, user: Parse.User | undefined): Promise<void> {
  if (!user) throw new Error("Internal error: User does not exist")
  var q = new Parse.Query(Parse.Role);
  q.equalTo('name', roleName);

  const role = await q.first({ useMasterKey: true })
  if (!role) throw new Error("Internal error: Role not found")

  role.getUsers().add(user);
  await role.save(null, { useMasterKey: true });
}

export function isAdminAsync(user: Parse.User | undefined): Promise<void> {
  return hasRoleAsync("admin", user)
  // .catch((err) => { throw new Error( "query could not run" });
}

export function isAdminBool(user: Parse.User | undefined): Promise<boolean> {
  return hasRoleBool("admin", user)
  // .catch((err) => { throw new Error( "query could not run" });
}




