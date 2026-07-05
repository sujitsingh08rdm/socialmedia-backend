import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import app from "./app.js";
import connectDB from "./config/db.js";
import http from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 4001;

let server = http.createServer(app);

const onlineUsers = new Map<string, string>();

export const getReceiverSocket = (userId: string) => {
  return onlineUsers.get(userId);
};

export const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
});

io.on("connection", (socket) => {
  console.log("User connected : ", socket.id);

  socket.on("join", (userId: string) => {
    onlineUsers.set(userId, socket.id);

    console.log(`${userId} is online`);
    console.log("Online Users:");
    console.log([...onlineUsers.entries()]);
    socket.join(userId);

    console.log(`${userId} is online`);

    io.emit("onlineUsers", [...onlineUsers.keys()]);
  });

  //join converstaions

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation ${conversationId}`);
  });

  // leave convestaion

  socket.on("leave_conversation", (conversationId: string) => {
    socket.leave(conversationId);

    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  // DIsconnect

  socket.on("disconnect", () => {
    console.log(`User Disconnected Succesfully ${socket.id}`);

    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("onlineUsers", [...onlineUsers.keys()]);
  });
});

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server running on PORT ${port} successfully..`);
    });
    server.on("error", (error) => {
      console.log("server Error : ", error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error(`MongoDB Connection failed: ${error}`);
    process.exit(1);
  });
