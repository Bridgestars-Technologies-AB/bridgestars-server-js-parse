import constants from "../../constants";

// Parse.initialize(constants.appId, null, constants.masterKey);

// import match from './classes/match';
// import message from './classes/message';
// import chat from './classes/chat';
// import table from './classes/table';
// import comment from './classes/comment';
// import post from './classes/post';

import "./functions/chat";
import "./functions/user";
import "./functions/general";
import "./functions/stripe";
import "./functions/room";
import "./functions/voucher";
import "./functions/test";
import "./functions/subscription";
import "./functions/post";

import "./classes/user";
import "./classes/table";
import "./classes/match";
import "./classes/message";
import "./classes/chat";
import "./classes/comment";
import "./classes/post";
import "./classes/reaction";
import "./classes/room";
import "./classes/course";
import "./classes/role";
import "./classes/voucher";
import "./classes/payment";
import "./classes/subscription";
import "./classes/invoice";
import "./classes/customer";

import "./file";

import { removeAllAssociatedSessions } from "./util";

Parse.Cloud.beforeLogin(async (req) => {
  var username = req.object.getUsername();
  if (username == "admin" || username?.startsWith("bs_tester")) {
    await removeAllAssociatedSessions(req.object);
  }
});
