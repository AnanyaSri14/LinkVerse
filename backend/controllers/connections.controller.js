import Connection, {
  CONNECTION_STATUS,
  buildPairKey
} from "../models/connection.model.js";
import User from "../models/user.models.js";
import Notification from "../models/notification.model.js";

const userPublicFields = "name username email profilePicture";

const getIdValue = (value) => {
  if (!value) {
    return "";
  }

  return value?._id?.toString?.() || value.toString();
};

const getConnectionStatus = (connection) => {
  if (connection.status) {
    return connection.status;
  }

  if (connection.status_accepted === true) {
    return CONNECTION_STATUS.ACCEPTED;
  }

  if (connection.status_accepted === false) {
    return CONNECTION_STATUS.REJECTED;
  }

  return CONNECTION_STATUS.PENDING;
};

const getConnectionPriority = (status) => {
  if (status === CONNECTION_STATUS.ACCEPTED) {
    return 3;
  }

  if (status === CONNECTION_STATUS.PENDING) {
    return 2;
  }

  return 1;
};

const getConnectionUsers = (connection) => {
  return {
    sender: connection.sender || connection.userId,
    receiver: connection.receiver || connection.connectionId
  };
};

const buildUserConnectionsQuery = (userId) => {
  return {
    $or: [
      { sender: userId },
      { receiver: userId },
      { userId: userId },
      { connectionId: userId }
    ]
  };
};

const buildPairQuery = (firstUserId, secondUserId) => {
  return {
    $or: [
      { sender: firstUserId, receiver: secondUserId },
      { sender: secondUserId, receiver: firstUserId },
      { userId: firstUserId, connectionId: secondUserId },
      { userId: secondUserId, connectionId: firstUserId },
      { sender: firstUserId, connectionId: secondUserId },
      { sender: secondUserId, connectionId: firstUserId },
      { userId: firstUserId, receiver: secondUserId },
      { userId: secondUserId, receiver: firstUserId }
    ]
  };
};

const buildConnectionUpdatePayload = (senderId, receiverId, status) => {
  return {
    sender: senderId,
    receiver: receiverId,
    userId: senderId,
    connectionId: receiverId,
    pairKey: buildPairKey(senderId, receiverId),
    status,
    status_accepted:
      status === CONNECTION_STATUS.ACCEPTED
        ? true
        : status === CONNECTION_STATUS.REJECTED
        ? false
        : null
  };
};

const populateConnectionQuery = (query) => {
  return query
    .populate("sender", userPublicFields)
    .populate("receiver", userPublicFields)
    .populate("userId", userPublicFields)
    .populate("connectionId", userPublicFields);
};

