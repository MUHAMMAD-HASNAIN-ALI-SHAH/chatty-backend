const User = require("../models/user.model");
const Chat = require("../models/chat.model");
const { getReceiverSocketId, io } = require("../config/socket");

// Create a new chat and send the first message
const addChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const userId = req.user._id;

    const getUser = await User.findById(receiverId);
    if (!getUser) {
      return res.status(404).json({ message: "Receiver user not found" });
    }

    if(getUser && getUser._id.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    // Check if chat already exists (either direction)
    const checkAlreadyChat = await Chat.findOne({
      $or: [
        { firstUserId: userId, secondUserId: receiverId },
        { firstUserId: receiverId, secondUserId: userId },
      ],
    });

    if (checkAlreadyChat) {
      return res
        .status(400)
        .json({ message: "Chat already exists with this user" });
    }

    // Create chat
    const chat = await Chat.create({
      firstUserId: userId,
      secondUserId: receiverId,
    });

    const chatToSend = await Chat.findById(chat._id).populate("firstUserId", "-password -__v")
      .populate("secondUserId", "-password -__v");

    // Emit to receiver if online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new-chat", {
        chat: chatToSend,
      });
    }

    res
      .status(200)
      .json({ message: "Chat created successfully" });
  } catch (error) {
    console.error("Error in new Chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const findUser = async (req, res) => {
  try {
    let { username } = req.body;
    const userId = req.user._id;

    username = username.toLowerCase();

    const getUser = await User.findOne({ username }).select("-password -__v");
    if(getUser && getUser._id.toString() === userId.toString()) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    if (!getUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: getUser });
  } catch (error) {
    console.error("Error in finding user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      $or: [{ firstUserId: userId }, { secondUserId: userId }],
    }).populate("firstUserId", "username profilePic")
      .populate("secondUserId", "username profilePic")
      .sort({ updatedAt: -1 });

    console.log("Fetched chats for userId:", userId, "Chats:", chats);

    res.status(200).json({ chats });
  } catch (error) {
    console.error("Error in fetching chats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addChat,
  findUser,
  getChats,
};
