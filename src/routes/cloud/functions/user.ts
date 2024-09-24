import axios from 'axios'
// const DB = require('parse/node');
import { removeAllAssociatedSessions, isAdminAsync } from '../util';

// import DB from '../DB'
import 'parse/node'
import user from '../classes/user';

//params: uid
Parse.Cloud.define("getUserInfo", (req) => {
  if (!req.user) throw "user not signed in"
  return new Parse.Query("_User")
    .select("profileAccess", "first", "last", "birth", "nationality")
    .get(req.params.uid, { useMasterKey: true })
    .then((obj) => {
      const access = obj.get("profileAccess") //0-no one, 1- friends, 2-public
      if (access == 2) return obj;
      else if (access == 0) throw new Error("This user is not public")
      else if (access == 1) {
        return new Parse.Query("_User").select("friends").get(req.params.uid, { useMasterKey: true })
          .then((friendsObj) => {
            if (friendsObj.get("friends").includes(req.user?.id)) {
              return obj;
            }
            else throw new Error("You are not friends with this user")
          }, (err) => {
            throw new Error("This user is private")
          })

      }
      throw new Error("This user is private")
      // if(obj.get("publicCanView"))
      // else throw 
    }, (error) => {
      throw new Error(error);
    });
})

function searchUser(req: any, { room }: { room?: string }) {
  if (!req.user) throw new Error("user not signed in")
  if (req.params.per_page > 20) req.params.per_page = 20
  const username: string = req.params.username?.toString().toLowerCase()

  if (!username) throw new Error("No username provided")
  const prev_username: string = req.params.prev_username?.toString().toLowerCase() ?? ""

  const contains = new Parse.Query(Parse.User).contains("username", username);
  const startsWith = new Parse.Query(Parse.User).startsWith("username", username);
  let query = Parse.Query
    .or(contains, startsWith)
  if (room) query = query.equalTo("rooms", room)
  return query
    .ascending("username")
    .greaterThan("username", prev_username)
    .limit(req.params.per_page ?? 5)
    .find({ useMasterKey: true })
    .then((users) =>
      JSON.stringify(users.map((user) => {
        return {
          id: user.id,
          disp: user.get("dispName"),
          img: user.get("img"),
        }
      }))
    )
    .catch((err) => {
      console.error("error", err)
      throw new Error("Error searching users")
    })
}
//TODO FIX UPLOADING OF IMG
//params: username, per_page, prev_username, room?
Parse.Cloud.define("searchUsers", (req) => {
  return searchUser(req, { room: req.params.room })
})

// return axios.get('http://localhost:8108/collections/username_index/documents/search',
//   { headers: { "X-TYPESENSE-API-KEY": "xyz" }, params: {q:req.params.username, query_by:"username", page:req.params.page ?? 1, per_page:req.params.per_page ?? 10} })
//   .then(res => {
//     let arr : any = []
//     //TODO ADD DISPUSERNAME, XP, UID, IMG
//     res.data.hits.forEach(e => arr.push({ id: e.document.id, disp: e.document.username, img: e.document.img }))
//     return JSON.stringify(arr)
// })
// .catch(err => {
//   throw new Error( err
// });

//params: receiver : string
Parse.Cloud.define("sendFriendRequest", (req): Promise<string> => {
  if (!req.user) throw new Error("User not authenticated")
  if (req.user.id == req.params.receiver) throw new Error("You can't send a friend request to yourself")
  return new Parse.User({ id: req.params.receiver }).fetch({ useMasterKey: true })
    .then((receiver: Parse.User) => {
      //already friends?
      if (receiver.get("friends").includes(req.user?.id)) {
        throw new Error("Already friends with this user")
      }
      else {
        receiver.addUnique("ifr", req.user!.id)
        receiver.remove("ofr", req.user!.id)
        return receiver.save(null, { useMasterKey: true })
      }
    })
    .then((r) => {

      req.user!.addUnique("ofr", req.params.receiver)
      req.user!.remove("ifr", req.params.receiver)
      return req.user!.save(null, { useMasterKey: true })
    })
    .then((r) => "OK")
    .catch((err) => { throw new Error(err) })
})

//params: uid
Parse.Cloud.define("acceptFriendRequest", (req) => {
  if (!req.user) throw new Error("User not authenticated")
  if (req.user.id == req.params.uid) { throw new Error("You can't accept your own friend request") }
  return new Parse.User({ id: req.params.uid }).fetch({ useMasterKey: true })
    .then((sender: Parse.User) => {
      if (!sender.get("friends").includes(req.user!.id)) {
        sender.addUnique("friends", req.user!.id)
        sender.remove("ofr", req.user!.id)
        return sender.save(null, { useMasterKey: true })
      }
      else throw new Error("Already friends with this user")
    })
    .then((r) => {
      req.user!.addUnique("friends", req.params.uid)
      req.user!.remove("ifr", req.params.uid)
      return req.user!.save(null, { useMasterKey: true })
    })
    .then((r) => "OK")
    .catch((err) => { throw new Error(err) })
})

