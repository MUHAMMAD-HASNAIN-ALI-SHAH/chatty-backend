const { getReceiverSocketId, io } = require("../config/socket");
const Message = require("../models/message.model");
const cloudinary = require("../config/cloudinary.js");
const Chat = require("../models/chat.model.js");
const User = require("../models/user.model.js");
const { getMessagesFromRedis, addNewMessageonRedis, markMessagesAsReadInRedis, deleteMessageOnRedis } = require("../redis/message.redis");
const { updateChatOnRedis } = require("../redis/chat.redis");
const redis = require("../config/redis");

const sendMessage = async (req, res) => {
    try {
        const { text, image, chatId, receiverId } = req.body;
        const senderId = req.user._id;

        // upload image to cloudinary if image is provided
        let imageUrl;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        // check if receiver and sender exist
        const receiver = await User.findById(receiverId).select("-password");
        const sender = await User.findById(senderId).select("-password");
        if (!receiver) {
            return res.status(404).json({ error: "Receiver user not found" });
        }
        if (!sender) {
            return res.status(404).json({ error: "Sender user not found" });
        }

        // check if chat exists
        const getChat = await Chat.findById(chatId);
        if (!getChat) {
            return res.status(404).json({ error: "Chat not found" });
        }

        // check sender and receiver are part of the chat
        if (
            !(getChat.firstUserId.toString() === senderId.toString() && getChat.secondUserId.toString() === receiverId.toString()) &&
            !(getChat.firstUserId.toString() === receiverId.toString() && getChat.secondUserId.toString() === senderId.toString())
        ) {
            return res.status(403).json({ error: "Sender and receiver are not part of the chat" });
        }

        // create new message
        const newMessage = new Message({
            senderId,
            receiverId,
            chatId,
            text,
            image: imageUrl,
        });
        await newMessage.save();

        // add sender on newMessage object to send to receiver and for redis
        newMessage.senderId = sender;
        newMessage.receiverId = receiver;

        // update chat with last message and unseen messages count
        getChat.lastMessageId = newMessage;
        getChat.updatedAt = new Date();

        // update unseen messages count for the receiver
        if (getChat.firstUserId.toString() === senderId.toString()) {
            getChat.secondUserUnseenMessagesCount += 1;
        } else if (getChat.secondUserId.toString() === senderId.toString()) {
            getChat.firstUserUnseenMessagesCount += 1;
        }

        // save the chat after updating unseen messages count and last message
        await getChat.save();

        // chat save for sender and receiver on redis
        if (getChat.firstUserId.toString() === senderId.toString()) {
            getChat.firstUserId = {
                _id: sender._id,
                username: sender.username,
                email: sender.email,
                profilePicture: sender.profilePicture,
                createdAt: sender.createdAt,
                updatedAt: sender.updatedAt,
            };
        } else if (getChat.secondUserId.toString() === senderId.toString()) {
            getChat.secondUserId = {
                _id: sender._id,
                username: sender.username,
                email: sender.email,
                profilePicture: sender.profilePicture,
                createdAt: sender.createdAt,
                updatedAt: sender.updatedAt,
            };
        }

        // update chat on redis for both sender
        updateChatOnRedis(getChat, senderId);

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
            io.to(receiverSocketId).emit("chatUpdate", {
                chatId: getChat._id,
                lastMessageId: newMessage,
                firstUserUnseenMessagesCount: getChat.firstUserUnseenMessagesCount,
                secondUserUnseenMessagesCount: getChat.secondUserUnseenMessagesCount,
            });

            // update chat on redis for receiver
            updateChatOnRedis(getChat, receiverId);
        }

        addNewMessageonRedis(newMessage, chatId);

        res.status(200).json(newMessage);
    } catch (error) {
        console.error("Error in sendMessage: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await getMessagesFromRedis(chatId);
        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error in fetching messages:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId, userId } = req.body;

        // Fetch the chat and populate the user details
        const chat = await Chat.findById(chatId)
            .populate("firstUserId", "-password -__v")
            .populate("secondUserId", "-password -__v")
            .populate({
                path: "lastMessageId",
                populate: [
                    {
                        path: "senderId",
                        select: "-password -__v",
                    },
                    {
                        path: "receiverId",
                        select: "-password -__v",
                    },
                ],
            })

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        if (chat.firstUserId._id.toString() === userId.toString()) {
            chat.firstUserUnseenMessagesCount = 0;
        }

        if (chat.secondUserId._id.toString() === userId.toString()) {
            chat.secondUserUnseenMessagesCount = 0;
        }

        updateChatOnRedis(chat, userId);

        let receiverId;
        if (chat.firstUserId._id.toString() === userId.toString()) {
            receiverId = chat.secondUserId._id;
        } else if (chat.secondUserId._id.toString() === userId.toString()) {
            receiverId = chat.firstUserId._id;
        }

        if (userId.toString() !== chat.firstUserId._id.toString()) {
            await Message.updateMany({ chatId, isRead: false }, { $set: { isRead: true } });
            markMessagesAsReadInRedis(chatId);
        }

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messagesRead", { chatId });
            updateChatOnRedis(chat, receiverId);
        }
        await chat.save();

        res.status(200).json({ chatId: chat._id });
    } catch (error) {
        console.error("Error in marking messages as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const getChat = await Chat.findById(message.chatId);
        if (!getChat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        let receiverId;
        if (getChat.firstUserId.toString() === userId.toString()) {
            receiverId = getChat.secondUserId;
        } else if (getChat.secondUserId.toString() === userId.toString()) {
            receiverId = getChat.firstUserId;
        }

        let recieverId = message.receiverId;
        if (message.isRead === false) {
            if (getChat.firstUserId.toString() === recieverId.toString()) {
                getChat.firstUserUnseenMessagesCount = Math.max(0, getChat.firstUserUnseenMessagesCount - 1);
            } else if (getChat.secondUserId.toString() === recieverId.toString()) {
                getChat.secondUserUnseenMessagesCount = Math.max(0, getChat.secondUserUnseenMessagesCount - 1);
            }
        }
        getChat.updatedAt = new Date();

        await Message.findByIdAndDelete(messageId);
        const lastMessage = await Message.findOne({ chatId: getChat._id }).sort({ createdAt: -1 });
        if (!lastMessage) {
            getChat.lastMessageId = null;
        } else {
            getChat.lastMessageId = lastMessage._id;
        }

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("chatUpdate", {
                chatId: getChat._id,
                lastMessageId: lastMessage,
                firstUserUnseenMessagesCount: getChat.firstUserUnseenMessagesCount,
                secondUserUnseenMessagesCount: getChat.secondUserUnseenMessagesCount,
            });
        }
        await getChat.save();

        if (receiverSocketId) {
            io.to(receiverSocketId).emit("delete-message", {
                messageId: message._id,
                chatId: getChat._id,
            });
        }

        deleteMessageOnRedis(message._id, getChat._id);

        res.status(200).json({ messageId });
    } catch (error) {
        console.error("Error in deleting message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { sendMessage, getMessages, markMessagesAsRead, deleteMessage };