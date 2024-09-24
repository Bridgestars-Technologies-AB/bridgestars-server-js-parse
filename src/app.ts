import express from "express";
import bodyParser from "body-parser";
// var express = require('express');
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import logger from "morgan";
import fs from "fs";

// import indexRouter from "./routes/index";
import restRouter from "./routes/rest";
import dashRouter from "./routes/dash";
// import "./services/typesense";
import { AddressInfo } from "net";
import StripeWebhook from "./routes/cloud/functions/stripe/webhook";
import constants from "./constants";

const app = express();

// log only 4xx and 5xx responses to console
app.use(
  logger("dev", {
    skip: function(req: any, res: any) {
      return res.statusCode < 400;
    },
  })
);

// log all requests to access.log
app.use(
  logger("common", {
    stream: fs.createWriteStream(path.join(__dirname, "access.log"), {
      flags: "a",
    }),
  })
);

app.use(cors());
app.use(
  "/stripe-webhook",
  bodyParser.json({
    verify: (req, res, buf) => {
      req["rawBody"] = buf;
    },
  })
);
// app.use('/stripe-webhook', bodyParser.raw({type: "application/json"}))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

//restRouter.parseGraphQLServer.applyGraphQL(app);
//restRouter.parseGraphQLServer.applyPlayground(app);

// app.use("/", indexRouter);
// app.use("/restsecond", restSecondRouter.api.app);
// app.use("/tenant", tenantRouter);
// app.use("/instance/:tid/rest", instanceRouter);

app.use("/rest", restRouter.api);
app.use("/dash", dashRouter);

app.post("/stripe-webhook", async (req, res) => {
  await StripeWebhook(req)
    .then(() => res.sendStatus(200))
    .catch((e: Error) => {
      console.log(e);
      res.status(400).json(e.message);
    });
});

console.log(constants.serverPort);
const port = constants.serverPort;
var listener = app.listen(port, async function() {
  let info = listener.address() as AddressInfo;
  console.log("Listening on port " + info.port);
});
