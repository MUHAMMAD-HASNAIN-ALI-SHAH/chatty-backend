const express = require("express");
const protectRoute = require("../middlewares/auth.middleware.js");
const { sendMessage, getMessages } = require("../controllers/message.controller.js");

const router = express.Router();

router.route("/send-message").post(protectRoute, sendMessage);
router.route("/get-messages/:chatId").get(protectRoute, getMessages);

module.exports = router;
