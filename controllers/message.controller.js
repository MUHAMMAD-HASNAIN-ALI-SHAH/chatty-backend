const { getReceiverSocketId, io } = require("../config/socket");
const Message = require("../models/message.model");
const cloudinary = require("../config/cloudinary.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");

const sendMessage = async (req, res) => {
    try {
        const { text, image, chatId, receiverId } = req.body;
        const senderId = req.user._id;

        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const receiver = await User.findById(receiverId).select("-password");
        const sender = await User.findById(senderId).select("-password");
        if (!receiver) {
            return res.status(404).json({ error: "Receiver user not found" });
        }
        if (!sender) {
            return res.status(404).json({ error: "Sender user not found" });
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            chatId,
            text,
            image: imageUrl,
        });
        await newMessage.save();

        newMessage.senderId = sender;
        newMessage.receiverId = receiver;

        const getChat = await Chat.findById(chatId);
        if (!getChat) {
            return res.status(404).json({ error: "Chat not found" });
        }
        getChat.lastMessage = newMessage.text;
        getChat.updatedAt = new Date();
        await getChat.save();

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
            // io.to(receiverSocketId).emit("chatUpdate", {
            //     chatId: getChat._id,
            //     lastMessage: newMessage.text,
            // });
        }

        res.status(200).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log("Fetching messages for chatId:", chatId);
    const messages = await Message.find({ chatId }).populate("senderId", "-password -__v").populate("receiverId", "-password -__v").sort({ createdAt: 1 });

    if (!messages) {
      return res.status(200).json({ message: [] });
    }

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Error in fetching messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { sendMessage, getMessages };