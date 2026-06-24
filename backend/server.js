import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import postRoutes from "./routes/posts.routes.js";
import connectionRoutes from "./routes/connections.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import userRoutes from "./routes/users.routes.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import Connection, { CONNECTION_STATUS } from "./models/connection.model.js";
import Message from "./models/message.model.js";
import User from "./models/user.models.js";
import {
  extractTokenFromSocket,
  resolveUserFromAccessToken
} from "./utils/auth.utils.js";
import { buildRoomKey, serializeMessage } from "./controllers/chat.controller.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const clientOrigin = process.env.APP_BASE_URL || "http://localhost:3000";

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: clientOrigin,
    credentials: true
  }
});

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", connectionRoutes);
app.use("/", profileRoutes);
app.use("/", postRoutes);
app.use("/", chatRoutes);
app.use("/", notificationRoutes);

const getIdValue = (value) => {
  if (!value) {
    return "";
  }

  return value?._id?.toString?.() || value.toString();
};

const canUsersChat = async (firstUserId, secondUserId) => {
  const connection = await Connection.findOne({
    $and: [
      {
        $or: [
          { sender: firstUserId, receiver: secondUserId },
          { sender: secondUserId, receiver: firstUserId },
          { userId: firstUserId, connectionId: secondUserId },
          { userId: secondUserId, connectionId: firstUserId }
        ]
      },
      {
        $or: [
          { status: CONNECTION_STATUS.ACCEPTED },
          { status_accepted: true }
        ]
      }
    ]
  });

  if (connection) {
    return true;
  }

  const existingMessage = await Message.findOne({
    roomKey: buildRoomKey(firstUserId, secondUserId)
  }).select("_id");

  return Boolean(existingMessage);
};

io.use(async (socket, next) => {
  try {
    const token = extractTokenFromSocket(socket);
    const user = await resolveUserFromAccessToken(token);

    if (!user) {
      return next(new Error("Unauthorized"));
    }

    socket.user = user;
    socket.authToken = token;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const currentUserId = getIdValue(socket.user);

  socket.join(`user:${currentUserId}`);

  await User.findByIdAndUpdate(currentUserId, {
    isOnline: true,
    lastSeen: new Date()
  });

  io.emit("presence:update", {
    userId: currentUserId,
    isOnline: true,
    lastSeen: new Date()
  });

  socket.on("join_room", ({ otherUserId }) => {
    if (!otherUserId) {
      return;
    }

    socket.join(buildRoomKey(currentUserId, otherUserId));
  });

  socket.on("typing", async ({ otherUserId }) => {
    if (!otherUserId || !(await canUsersChat(currentUserId, otherUserId))) {
      return;
    }

    const payload = {
      userId: currentUserId,
      otherUserId,
      isTyping: true
    };

    io.to(buildRoomKey(currentUserId, otherUserId)).emit("typing", payload);
    io.to(`user:${otherUserId}`).emit("typing", payload);
  });

  socket.on("stop_typing", async ({ otherUserId }) => {
    if (!otherUserId || !(await canUsersChat(currentUserId, otherUserId))) {
      return;
    }

    const payload = {
      userId: currentUserId,
      otherUserId,
      isTyping: false
    };

    io.to(buildRoomKey(currentUserId, otherUserId)).emit("typing", payload);
    io.to(`user:${otherUserId}`).emit("typing", payload);
  });

  socket.on("send_message", async ({ receiverId, content }, acknowledgement) => {
    try {
      if (!receiverId || !content?.trim()) {
        acknowledgement?.({
          success: false,
          message: "Receiver and message content are required"
        });
        return;
      }

      const canChat = await canUsersChat(currentUserId, receiverId);

      if (!canChat) {
        acknowledgement?.({
          success: false,
          message: "You can only chat with accepted connections"
        });
        return;
      }

      const roomKey = buildRoomKey(currentUserId, receiverId);
      const message = await Message.create({
        sender: currentUserId,
        receiver: receiverId,
        roomKey,
        content: content.trim()
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name username email profilePicture isOnline lastSeen")
        .populate("receiver", "name username email profilePicture isOnline lastSeen");

      const senderPayload = serializeMessage(populatedMessage, currentUserId);
      const receiverPayload = serializeMessage(populatedMessage, receiverId);

      io.to(`user:${currentUserId}`).emit("message_received", senderPayload);
      io.to(`user:${receiverId}`).emit("message_received", receiverPayload);

      acknowledgement?.({
        success: true,
        data: {
          message: senderPayload
        }
      });
    } catch (error) {
      acknowledgement?.({
        success: false,
        message: error.message
      });
    }
  });

  socket.on("disconnect", async () => {
    await User.findByIdAndUpdate(currentUserId, {
      isOnline: false,
      lastSeen: new Date()
    });

    io.emit("presence:update", {
      userId: currentUserId,
      isOnline: false,
      lastSeen: new Date()
    });
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const PORT = process.env.PORT || 9090;
    httpServer.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
};

start();
