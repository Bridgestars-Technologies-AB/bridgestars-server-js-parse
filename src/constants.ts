const port = process.env.SERVER_PORT || 1337;

export default {
  databaseURI:
    "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/parse?replicaSet=rs0&readPreference=secondary",
  appId: "k4PTFS2R8tSYoZC8UNXzvplbZ38jOmViOkJxJEyE",
  appName: "Bridgestars",
  masterKey: "",
  stripeKey: "",
  serverURL: `http://localhost:${port}/rest`,
  // publicServerURL: "http://localhost:1337/rest",
  // switch between testing env and production env
  publicServerURL: `https://aws.lb.bridgestars.net/rest`,
  serverPort: port,
};
