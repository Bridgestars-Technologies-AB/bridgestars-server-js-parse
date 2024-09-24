const ParseDashboard = require("parse-dashboard");
import constants from "../constants"

const options = { allowInsecureHTTP: true };

const dashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: constants.publicServerURL,
        appId: constants.appId,
        masterKey: constants.masterKey,
        appName: constants.appName,
        supportedPushLocales: ["en"]
      }
    ],
    users: [
      {
        user: "master",
        pass: "NE%7LZ%11P!Al6^w2R#9bFD6i$71!MX%"
      }
    ]
  },
  options
);

export default dashboard;
