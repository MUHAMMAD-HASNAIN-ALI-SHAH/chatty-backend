const redis = require("../config/redis");
const Message = require("../models/message.model");

const getMessagesFromRedis = async (chatId) => {
    // Check if messages are already cached for the chat
    const cachedMessages = await redis.get(`chatMessages:${chatId}`);
    if (cachedMessages) {
        return cachedMessages;
    }

    // Fetch messages from the database if not found in Redis and cache them
    const messages = await Message.find({ chatId }).populate("senderId", "-password -__v").populate("receiverId", "-password -__v").sort({ createdAt: 1 });
    await redis.set(`chatMessages:${chatId}`, messages);

    return messages;
}

const addNewMessageonRedis = async (message, chatId) => {
    const messages = await getMessagesFromRedis(chatId);
    messages.push(message);
    await redis.set(`chatMessages:${chatId}`, messages);
}

const markMessagesAsReadInRedis = async (chatId) => {
    const messages = await getMessagesFromRedis(chatId);
    const updatedMessages = messages.map((msg) => {
        if (!msg.isRead) {
            msg.isRead = true;
        }
        return msg;
    });
    await redis.set(`chatMessages:${chatId}`, updatedMessages);
}

const deleteMessageOnRedis = async (messageId, chatId) => {
    const messages = await getMessagesFromRedis(chatId);
    const updatedMessages = messages.filter((msg) => msg._id.toString() !== messageId.toString());
    await redis.set(`chatMessages:${chatId}`, updatedMessages);
}

module.exports = {
    getMessagesFromRedis,
    addNewMessageonRedis,
    markMessagesAsReadInRedis,
    deleteMessageOnRedis
}