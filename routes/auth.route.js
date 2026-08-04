const express = require("express");
const { checkAuth, login, logout, signup, updateProfile } = require("../controllers/auth.controller.js");
const protectRoute = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.route("/register").post(signup);
router.route("/login").post(login);
router.route("/logout").get(protectRoute, logout);
router.route("/update-profile").put(protectRoute, updateProfile);
router.route("/verify").get(protectRoute, checkAuth);

module.exports = router;