//params: uid
Parse.Cloud.define("denyFriendRequest", (req): Promise<string> => {
  if (!req.user) throw new Error("User not authenticated")
  if (req.user.id == req.params.uid) throw new Error("User can't deny their own friendrequest")
  return ((new Parse.User({ id: req.params.uid }) as Parse.User)
    .remove("ofr", req.user.id) as Parse.User)
    .save(null, { useMasterKey: true })
    .then((r) => (req.user!.remove("ifr", req.params.uid) as Parse.User).save(null, { useMasterKey: true }))
    .then((r) => "OK")
    .catch((err) => { throw new Error(err) })
})

//params: uid
Parse.Cloud.define("removeFriend", async (req) => {
  if (!req.user) throw new Error("User not authenticated")
  if (req.user.id == req.params.uid) throw new Error("User can't remove themselves as friends")
  var user = new Parse.User({ id: req.params.uid }) as Parse.User
  user.remove("friends", req.user.id)
  user.remove("ifr", req.user.id)
  user.remove("ofr", req.user.id)
  await user.save(null, { useMasterKey: true })
    .catch((err) => { }) //maybe user doesnt exist, this is ok.

  req.user!.remove("friends", req.params.uid)
  req.user!.remove("ifr", req.params.uid)
  req.user!.remove("ofr", req.params.uid)
  await req.user!.save(null, { useMasterKey: true })
})

Parse.Cloud.define("signOutFromAllDevices", (req) => {
  if (!req.user) throw new Error("User not authenticated")
  return removeAllAssociatedSessions(req.user)
})


function trycatch<T>(func: () => T, fail?: (e: Error) => any): T | Error {
  try {
    return func();
  } catch (error: any) {
    if (fail) {
      fail(error)
      // let e = new Error(fail(error));
      // e.stack = error.stack;
      // fail(e)
    }
    return error;
  }
}


//paramgs: username, password
Parse.Cloud.define("signIn", async (req) => {
  console.log("signIn called")
  if (req.user) {
    try {
      console.log("User already signed in, logging out...")
      await Parse.User.logOut();
    } catch (e) {
      console.log("Could not log out user")
      console.log(e)
    }
  }
  const { username, password } = req.params
  console.log("trying to sign in user " + username + "...")
  return Parse.User.logIn(username, password).then((user: Parse.User) => {
    console.log("Signed in user " + user.id + ", deleting session...")
    return new Parse.Query(Parse.Session)
      .equalTo("sessionToken", user.getSessionToken())
      .first({ useMasterKey: true })
      .then((session: Parse.Session | undefined) => {
        console.log("created session for user " + user.id + ", deleting...")
        if (session) session.destroy({ useMasterKey: true })
      })
      .then(() => "OK")
      .catch((err) => { console.log("could not delete session " + err); })
  })
    .catch((error) => {
      //firebase sign in by rest api, first SignInWithEmail cloud function call if username contains @, else regular rest api call to firebase
      console.log("This user is not available on parse, trying to sign in with firebase")
      return signInWithFirebase(username, password)
    })
})

function signInWithFirebase(username: string, password: string) {
  return new Promise((resolve: (value: string) => void, reject) => {
    if (username.includes("@")) {
      axios.get('https://us-central1-bridge-fcee8.cloudfunctions.net/getUsernameFromEmail',
        {
          params: {
            email: username,
            apiKey: "AIzaSyDGlMTrGCUD4bvnlmHH_Ih6atMTKloQBHc"
          }
        })
        .then((res) => resolve(res.data as string))
        .catch((e) => {
          console.log("getUsernameFromEmail, error", e)
          reject(e)
        })
    }
    else resolve(username);
  }).then((username) => {
    console.log("\n\n" + username + "\n")
    return axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDGlMTrGCUD4bvnlmHH_Ih6atMTKloQBHc',
      {
        'email': username.toLowerCase() + ".account@bridgestars.net",
        'password': password,
        'returnSecureToken': true
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      })
  })
    .catch((e) => {
      console.error("failed signing in to firebase,  error", e)
      throw new Error("Invalid username/password")
    })
    .then((res) => {
      //user now signed in with firebase, find the parse user with this username and log them in
      const usernameQuery = new Parse.Query(Parse.User);
      usernameQuery.equalTo("username", username.toLowerCase());
      const emailQuery = new Parse.Query(Parse.User);
      emailQuery.equalTo("email", username);

      return Parse.Query.or(usernameQuery, emailQuery).first({ useMasterKey: true }).then((user) => {
        if (user) {
          user.setPassword(password);
          user.set("migratedFromFirebase", true)
          return user.save(null, { useMasterKey: true }).then(() => {
            return "OK" //we can just as well throw this exception client side, should not throw though
            // return Parse.User.logIn(username, password).then((user) => {
            //   return user
            // })
          })
        }
        else throw new Error("User not found")
      })
    })
    .catch((e) => {
      // console.log("failed saving password or signing in to parse, error", e)
      throw e
    })
}