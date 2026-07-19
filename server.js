const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const connectDB = require("./config/db.js");
const PORT = process.env.PORT || 8081;
const CLIENT_URL = process.env.CLIENT_URL;
const dotenv = require("dotenv");
dotenv.config();
const { app, server } = require("./config/socket.js");

app.use(express.json({ limit: "50mb" }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: "sessions",
        }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);
app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
    })
);

app.use("/api/v1/auth", require("./routes/auth.route.js"));
app.use("/api/v2/chat", require("./routes/chat.route.js"));
app.use("/api/v3/message", require("./routes/message.route.js"));

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on PORT : ${PORT}`);
    });
});
