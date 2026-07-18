const express = require("express");
const { checkAuth, login, logout, signup, updateProfile } = require("../controllers/auth.controller.js");
const protectRoute = require("../middlewares/auth.middleware.js");
const { loginValidator, registerValidator } = require("../validators/auth.validator.js");

const router = express.Router();

router.route("/register").post(registerValidator,signup);
router.route("/login").post(loginValidator, login);
router.route("/logout").get(logout);
router.route("/update-profile").put(protectRoute, updateProfile);
router.route("/verify").get(protectRoute, checkAuth);

module.exports = router;
