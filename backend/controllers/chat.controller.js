import Connection, { CONNECTION_STATUS } from "../models/connection.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.models.js";
import Notification from "../models/notification.model.js";

const publicUserFields = "name username email profilePicture isOnline lastSeen";

const getIdValue = (value) => {
  if (!value) {
    return "";
  }

  return value?._id?.toString?.() || value.toString();
};

export const buildRoomKey = (firstUserId, secondUserId) => {
  return [getIdValue(firstUserId), getIdValue(secondUserId)].sort().join(":");
};

const isAcceptedConnection = async (firstUserId, secondUserId) => {
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

  return Boolean(connection);
};

const hasExistingConversation = async (firstUserId, secondUserId) => {
  const existingMessage = await Message.findOne({
    roomKey: buildRoomKey(firstUserId, secondUserId)
  }).select("_id");

  return Boolean(existingMessage);
};

const canUsersAccessConversation = async (firstUserId, secondUserId) => {
  const [connected, hasConversation] = await Promise.all([
    isAcceptedConnection(firstUserId, secondUserId),
    hasExistingConversation(firstUserId, secondUserId)
  ]);

  return connected || hasConversation;
};

export const serializeMessage = (message, currentUserId) => {
  return {
    _id: message._id,
    roomKey: message.roomKey,
    content: message.content,
    sender: message.sender,
    receiver: message.receiver,
    isOwnMessage: getIdValue(message.sender) === getIdValue(currentUserId),
    readAt: message.readAt,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
};

const getLatestRoomMessage = async (roomKey) => {
  return Message.findOne({ roomKey })
    .populate("sender", publicUserFields)
    .populate("receiver", publicUserFields)
    .sort({ createdAt: -1 });
};

const buildDeletedMessagePayload = ({
  deletedMessage,
  viewerUserId,
  contactUserId,
  latestMessage
}) => {
  return {
    messageId: getIdValue(deletedMessage._id),
    roomKey: deletedMessage.roomKey,
    contactUserId: getIdValue(contactUserId),
    lastMessage: latestMessage
      ? serializeMessage(latestMessage, viewerUserId)
      : null
  };
};

const buildSidebarItems = async (currentUserId) => {
  const acceptedConnections = await Connection.find({
    $and: [
      {
        $or: [
          { sender: currentUserId },
          { receiver: currentUserId },
          { userId: currentUserId },
          { connectionId: currentUserId }
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

  const acceptedContactIds = acceptedConnections
    .map((connection) => {
      const senderId = getIdValue(connection.sender || connection.userId);
      const receiverId = getIdValue(connection.receiver || connection.connectionId);

      return senderId === getIdValue(currentUserId) ? receiverId : senderId;
    })
    .filter(Boolean);

  const existingMessages = await Message.find({
    $or: [
      { sender: currentUserId },
      { receiver: currentUserId }
    ]
  }).select("sender receiver");

  const messageContactIds = existingMessages
    .map((message) => {
      const senderId = getIdValue(message.sender);
      const receiverId = getIdValue(message.receiver);

      return senderId === getIdValue(currentUserId) ? receiverId : senderId;
    })
    .filter(Boolean);

  const uniqueContactIds = Array.from(
    new Set([...acceptedContactIds, ...messageContactIds])
  );
  const contacts = await User.find({
    _id: { $in: uniqueContactIds },
    active: { $ne: false }
  }).select(publicUserFields);

  const roomKeys = uniqueContactIds.map((contactId) =>
    buildRoomKey(currentUserId, contactId)
  );
  const latestMessages = await Message.find({
    roomKey: { $in: roomKeys }
  })
    .populate("sender", publicUserFields)
    .populate("receiver", publicUserFields)
    .sort({ createdAt: -1 });

  const latestMessageMap = new Map();

  latestMessages.forEach((message) => {
    if (!latestMessageMap.has(message.roomKey)) {
      latestMessageMap.set(message.roomKey, message);
    }
  });

  return contacts
    .map((contact) => {
      const roomKey = buildRoomKey(currentUserId, contact._id);
      const lastMessage = latestMessageMap.get(roomKey);

      return {
        roomKey,
        user: contact,
        lastMessage: lastMessage
          ? serializeMessage(lastMessage, currentUserId)
          : null
      };
    })
    .sort((firstItem, secondItem) => {
      const firstDate = firstItem.lastMessage?.createdAt || firstItem.user.lastSeen;
      const secondDate = secondItem.lastMessage?.createdAt || secondItem.user.lastSeen;

      return new Date(secondDate) - new Date(firstDate);
    });
};

export const getChatSidebar = async (req, res) => {
  try {
    const sidebar = await buildSidebarItems(req.user._id);

    return res.json({
      success: true,
      data: {
        conversations: sidebar
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getMessagesForConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    const otherUser = await User.findById(otherUserId).select(publicUserFields);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const connected = await canUsersAccessConversation(currentUserId, otherUserId);

    if (!connected) {
      return res.status(403).json({
        success: false,
        message: "You can only open chats for accepted connections or shared posts"
      });
    }

    const roomKey = buildRoomKey(currentUserId, otherUserId);

    await Message.updateMany(
      {
        roomKey,
        sender: otherUserId,
        receiver: currentUserId,
        readAt: null
      },
      {
        $set: {
          readAt: new Date()
        }
      }
    );

    const messages = await Message.find({ roomKey })
      .populate("sender", publicUserFields)
      .populate("receiver", publicUserFields)
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: {
        roomKey,
        contact: otherUser,
        messages: messages.map((message) =>
          serializeMessage(message, currentUserId)
        )
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const sender = req.user;
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Receiver and message content are required"
      });
    }

    const receiver = await User.findById(receiverId).select(publicUserFields);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found"
      });
    }

    const connected = await canUsersAccessConversation(sender._id, receiverId);

    if (!connected) {
      return res.status(403).json({
        success: false,
        message: "You can only message accepted connections or existing share threads"
      });
    }

    const roomKey = buildRoomKey(sender._id, receiverId);
    const message = await Message.create({
      sender: sender._id,
      receiver: receiverId,
      roomKey,
      content: content.trim()
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", publicUserFields)
      .populate("receiver", publicUserFields);

    const senderPayload = serializeMessage(populatedMessage, sender._id);
    const receiverPayload = serializeMessage(populatedMessage, receiverId);

    if (req.io) {
      req.io.to(`user:${getIdValue(sender._id)}`).emit("message_received", senderPayload);
      req.io.to(`user:${getIdValue(receiverId)}`).emit(
        "message_received",
        receiverPayload
      );
    }

    const notifyMessage = await Notification.create({
      receiver: receiverId,
      sender: sender._id,
      type: "message"
    });
    if (req.io) {
      const populatedNotification = await Notification.findById(notifyMessage._id)
        .populate("sender", "name username profilePicture");
      req.io.to(`user:${receiverId}`).emit("new_notification", populatedNotification);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: {
        message: senderPayload
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: "Message id is required"
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    if (getIdValue(message.sender) !== getIdValue(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete messages you sent"
      });
    }

    await Message.findByIdAndDelete(messageId);

    const latestMessage = await getLatestRoomMessage(message.roomKey);
    const senderPayload = buildDeletedMessagePayload({
      deletedMessage: message,
      viewerUserId: currentUserId,
      contactUserId: message.receiver,
      latestMessage
    });
    const receiverPayload = buildDeletedMessagePayload({
      deletedMessage: message,
      viewerUserId: message.receiver,
      contactUserId: currentUserId,
      latestMessage
    });

    if (req.io) {
      req.io
        .to(`user:${getIdValue(currentUserId)}`)
        .emit("message_deleted", senderPayload);
      req.io
        .to(`user:${getIdValue(message.receiver)}`)
        .emit("message_deleted", receiverPayload);
    }

    return res.json({
      success: true,
      message: "Message deleted",
      data: senderPayload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
