import logger from "morgan";
// import ParseServer, { ParseGraphQLServer } from "parse-server";
// import ParseServer from 'parse-server';
const ParseServer = require("parse-server").ParseServer;
const FSFilesAdapter = require("@parse/fs-files-adapter").default;

import constants from "../constants";
import emailAdapter from "../mail-adapter";
import fsAdapter from "../fs-adapter";

const user_fields = [
  "email",
  "authData",
  "first",
  "last",
  "nationality",
  "birth",
  "profileAccess",
  "friends",
  "ifr",
  "ofr",
  "migratedFromFirebase",
  "gameSignIn",
  "username",
  "dispName",
  "bal",
  "elo",
  "xp",
  "createdAt",
  "updatedAt",
  "img",
  "acl",
  "subscriptions",
  "rooms",
  "courses",
];

const protected_fields = [
  "email",
  "authData",
  "first",
  "last",
  "nationality",
  "birth",
  "profileAccess",
  "friends",
  "ifr",
  "ofr",
  "migratedFromFirebase",
  "gameSignIn",
];

const public_fields = ["img", "dispName"];

console.log("user fields:");
console.log(JSON.stringify(user_fields));

console.log("public fields:");
console.log(JSON.stringify(public_fields));

console.log("protected fields:");
console.log(JSON.stringify(protected_fields));

var api = new ParseServer({
  databaseURI: constants.databaseURI,
  cloud: "./build/routes/cloud/main.js",
  appId: constants.appId,
  appName: constants.appName,
  masterKey: constants.masterKey,
  serverURL: constants.serverURL,
  publicServerURL: constants.publicServerURL,
  // liveQuery: {
  //   classNames: ["Notification"]
  // },
  logger: logger,
  protectedFields: {
    _User: {
      "*": user_fields.filter((f) => !public_fields.includes(f)),
      authenticated: protected_fields,
      "role:moderator": [],
      "role:admin": [],
    },
    Chat: {
      "*": ["parent", "public", "num_mess"],
      "role:moderator": [],
      "role:admin": [],
    },
    Post: {
      "*": [],
    },
    Room: {
      // "roomUser-*": ["isMod"]
    },
  },
  allowCustomObjectId: false,
  filesAdapter: fsAdapter,
  fileUpload: {
    enableForPublic: false,
    enableForAnonymousUser: false,
    enableForAuthenticatedUser: true,
  },
  verifyUserEmails: false,
  sessionLength: 3600 * 24 * 30,
  emailVerifyTokenValidityDuration: 4 * 60 * 60, //4 timmar
  preventLoginWithUnverifiedEmail: false,
  directAccess: true,
  enforcePrivateUsers: false,
  // accountLockout: {
  //   threshold: 10, //threshold policy setting determines the number of failed sign-in attempts that will cause a user account to be locked. Set it to an integer value greater than 0 and less than 1000
  //   duration: 2, // duration policy setting determines the number of minutes that a locked-out account remains locked out before automatically becoming unlocked. Set it to a value greater than 0 and less than 100000.
  //   unlockOnPasswordReset: true
  // },
  emailAdapter: emailAdapter,
  passwordPolicy: {
    validatorPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/,
    //8 tecken, siffra, liten bokstav, stor bokstav
    doNotAllowUsername: true,
    resetTokenValidityDuration: 24 * 60 * 60, //24 timmar
  },
  // customPages: {
  //     passwordResetSuccess: "http://yourapp.com/passwordResetSuccess",
  //     verifyEmailSuccess: "http://yourapp.com/verifyEmailSuccess",
  //     parseFrameURL: "http://yourapp.com/parseFrameURL",
  //     linkSendSuccess: "http://yourapp.com/linkSendSuccess",
  //     linkSendFail: "http://yourapp.com/linkSendFail",
  //     invalidLink: "http://yourapp.com/invalidLink",
  //     invalidVerificationLink: "http://yourapp.com/invalidVerificationLink",
  //     choosePassword: "http://yourapp.com/choosePassword"
  // },
  middleware: function(params: any) {
    console.log(params);
  },
});

export default { api };
