const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const cloudinary = require("../config/cloudinary.js");
const redis = require("../config/redis.js");

const signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    // validate username and password
    username = username.toLowerCase();
    email = email.toLowerCase();
    const usernameRegex = /^[a-z][a-z0-9]{2,9}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message:
          "Username must start with a letter, contain only letters and numbers, and be 3-10 characters long.",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    // check if username or email already exists
    const checkUsername = await User.findOne({ username });
    const checkEmail = await User.findOne({ email });
    if (checkUsername) {
      return res.status(400).json({ message: "Username already exists" });
    }
    if (checkEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profilePic: "",
    });

    await newUser.save();

    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // lowercase email for case-insensitive comparison
    email = email.toLowerCase();

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // set userId in session
    req.session.user = {
      userId: user._id,
    };

    // check if user is already in redis, if not add user to redis
    const cachedUser = await redis.get(`user:${user._id}`);
    if (!cachedUser) {
      await redis.set(
        `user:${user._id}`,
        {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
          profilePic: user.profilePic,
        },
        {
          ex: 60 * 60 * 24,
        }
      );
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const logout = async (req, res) => {
  try {
    // remove user from redis
    const userId = req.session?.user?.userId;
    if (userId) {
      await redis.del(`user:${userId}`);
    }

    // destroy session
    req.session.destroy();

    res.status(200).json();
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkAuth = async (req, res) => {
  try {
    return res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  signup,
  login,
  logout,
  updateProfile,
  checkAuth,
};
