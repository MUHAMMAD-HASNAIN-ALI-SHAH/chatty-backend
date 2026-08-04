const redis = require("../config/redis");

const getUserFromRedis = async (userId) => {
    return await redis.get(`user:${userId}`);
};

const addUserOnRedis = async (user) => {
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
};

const getUserAndCache = async (userId) => {
    const cachedUser = await redis.get(`user:${userId}`);

    if (cachedUser) {
        return cachedUser;
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
        return null;
    }

    await redis.set(
        `user:${userId}`,
        user.toObject(),
        {
            ex: 60 * 60 * 24,
        }
    );

    return user.toObject();
};

const updateUserOnRedis = async (user) => {
    const cachedUser = await redis.get(`user:${user._id}`);

    if (cachedUser) {
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
};

const deleteUserFromRedis = async (userId) => {
    await redis.del(`user:${userId}`);
};

module.exports = {
    getUserFromRedis,
    addUserOnRedis,
    updateUserOnRedis,
    deleteUserFromRedis,
    getUserAndCache,
};