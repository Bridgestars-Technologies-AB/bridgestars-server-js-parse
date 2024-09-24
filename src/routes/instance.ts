// var express = require("express");
// var router = express.Router();
// var logger = require("morgan");
// var Parse = require("parse/node");

// Parse.initialize("appId", "javascriptKey");
// Parse.serverURL = "https://1udwhn.sse.codesandbox.io/rest";

// const { default: ParseServer } = require("parse-server");
// const FSFilesAdapter = require("@parse/fs-files-adapter");

// const fsAdapter = new FSFilesAdapter({
//   encryptionKey: "encryptionKey"
// });

// const defaultServerOptions = {
//   cloud: "./routes/cloud.js",
//   liveQuery: {
//     classNames: ["Notification"]
//   },
//   logger: logger,
//   filesAdapter: fsAdapter,
//   verifyUserEmails: true,
//   emailVerifyTokenValidityDuration: 2 * 60 * 60,
//   preventLoginWithUnverifiedEmail: true,
//   directAccess: true,
//   enforcePrivateUsers: true,
//   accountLockout: {
//     duration: 5,
//     threshold: 3,
//     unlockOnPasswordReset: true
//   },
//   emailAdapter: {
//     module: "parse-smtp-template",
//     options: {
//       isSSL: false,
//       port: 2525,
//       host: "smtp.mailtrap.io",
//       user: "406720e397c1cd",
//       password: "a49578b1f21f2f",
//       fromAddress: "no-replay@localhost.lan",
//       template: true,
//       templatePath: "mailTemplate.html",
//       passwordOptions: {
//         subject: "Password recovery",
//         body: "Custom password recovery email body",
//         btn: "Recover your password"
//       },
//       confirmOptions: {
//         subject: "E-mail confirmation",
//         body: "Custom email confirmation body",
//         btn: "confirm your email"
//       }
//     }
//   },
//   passwordPolicy: {
//     validatorPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/,
//     doNotAllowUsername: true,
//     resetTokenValidityDuration: 90 * 24 * 60 * 60
//   }
// };

// async function instance(req, res, next) {
//   let tid = req.params.tid;

//   let query = new Parse.Query("Tenant");
//   query.equalTo("subdomain", tid);
//   //query.equalTo("keys.appName", tid);
//   query.limit(1);
//   const result = await query.find();
//   console.log(result);
//   if (result.length === 1) {
//     let tenantServerConfig = {
//       databaseURI:
//         "mongodb+srv://test:test@cluster0.rick5.mongodb.net/tenant_" + tid,
//       appId: tid,
//       appName: tid,
//       masterKey: tid,
//       javascriptKey: tid,
//       restAPIKey: tid,
//       serverURL: "https://1udwhn.sse.codesandbox.io/tenant/" + tid + "/rest",
//       publicServerURL:
//         "https://1udwhn.sse.codesandbox.io/tenant/" + tid + "/rest",
//       graphQLServerURL:
//         "https://1udwhn.sse.codesandbox.io/tenant/" + tid + "/graphql"
//     };
//     let api = new ParseServer({
//       ...defaultServerOptions,
//       ...tenantServerConfig
//     });

//     return await api.app(req, res, next);
//   } else {
//     next(new Error("tenant not found"));
//   }
// }
// module.exports = instance;
