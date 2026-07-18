const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    firstUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    secondUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastMessageTime: {
      type: Date,
      default: new Date(),
    },
    lastMessage: {
        type: String,
        default: "",
    },
    firstUserUnseenMessagesCount: {
      type: Number,
      default: 0,
    },
    secondUserUnseenMessagesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