const syncConnectionDocument = async (connection) => {
  const { sender, receiver } = getConnectionUsers(connection);
  const status = getConnectionStatus(connection);
  let hasChanges = false;

  if (!connection.sender && sender) {
    connection.sender = sender;
    hasChanges = true;
  }

  if (!connection.receiver && receiver) {
    connection.receiver = receiver;
    hasChanges = true;
  }

  if (!connection.userId && sender) {
    connection.userId = sender;
    hasChanges = true;
  }

  if (!connection.connectionId && receiver) {
    connection.connectionId = receiver;
    hasChanges = true;
  }

  if (connection.status !== status) {
    connection.status = status;
    hasChanges = true;
  }

  const expectedLegacyStatus =
    status === CONNECTION_STATUS.ACCEPTED
      ? true
      : status === CONNECTION_STATUS.REJECTED
      ? false
      : null;

  if (connection.status_accepted !== expectedLegacyStatus) {
    connection.status_accepted = expectedLegacyStatus;
    hasChanges = true;
  }

  if (sender && receiver) {
    const nextPairKey = buildPairKey(sender, receiver);

    if (connection.pairKey !== nextPairKey) {
      connection.pairKey = nextPairKey;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await connection.save();
  }

  return connection;
};

const sortConnectionsByRelevance = (currentConnection, nextConnection) => {
  const currentPriority = getConnectionPriority(getConnectionStatus(currentConnection));
  const nextPriority = getConnectionPriority(getConnectionStatus(nextConnection));

  if (nextPriority !== currentPriority) {
    return nextPriority - currentPriority;
  }

  return new Date(nextConnection.updatedAt || nextConnection.createdAt) -
    new Date(currentConnection.updatedAt || currentConnection.createdAt);
};

const getUserFromToken = async (token) => {
  if (!token) {
    return null;
  }

  return User.findOne({ token }).select(userPublicFields + " token");
};

const getRawConnectionsForUser = async (userId) => {
  return populateConnectionQuery(
    Connection.find(buildUserConnectionsQuery(userId)).sort({
      updatedAt: -1,
      createdAt: -1
    })
  );
};

const findExistingConnection = async (firstUserId, secondUserId) => {
  const connections = await populateConnectionQuery(
    Connection.find(buildPairQuery(firstUserId, secondUserId)).sort({
      updatedAt: -1,
      createdAt: -1
    })
  );

  if (connections.length === 0) {
    return null;
  }

  const normalizedConnections = await Promise.all(
    connections.map((connection) => syncConnectionDocument(connection))
  );

  return normalizedConnections.sort(sortConnectionsByRelevance)[0];
};

const getAcceptedConnectionIds = async (userId) => {
  const rawConnections = await getRawConnectionsForUser(userId);
  const normalizedConnections = await Promise.all(
    rawConnections.map((connection) => syncConnectionDocument(connection))
  );

  return normalizedConnections
    .filter((connection) => getConnectionStatus(connection) === CONNECTION_STATUS.ACCEPTED)
    .map((connection) => {
      const { sender, receiver } = getConnectionUsers(connection);
      const senderId = getIdValue(sender);
      const receiverId = getIdValue(receiver);

      return senderId === getIdValue(userId) ? receiverId : senderId;
    })
    .filter(Boolean);
};

const buildMutualCountMap = async (currentUserId, otherUserIds) => {
  const currentAcceptedConnections = new Set(
    await getAcceptedConnectionIds(currentUserId)
  );
  const mutualCountMap = new Map();

  await Promise.all(
    otherUserIds.map(async (otherUserId) => {
      if (!otherUserId) {
        return;
      }

      const otherAcceptedConnections = await getAcceptedConnectionIds(otherUserId);
      const mutualCount = otherAcceptedConnections.filter((connectionId) =>
        currentAcceptedConnections.has(connectionId)
      ).length;

      mutualCountMap.set(otherUserId, mutualCount);
    })
  );

  return mutualCountMap;
};

const serializeConnection = (connection, currentUserId, mutualCountMap = new Map()) => {
  const { sender, receiver } = getConnectionUsers(connection);
  const status = getConnectionStatus(connection);
  const senderId = getIdValue(sender);
  const receiverId = getIdValue(receiver);
  const currentId = getIdValue(currentUserId);
  const direction =
    currentId === senderId
      ? "sent"
      : currentId === receiverId
      ? "received"
      : null;
  const otherUser = direction === "sent" ? receiver : sender;
  const otherUserId = getIdValue(otherUser);

  return {
    _id: connection._id,
    sender,
    receiver,
    status,
    direction,
    isSender: direction === "sent",
    isReceiver: direction === "received",
    otherUser,
    otherUserId,
    pairKey: connection.pairKey || buildPairKey(senderId, receiverId),
    mutualConnections: mutualCountMap.get(otherUserId) || 0,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
};

const buildConnectionsPayload = async (userId) => {
  const rawConnections = await getRawConnectionsForUser(userId);
  const normalizedConnections = await Promise.all(
    rawConnections.map((connection) => syncConnectionDocument(connection))
  );
  const tentativeConnections = normalizedConnections.map((connection) =>
    serializeConnection(connection, userId)
  );
  const mutualCountMap = await buildMutualCountMap(
    userId,
    tentativeConnections
      .map((connection) => connection.otherUserId)
      .filter(Boolean)
  );
  const dedupedConnectionsMap = new Map();

  normalizedConnections.forEach((connection) => {
    const serializedConnection = serializeConnection(
      connection,
      userId,
      mutualCountMap
    );
    const existingConnection = dedupedConnectionsMap.get(serializedConnection.pairKey);

    if (!existingConnection) {
      dedupedConnectionsMap.set(serializedConnection.pairKey, serializedConnection);
      return;
    }

    if (
      sortConnectionsByRelevance(existingConnection, serializedConnection) > 0
    ) {
      dedupedConnectionsMap.set(serializedConnection.pairKey, serializedConnection);
    }
  });

  const allConnections = Array.from(dedupedConnectionsMap.values()).sort(
    (firstConnection, secondConnection) =>
      new Date(secondConnection.updatedAt || secondConnection.createdAt) -
      new Date(firstConnection.updatedAt || firstConnection.createdAt)
  );

  const grouped = {
    sent: allConnections.filter(
      (connection) =>
        connection.status === CONNECTION_STATUS.PENDING &&
        connection.direction === "sent"
    ),
    received: allConnections.filter(
      (connection) =>
        connection.status === CONNECTION_STATUS.PENDING &&
        connection.direction === "received"
    ),
    accepted: allConnections.filter(
      (connection) => connection.status === CONNECTION_STATUS.ACCEPTED
    ),
    rejected: allConnections.filter(
      (connection) => connection.status === CONNECTION_STATUS.REJECTED
    )
  };

  return {
    connections: allConnections,
    grouped,
    counts: {
      sent: grouped.sent.length,
      received: grouped.received.length,
      accepted: grouped.accepted.length,
      rejected: grouped.rejected.length
    }
  };
};

export const sendConnection = async (req, res) => {
  const { token, targetUserId, connectionId } = req.body;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetId = targetUserId || connectionId;
    const targetUser = await User.findById(targetId).select(userPublicFields);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    if (getIdValue(currentUser) === getIdValue(targetUser)) {
      return res.status(400).json({
        success: false,
        message: "You cannot send a connection request to yourself"
      });
    }

    const existingConnection = await findExistingConnection(
      currentUser._id,
      targetUser._id
    );

    if (existingConnection) {
      const status = getConnectionStatus(existingConnection);
      const { sender, receiver } = getConnectionUsers(existingConnection);
      const senderId = getIdValue(sender);
      const receiverId = getIdValue(receiver);

      if (status === CONNECTION_STATUS.ACCEPTED) {
        return res.status(400).json({
          success: false,
          message: "You are already connected"
        });
      }

      if (
        status === CONNECTION_STATUS.PENDING &&
        senderId === getIdValue(currentUser) &&
        receiverId === getIdValue(targetUser)
      ) {
        return res.status(400).json({
          success: false,
          message: "Connection request already sent"
        });
      }

      if (
        status === CONNECTION_STATUS.PENDING &&
        receiverId === getIdValue(currentUser)
      ) {
        const updatePayload = buildConnectionUpdatePayload(
          senderId,
          receiverId,
          CONNECTION_STATUS.ACCEPTED
        );

        await Connection.updateMany(
          buildPairQuery(currentUser._id, targetUser._id),
          { $set: updatePayload }
        );

        const acceptedConnection = await findExistingConnection(
          currentUser._id,
          targetUser._id
        );

        const notifyAccepted = await Notification.create({
          receiver: targetUser._id,
          sender: currentUser._id,
          type: "connection_accepted"
        });
        if (req.io) {
          const populatedNotification = await Notification.findById(notifyAccepted._id)
            .populate("sender", "name username profilePicture");
          req.io.to(`user:${targetUser._id}`).emit("new_notification", populatedNotification);
        }

        return res.json({
          success: true,
          message: "Connection request accepted",
          data: {
            connection: serializeConnection(acceptedConnection, currentUser._id)
          }
        });
      }

      await Connection.deleteMany(buildPairQuery(currentUser._id, targetUser._id));
    }

    const newConnection = await Connection.create({
      sender: currentUser._id,
      receiver: targetUser._id,
      status: CONNECTION_STATUS.PENDING
    });

    const notifyRequest = await Notification.create({
      receiver: targetUser._id,
      sender: currentUser._id,
      type: "connection_request"
    });
    if (req.io) {
      const populatedNotification = await Notification.findById(notifyRequest._id)
        .populate("sender", "name username profilePicture");
      req.io.to(`user:${targetUser._id}`).emit("new_notification", populatedNotification);
    }

    const createdConnection = await populateConnectionQuery(
      Connection.findById(newConnection._id)
    );

    return res.status(201).json({
      success: true,
      message: "Connection request sent",
      data: {
        connection: serializeConnection(createdConnection, currentUser._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const respondToConnection = async (req, res) => {
  const { token, connectionId, requestId, action, action_type } = req.body;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetConnectionId = connectionId || requestId;
    const connection = await populateConnectionQuery(
      Connection.findById(targetConnectionId)
    );

    if (!connection) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    await syncConnectionDocument(connection);

    const normalizedAction = action || action_type;
    const { sender, receiver } = getConnectionUsers(connection);
    const senderId = getIdValue(sender);
    const receiverId = getIdValue(receiver);
    const currentUserId = getIdValue(currentUser);
    const pairQuery = buildPairQuery(senderId, receiverId);

    if (getConnectionStatus(connection) !== CONNECTION_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be updated"
      });
    }

    if (normalizedAction === "accept") {
      if (currentUserId !== receiverId) {
        return res.status(403).json({
          success: false,
          message: "Only the receiver can accept this request"
        });
      }

      const updatePayload = buildConnectionUpdatePayload(
        senderId,
        receiverId,
        CONNECTION_STATUS.ACCEPTED
      );

      await Connection.updateMany(pairQuery, { $set: updatePayload });

      const acceptedConnection = await findExistingConnection(senderId, receiverId);

      const notifyAccepted = await Notification.create({
        receiver: senderId,
        sender: currentUser._id,
        type: "connection_accepted"
      });
      if (req.io) {
        const populatedNotification = await Notification.findById(notifyAccepted._id)
          .populate("sender", "name username profilePicture");
        req.io.to(`user:${senderId}`).emit("new_notification", populatedNotification);
      }

      return res.json({
        success: true,
        message: "Connection request accepted",
        data: {
          connection: serializeConnection(acceptedConnection, currentUser._id)
        }
      });
    }

    if (normalizedAction === "reject") {
      if (currentUserId !== receiverId) {
        return res.status(403).json({
          success: false,
          message: "Only the receiver can reject this request"
        });
      }

      const updatePayload = buildConnectionUpdatePayload(
        senderId,
        receiverId,
        CONNECTION_STATUS.REJECTED
      );

      await Connection.updateMany(pairQuery, { $set: updatePayload });

      const rejectedConnection = await findExistingConnection(senderId, receiverId);

      return res.json({
        success: true,
        message: "Connection request rejected",
        data: {
          connection: serializeConnection(rejectedConnection, currentUser._id)
        }
      });
    }

    if (normalizedAction === "cancel") {
      if (currentUserId !== senderId) {
        return res.status(403).json({
          success: false,
          message: "Only the sender can cancel this request"
        });
      }

      await Connection.deleteMany(pairQuery);

      return res.json({
        success: true,
        message: "Connection request cancelled"
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid connection action"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getConnections = async (req, res) => {
  const { token, filter = "all" } = req.query;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const payload = await buildConnectionsPayload(currentUser._id);
    const selectedConnections =
      filter !== "all" && payload.grouped[filter]
        ? payload.grouped[filter]
        : payload.connections;

    return res.json({
      success: true,
      data: {
        ...payload,
        activeFilter: filter,
        connections: selectedConnections
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getConnectionsLegacy = async (req, res) => {
  const { token } = req.query;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const payload = await buildConnectionsPayload(currentUser._id);

    return res.json({ connections: payload.connections });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getMutualConnections = async (req, res) => {
  const { token } = req.query;
  const { userId } = req.params;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetUser = await User.findById(userId).select(userPublicFields);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    const [currentUserAcceptedIds, targetUserAcceptedIds] = await Promise.all([
      getAcceptedConnectionIds(currentUser._id),
      getAcceptedConnectionIds(targetUser._id)
    ]);
    const mutualConnectionIds = currentUserAcceptedIds.filter((connectionId) =>
      targetUserAcceptedIds.includes(connectionId)
    );
    const mutualConnections = await User.find({
      _id: { $in: mutualConnectionIds }
    }).select(userPublicFields);

    return res.json({
      success: true,
      data: {
        count: mutualConnections.length,
        mutualConnections
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getConnectionSuggestions = async (req, res) => {
  const { token } = req.query;

  try {
    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const payload = await buildConnectionsPayload(currentUser._id);
    const connectedOrPendingIds = new Set([
      getIdValue(currentUser._id),
      ...payload.connections
        .filter((connection) =>
          [CONNECTION_STATUS.PENDING, CONNECTION_STATUS.ACCEPTED].includes(
            connection.status
          )
        )
        .map((connection) => connection.otherUserId)
    ]);
    const candidateUsers = await User.find({
      _id: { $nin: Array.from(connectedOrPendingIds) },
      active: { $ne: false }
    })
      .select(userPublicFields)
      .sort({ createdAt: -1 });
    const mutualCountMap = await buildMutualCountMap(
      currentUser._id,
      candidateUsers.map((user) => getIdValue(user))
    );
    const suggestions = candidateUsers
      .map((user) => ({
        user,
        mutualConnections: mutualCountMap.get(getIdValue(user)) || 0
      }))
      .sort((firstSuggestion, secondSuggestion) => {
        if (
          secondSuggestion.mutualConnections !== firstSuggestion.mutualConnections
        ) {
          return secondSuggestion.mutualConnections - firstSuggestion.mutualConnections;
        }

        return firstSuggestion.user.name.localeCompare(secondSuggestion.user.name);
      })
      .slice(0, 8);

    return res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
