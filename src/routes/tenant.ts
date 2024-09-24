// import express from "express";
// //var { faker } = require("@faker-js/faker");
// var router = express.Router();
// import Parse from "parse/node";

// Parse.initialize("appId", "javascriptKey");
// Parse.serverURL = "https://1udwhn.sse.codesandbox.io/rest";

// function generateHexString(length:number) {
//   // Use crypto.getRandomValues if available
//   if (
//     typeof crypto !== "undefined" &&
//     typeof crypto.getRandomValues === "function"
//   ) {
//     var tmp = new Uint8Array(Math.max(~~length / 2));
//     crypto.getRandomValues(tmp);
//     return Array.from(tmp)
//       .map((n) => ("0" + n.toString(16)).substr(-2))
//       .join("")
//       .substr(0, length);
//   }

//   // fallback to Math.getRandomValues
//   var ret = "";
//   while (ret.length < length) {
//     ret += Math.random().toString(16).substring(2);
//   }
//   return ret.substring(0, length);
// }

// router.get("/", async function (req, res, next) {
//   res.status(200).send("tenants");
// });

// router.post("/", async function (req, res, next) {
//   var subdomain = req.body.subdomain;
//   var owneremail = req.body.owneremail;

//   let keys = {
//     appId: generateHexString(16),
//     appName: subdomain,
//     clientKey: generateHexString(16),
//     dotNetKey: generateHexString(16),
//     encryptionKey: generateHexString(16),
//     fileKey: generateHexString(16),
//     javascriptKey: generateHexString(16),
//     masterKey: generateHexString(16),
//     readOnlyMasterKey: generateHexString(16),
//     restAPIKey: generateHexString(16),
//     webhookKey: generateHexString(16)
//   };

//   var newTenant = new Parse.Object("Tenant");
//   var result = await newTenant.save({ subdomain, owneremail, keys });

//   if (result.id) {
//     res.status(200).send(result);
//   } else {
//     res.status(500);
//   }
//   //next();
// });

// module.exports = router;
