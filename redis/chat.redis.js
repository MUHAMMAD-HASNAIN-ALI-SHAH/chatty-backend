const redis = require("../config/redis");
const Chat = require("../models/chat.model");

const getChatsFromRedis = async (userId) => {
    // Check if chats are already cached for the user
    const cachedChats = await redis.get(`userChats:${userId}`);
    if (cachedChats) {
        return cachedChats;
    }

    // If not cached, fetch from database and cache it
    const chats = await Chat.find({
        $or: [{ firstUserId: userId }, { secondUserId: userId }],
    }).populate("firstUserId", "-password -__v")
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
        .sort({ updatedAt: -1 });
    await redis.set(`userChats:${userId}`, chats);

    return chats
};

const addNewChatOnRedis = async (chat, userId) => {
    const cachedChats = await redis.get(`userChats:${userId}`);
    if (cachedChats) {
        const updatedChats = [chat, ...cachedChats];
        await redis.set(`userChats:${userId}`, updatedChats);
    } else {
        const chats = await getChatsFromRedis(userId);
        const updatedChats = [chat, ...chats];
        await redis.set(`userChats:${userId}`, updatedChats);
    }
};

const updateChatOnRedis = async (chat, userId) => {
    const cachedChats = await redis.get(`userChats:${userId}`);
    if (cachedChats) {
        const updatedChats = cachedChats.map((c) => (c._id.toString() === chat._id.toString() ? chat : c));
        await redis.set(`userChats:${userId}`, updatedChats);
    } else {
        const chats = await getChatsFromRedis(userId);
        const updatedChats = chats.map((c) => (c._id.toString() === chat._id.toString() ? chat : c));
        await redis.set(`userChats:${userId}`, updatedChats);
    }
};

const deleteChatOnRedis = async (chatId, userId) => {
    const cachedChats = await redis.get(`userChats:${userId}`);
    if (cachedChats) {
        const updatedChats = cachedChats.filter((c) => c._id.toString() !== chatId.toString());
        await redis.set(`userChats:${userId}`, updatedChats);
    }
};

module.exports = {
    getChatsFromRedis,
    addNewChatOnRedis,
    updateChatOnRedis,
    deleteChatOnRedis
}