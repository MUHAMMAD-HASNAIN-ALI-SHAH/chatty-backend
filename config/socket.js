const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true,
    }
})

const userSocketMap = {};

const getReceiverSocketId = (userId) => {
    return userSocketMap[userId];
};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    io.emit("online-users", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        delete userSocketMap[userId];
        io.emit("online-users", Object.keys(userSocketMap));
    });
});

module.exports = { app, server, io, getReceiverSocketId };