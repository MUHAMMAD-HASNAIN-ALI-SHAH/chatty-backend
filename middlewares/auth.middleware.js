const User = require("../models/user.model");
const mongoose = require("mongoose");
const redis = require("../config/redis.js");

const protectedRoute = async (req, res, next) => {
  try {
    // get userId from session
    if (!req.session.user) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // check if userId is valid
    const userId = req.session.user.userId;
    if (!userId || mongoose.Types.ObjectId.isValid(userId) === false) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    let user;
    const cachedUser = await redis.get(`user:${userId}`);

    if (cachedUser) {
      user = cachedUser;
    } else {
      const getUser = await User.findById(userId).select("-password");

      if (!getUser) {
        return res.status(403).json({
          message: "Unauthorized access",
        });
      }

      user = getUser.toObject();

      await redis.set(
        `user:${userId}`,
        user,
        {
          ex: 60 * 60 * 24,
        }
      );
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = protectedRoute;
