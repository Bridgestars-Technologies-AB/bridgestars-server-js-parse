


// Cloud Code entry point

const axios = require('axios');
const { Query, Relation } = require('parse');
// const Parse = require("parse")
require('parse/node');


function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function validateUsername(username) {
  var re = /^[A-Za-z0-9åäöÅÄÖøØæÆ][A-Za-z0-9_\-\.\#åäöÅÄÖøØæÆ]{2,15}$/
  return re.test(username);
}

class Request{
  constructor(request) {
    this.req=request
  }
  set = (str, val) => this.req.object.set(str, val)
  get = (name) => this.req.object.get(name)
  get0 = (name) => this.req.original.get(name)
  isUpdated = (name) => this.get(name) != this.get0(name)
  isNew = () => this.req.object.isNew()
  obj = () => this.req.object
}

Parse.Cloud.beforeSave(Parse.User, function (req) {
  const data = new Request(req)
  
  if (data.isNew()) {

    console.log("SIGNUP")

    //ACL
    const acl = new Parse.ACL();
    acl.setRoleReadAccess("admin", true);
    acl.setRoleWriteAccess("admin", true);
    acl.setPublicReadAccess(true)
    acl.setPublicWriteAccess(false)
    req.object.setACL(acl)
    
    //VALIDATE EMAIL
    const email = data.get("email").toLowerCase().trim()
    if (!email)
      throw new Error("Missing email.");
    else if(!validateEmail(email))
        throw new Error("Email does not meet the Email Policy requirements");
    data.set("email", email)
    
    //VALIDATE USERNAME
    const un = data.get("username").trim()
    if(!validateUsername(un))
      throw new Error("Username does not meet the Username Policy requirements");
    data.set("dispName", un)
    data.set("username", un.toLowerCase())

    
    return "OK"
  }
  else {

    //VALIDATE USERNAME
    if (data.isUpdated("dispName")) {
      throw new Error("Display_username can't be updated")
    }
    if (data.isUpdated("username")) {
      const un = data.get("username").trim()
      if(!validateUsername(un))
        throw new Error("Username does not meet the Username Policy requirements");
      data.set("dispName", un)
      data.set("username", un.toLowerCase())
    }
    if (data.isUpdated("profileAccess")) {
      var val = data.get("profileAccess")
      if (val > 2 || val < 0)
        data.set("profileAccess", 0)
    }
    if (data.isUpdated("email")) throw new Error( "Email can't be updated yet.")
    if(!req.master && data.isUpdated("password")) throw new Error( "Password can't be updated yet.")
    
  }
});



// Parse.Cloud.beforeSave(Parse.Session, function (req) {
//   // if (req.object.existed()) return;
//   //get session corersponding to user
//   req.object.set("expiresAt", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
// });

Parse.Cloud.beforeDelete(Parse.User, (req) => { 
  console.log("\n\n\n")
  console.log(JSON.stringify(req))
  return removeAllAssociatedSessions(req.user)
})

Parse.Cloud.define("signOutFromAllDevices", (req) => { 
  return removeAllAssociatedSessions(req.user)
})


Parse.Cloud.afterLogin((req) => {
  //REMOVE SESSION
  new Parse.Query("_Session")
    .equalTo("user", req.user)
    .find({ useMasterKey: true })
})


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
            if (friendsObj.get("friends").includes(req.user.id)) {
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


Parse.Cloud.beforeLogin(Parse.User, function (request) {
  const data = new Request(request)
  console.log("LOGIN")
  // RemoveExcessSessions(request)
  // removeAllAssociatedSessions(request.object)

})

function removeAllAssociatedSessions(user) {
  const query = new Parse.Query("_Session");
  query.equalTo("user", user);
  return query.find({ useMasterKey: true })
    .then((obj) => {
      obj.forEach(s => s.destroy({useMasterKey:true}).catch(e => console.log(e)))
    });
}


//TODO FIX UPLOADING OF IMG
//params: username, page, per_page
Parse.Cloud.define("searchUsers", (req) => {
  if (req.user) {
    if(req.params.per_page > 20) req.params.per_page = 20
    return axios.get('http://localhost:8108/collections/username_index/documents/search',
      { headers: { "X-TYPESENSE-API-KEY": "xyz" }, params: {q:req.params.username, query_by:"username", page:req.params.page ?? 1, per_page:req.params.per_page ?? 10} })
      .then(res => {
        let arr = []
        //TODO ADD DISPUSERNAME, XP, UID, IMG
        res.data.hits.forEach(e => arr.push({ id: e.document.id, disp: e.document.username, img: e.document.img }))
        return JSON.stringify(arr)
    })
    // .catch(err => {
    //   throw new Error( err
    // });

  }
  else throw new Error( "user not signed in")
})




//#region Friends



//params: receiver
Parse.Cloud.define("sendFriendRequest", (req) => {
  if (!req.user) throw new Error( "User not authenticated")
  if(req.user.id == req.params.receiver) throw new Error( "You can't send a friend request to yourself")
  return new Parse.User({id: req.params.receiver }).fetch({ useMasterKey: true })
    .then((receiver) => {
      //already friends?
      if (receiver.get("friends").includes(req.user.id)) {
        throw new Error( "Already friends with this user")
      }
      else return receiver
        .addUnique("ifr", req.user.id)
        .remove("ofr", req.user.id)
        .save(null, { useMasterKey: true })
    })
    .then((r) =>
      req.user
        .addUnique("ofr", req.params.receiver)
        .remove("ifr", req.params.receiver)
        .save(null, { useMasterKey: true }))
    .then((r) => "OK")
    .catch((err) => {throw new Error(err)})
})

//params: uid
Parse.Cloud.define("acceptFriendRequest", (req) => {
  if (!req.user) throw new Error( "User not authenticated")
  if (req.user.id == req.params.uid) { throw new Error( "You can't accept your own friend request" )}
  return new Parse.User({id: req.params.uid }).fetch({ useMasterKey: true })
    .then((sender) => {
      if (!sender.get("friends").includes(req.user.id)) {
        sender.addUnique("friends", req.user.id)
        sender.remove("ofr", req.user.id)
        return sender.save(null, { useMasterKey: true })
      }
      else throw new Error( "Already friends with this user")
    })
    .then((r) =>
      req.user
        .addUnique("friends", req.params.uid)
        .remove("ifr", req.params.uid)
      .save(null, {useMasterKey:true})
  )
    .then((r) => "OK")
    .catch((err) => {throw new Error( err )})
})

//params: uid
Parse.Cloud.define("denyFriendRequest", (req) => {
  if (!req.user) throw new Error( "User not authenticated")
  return new Parse.User({id: req.params.uid })
    .remove("ofr", req.user.id)
    .save(null, { useMasterKey: true })
    .then((r) => req.user.remove("ifr", req.params.uid).save(null, { useMasterKey: true }))
    .then((r) => "OK")
    .catch((err) => {throw new Error( err ) })
})

//params: uid
Parse.Cloud.define("removeFriend", (req) => {
  if (!req.user) throw new Error( "User not authenticated")
  return new Parse.User({id: req.params.uid })
    .remove("friends", req.user.id)
    .remove("ifr", req.user.id)
    .remove("ofr", req.user.id)
    .save(null, { useMasterKey: true })
    .then((r) =>
      req.user.
        remove("friends", req.params.uid)
        .remove("ifr", req.params.uid)
        .remove("ofr", req.params.uid)
        .save(null, { useMasterKey: true }))
    .then((r) => "OK")
    .catch((err) => {throw new Error( err )})
})


//#endregion



function isAdminAsync(user) {
  if(!user) return Promise.reject(new Error("User not authenticated"))
  var adminRoleQuery = new Parse.Query(Parse.Role);
  adminRoleQuery.equalTo('name', 'admin');
  adminRoleQuery.equalTo('users', user);

  return adminRoleQuery.first({ useMasterKey: true })
    .then(function (admin) {
      console.log(JSON.stringify(admin))
      if (!admin) {
        throw new Error('User not admin');
      }
    })
    // .catch((err) => { throw new Error( "query could not run" });
}


//#region Match & Table


//define funtion



//define function
//params: skip, limit
Parse.Cloud.define("getMatchHistory", (req) => { 
  // const q1 = new Parse.Query("Table").equalTo("north", req.user)
  // const q2 = new Parse.Query("Table").equalTo("east", req.user)
  // const q3 = new Parse.Query("Table").equalTo("west", req.user)
  // const q4 = new Parse.Query("Table").equalTo("south", req.user)
  // Parse.Query.or(q1, q2, q3, q4).
})

Parse.Cloud.beforeSave("Match", (req) => { 
  console.log("\n\nMATCH BEFORE SAVE")
  if (req.master && req.context.noValidation) return "OK"; //PREVENT LOOP
  return isAdminAsync(req.user)
    .catch(e => { throw new Error( "Only admins can create matches" )})
    .then(() => {
      if (req.object.isNew()) {
        const acl = new Parse.ACL();
        acl.setRoleReadAccess("admin", true);
        acl.setRoleWriteAccess("admin", true);
        acl.setPublicReadAccess(true)
        acl.setPublicWriteAccess(false)
        req.object.setACL(acl)
      }
    })
    .catch(err => { throw err })
})


Parse.Cloud.afterSave("Match", (req) => { 
  console.log("\n\nMATCH AFTER SAVE")
  if (req.master && req.context.noValidation) return "OK"; //PREVENT LOOP
  //SHOULD NOT BE UPDATED REALLY SO ITS OKAY TO DO THIS EVERY TIME
  return req.object.relation("tables").query().find({ useMasterKey: true })
    .then((tables) => { 
      const players = []
      // tables.forEach(e => players.push(e.get("north"), e.get("east"), e.get("west"), e.get("south")))
      req.object.set("players", new Parse.Relation(req.object, "players"))
      req.object.relation("players").add(players.filter(e => e))
      return req.object.save(null, { useMasterKey: true, context: {noValidation:true} })
    })
    .catch(err => { throw new Error( err )})
})

Parse.Cloud.beforeSave("Table", (req) => { 
  return isAdminAsync(req.user)
    .then(() => {
      if (req.object.isNew()) {
        const acl = new Parse.ACL();
        acl.setRoleReadAccess("admin", true);
        acl.setRoleWriteAccess("admin", true);
        acl.setPublicReadAccess(true)
        acl.setPublicWriteAccess(false)
        req.object.setACL(acl)
      }
      return "OK"
    })
    // .catch(err => { throw new Error(err.message) })
})


//#endregion



  Parse.Cloud.define("signIn", (req) => { 
    const { username, password } = req.params
    return Parse.User.logIn(username, password).then((user) => {
      //query and delete this session token
      return new Parse.Query(Parse.Session)
      .equalTo("sessionToken", user.getSessionToken())
      .first({ useMasterKey: true })
        .then((session) => { session.destroy({ useMasterKey: true }) })
        .then(() => "OK")
        .catch((err) => { console.log("could not delete session " + err); })
    })
    .catch((error) => { 
        //firebase sign in by rest api, first SignInWithEmail cloud function call if username contains @, else regular rest api call to firebase
      console.log("This user is not available on parse, trying to sign in with firebase")
      return signInWithFirebase(username, password)
    })
  })

function signInWithFirebase(username, password) {
  return new Promise((resolve, reject) => {
    if (username.includes("@")) {
      axios.get('https://us-central1-bridge-fcee8.cloudfunctions.net/getUsernameFromEmail',
        {
          params: {
            email: username,
            apiKey: "AIzaSyDGlMTrGCUD4bvnlmHH_Ih6atMTKloQBHc"
          }
        })
        .then((res) => resolve(res.data))
        .catch((e) => {
          console.log("getUsernameFromEmail, error", e)
          reject(e)
        })
    }
    else resolve(username);
  }).then((username) => {
    console.log("\n\n"+username+"\n")
    return axios.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDGlMTrGCUD4bvnlmHH_Ih6atMTKloQBHc',
    {
        'email': username.toLowerCase()+".account@bridgestars.net",
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
          console.log("failed signing in to firebase,  error", e)
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
          user.set("migratedFromFirebase",true)
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