const express = require("express");
const protectRoute = require("../middlewares/auth.middleware.js");
const { sendMessage, getMessages, markMessagesAsRead } = require("../controllers/message.controller.js");

const router = express.Router();

router.route("/send-message").post(protectRoute, sendMessage);
router.route("/get-messages/:chatId").get(protectRoute, getMessages);
router.route("/mark-messages-as-read").post(protectRoute, markMessagesAsRead);

module.exports = router;
