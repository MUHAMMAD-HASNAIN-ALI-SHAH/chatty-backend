const express = require("express");
const protectRoute = require("../middlewares/auth.middleware.js");
const { findUser, addChat, getChats } = require("../controllers/chat.controller.js");

const router = express.Router();

router.route("/find-user").post(protectRoute, findUser);
router.route("/add-chat").post(protectRoute, addChat);
router.route("/get-chats").get(protectRoute, getChats);

module.exports = router;
