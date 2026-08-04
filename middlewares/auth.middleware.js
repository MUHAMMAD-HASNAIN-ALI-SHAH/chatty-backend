const User = require("../models/user.model");
const mongoose = require("mongoose");
const { getUserAndCache } = require("../redis/auth.redis");

const protectedRoute = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const userId = req.session.user.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const user = await getUserAndCache(userId);

    if (!user) {
      return res.status(403).json({
        message: "Unauthorized access",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = protectedRoute;