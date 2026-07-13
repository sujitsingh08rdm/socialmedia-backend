import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import testRoute from "./routes/test.route.js";
import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import likeRouter from "./routes/like.route.js";
import chatRouter from "./routes/chat.route.js";
import notificationRouter from "./routes/notification.route.js";
const app = express();
app.use(express.json()); // parse the json req body
app.use(express.urlencoded({ extended: true })); //express.urlencoded() is middleware that parses URL-encoded form data sent from HTML forms.
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
//routes
app.use("/api/v1/test", testRoute);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/notification", notificationRouter);
export default app;
