import Post from "../models/posts.models.js";
import User from "../models/user.models.js";
import Comment from "../models/comments.model.js";
import Connection, { CONNECTION_STATUS } from "../models/connection.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import { buildRoomKey, serializeMessage } from "./chat.controller.js";

const publicUserFields = "name username email profilePicture";

const getIdValue = (value) => {
  if (!value) {
    return "";
  }

  return value?._id?.toString?.() || value.toString();
};

const getUserByToken = async (token) => {
  if (!token) {
    return null;
  }

  return User.findOne({ token }).select(`${publicUserFields} token`);
};

const populatePostQuery = (query) => {
  return query
    .populate("userId", publicUserFields)
    .populate({
      path: "originalPostId",
      populate: {
        path: "userId",
        select: publicUserFields
      }
    });
};

const serializePost = (post, currentUserId = null) => {
  if (!post) return null;
  const likedByIds = (post.likedBy || []).map((userId) => getIdValue(userId));
  const currentId = getIdValue(currentUserId);
  const content = post.content || post.body || "";
  const image = post.image || post.media || "";

  return {
    _id: post._id,
    userId: post.userId,
    body: content,
    content,
    media: image,
    image,
    likes: post.likes || likedByIds.length,
    likedBy: post.likedBy || [],
    likedByCurrentUser: currentId ? likedByIds.includes(currentId) : false,
    comments: post.comments || [],
    commentsCount: post.commentsCount || post.comments?.length || 0,
    sharesCount: post.sharesCount || 0,
    active: post.active,
    fileType: post.fileType || "",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    originalPostId: (post.originalPostId && post.originalPostId.userId) 
      ? serializePost(post.originalPostId, currentUserId) 
      : null
  };
};

const serializeComment = (comment) => {
  return {
    _id: comment._id,
    body: comment.body,
    userId: comment.userId,
    postId: comment.postId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  };
};

const handleMentions = async (text, author, type, sourcePostId, sourceCommentId = null, io = null) => {
  try {
    if (!text || !author) return;

    const allUsers = await User.find({}).select("name username");
    const mentionedUsers = [];

    for (const user of allUsers) {
      if (user._id.toString() === author._id.toString()) continue;

      const escapedUsername = user.username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedName = user.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      const usernameRegex = new RegExp(`@${escapedUsername}\\b`, "i");
      const nameRegex = new RegExp(`@${escapedName}\\b`, "i");

      if (usernameRegex.test(text) || nameRegex.test(text)) {
        mentionedUsers.push(user);
      }
    }

    for (const targetUser of mentionedUsers) {
      const notification = await Notification.create({
        receiver: targetUser._id,
        sender: author._id,
        type: type === "post" ? "mention_post" : "mention_comment",
        post: sourcePostId,
        comment: sourceCommentId
      });

      if (io) {
        const populatedNotification = await Notification.findById(notification._id)
          .populate("sender", "name username profilePicture")
          .populate("post")
          .populate("comment");
        
        io.to(`user:${targetUser._id}`).emit("new_notification", populatedNotification);
      }
    }
  } catch (error) {
    console.error("Error handling mentions:", error);
  }
};

const getAcceptedConnectionIds = async (userId) => {
  const connections = await Connection.find({
    $and: [
      {
        $or: [
          { sender: userId },
          { receiver: userId },
          { userId: userId },
          { connectionId: userId }
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

  return connections
    .map((connection) => {
      const senderId = getIdValue(connection.sender || connection.userId);
      const receiverId = getIdValue(connection.receiver || connection.connectionId);

      return senderId === getIdValue(userId) ? receiverId : senderId;
    })
    .filter(Boolean);
};

const buildFeedQuery = async (currentUserId, filter) => {
  const activeUsers = await User.find({ active: { $ne: false } }).select("_id");
  const activeUserIdsStr = activeUsers.map((u) => u._id.toString());
  const baseQuery = { active: true, userId: { $in: activeUsers.map((u) => u._id) } };

  if (filter !== "connections") {
    return baseQuery;
  }

  if (!currentUserId) {
    return {
      ...baseQuery,
      userId: { $in: [] }
    };
  }

  const connectionIds = await getAcceptedConnectionIds(currentUserId);
  const allowedUserIds = [currentUserId, ...connectionIds]
    .map(id => id.toString())
    .filter(idStr => activeUserIdsStr.includes(idStr));

  return {
    ...baseQuery,
    userId: {
      $in: allowedUserIds
    }
  };
};

const buildFeedSort = (filter) => {
  if (filter === "trending") {
    return {
      likes: -1,
      commentsCount: -1,
      sharesCount: -1,
      createdAt: -1
    };
  }

  return {
    createdAt: -1
  };
};

const getTokenFromRequest = (req) => {
  return req.body?.token || req.query?.token || "";
};

const getPostIdFromRequest = (req) => {
  return (
    req.params?.postId ||
    req.body?.postId ||
    req.body?.post_id ||
    req.query?.postId ||
    req.query?.post_id ||
    ""
  );
};

export const activeCheck = async (req, res) => {
  return res.json({
    success: true,
    message: "Post service is active"
  });
};

export const createPost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const content = (req.body.content || req.body.body || "").trim();

    if (!content && !req.file?.filename) {
      return res.status(400).json({
        success: false,
        message: "Post content or image is required"
      });
    }

    const post = await Post.create({
      userId: user._id,
      content,
      body: content,
      image: req.file?.filename || "",
      media: req.file?.filename || "",
      fileType: req.file?.mimetype || ""
    });

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    await handleMentions(content, user, "post", post._id, null, req.io);

    return res.status(200).json({
      success: true,
      message: "Post uploaded successfully",
      data: {
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeed = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const filter = req.query.filter || "latest";
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);
    const currentUser = await getUserByToken(token);
    const feedQuery = await buildFeedQuery(currentUser?._id, filter);

    const [total, posts] = await Promise.all([
      Post.countDocuments(feedQuery),
      populatePostQuery(
        Post.find(feedQuery)
          .sort(buildFeedSort(filter))
          .skip((page - 1) * limit)
          .limit(limit)
      )
    ]);

    const serializedPosts = posts.map((post) =>
      serializePost(post, currentUser?._id)
    );

    return res.json({
      success: true,
      data: {
        posts: serializedPosts,
        filter,
        pagination: {
          page,
          limit,
          total,
          hasMore: page * limit < total
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const currentUser = await getUserByToken(token);
    const activeUsers = await User.find({ active: { $ne: false } }).select("_id");
    const activeUserIds = activeUsers.map((u) => u._id);
    const posts = await populatePostQuery(
      Post.find({ active: true, userId: { $in: activeUserIds } }).sort({ createdAt: -1 })
    );

    return res.json({
      posts: posts.map((post) => serializePost(post, currentUser?._id))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPublicPost = async (req, res) => {
  try {
    const postId = getPostIdFromRequest(req);
    const post = await populatePostQuery(Post.findById(postId));

    if (!post || !post.active) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    return res.json({
      success: true,
      data: {
        post: serializePost(post)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const post = await Post.findById(postId);

    if (!post || !post.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (getIdValue(post.userId) !== getIdValue(user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own posts"
      });
    }

    const content = (req.body.content || req.body.body || "").trim();

    if (content) {
      post.content = content;
      post.body = content;
    }

    if (req.file?.filename) {
      post.image = req.file.filename;
      post.media = req.file.filename;
      post.fileType = req.file.mimetype || "";
    } else if (req.body.removeMedia === "true") {
      post.image = "";
      post.media = "";
      post.fileType = "";
    }

    await post.save();

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.json({
      success: true,
      message: "Post updated successfully",
      data: {
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const post = await Post.findById(postId);

    if (!post || !post.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (getIdValue(post.userId) !== getIdValue(user._id)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts"
      });
    }

    await Comment.deleteMany({ postId: post._id });
    await post.deleteOne();

    return res.json({
      success: true,
      message: "Post deleted successfully",
      data: {
        postId
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePostLike = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const post = await Post.findById(postId);

    if (!post || !post.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const likedByIds = (post.likedBy || []).map((userId) => getIdValue(userId));
    const currentUserId = getIdValue(user._id);
    const isLiking = !likedByIds.includes(currentUserId);

    if (likedByIds.includes(currentUserId)) {
      post.likedBy = post.likedBy.filter(
        (userId) => getIdValue(userId) !== currentUserId
      );
    } else {
      post.likedBy.push(user._id);
    }

    post.likes = post.likedBy.length;
    await post.save();

    if (isLiking && post.userId.toString() !== user._id.toString()) {
      const likeNotification = await Notification.create({
        receiver: post.userId,
        sender: user._id,
        type: "like",
        post: post._id
      });
      if (req.io) {
        const populatedNotification = await Notification.findById(likeNotification._id)
          .populate("sender", "name username profilePicture")
          .populate("post");
        req.io.to(`user:${post.userId}`).emit("new_notification", populatedNotification);
      }
    }

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.json({
      success: true,
      message: "Post like updated",
      data: {
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const increment_likes = togglePostLike;

export const sharePost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const post = await Post.findById(postId);

    if (!post || !post.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    post.sharesCount = (post.sharesCount || 0) + 1;
    await post.save();

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.json({
      success: true,
      message: "Post shared successfully",
      data: {
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sharePostToUsers = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const sender = await getUserByToken(token);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const postId = getPostIdFromRequest(req);
    const post = await populatePostQuery(Post.findById(postId));

    if (!post || !post.active) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const requestedRecipientIds = Array.isArray(req.body.recipientIds)
      ? req.body.recipientIds
      : [];
    const recipientIds = Array.from(
      new Set(
        requestedRecipientIds
          .map((recipientId) => getIdValue(recipientId))
          .filter(
            (recipientId) => recipientId && recipientId !== getIdValue(sender._id)
          )
      )
    );

    if (recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one LinkVerse user to share with"
      });
    }

    const recipients = await User.find({
      _id: { $in: recipientIds }
    }).select(publicUserFields);

    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid recipients found"
      });
    }

    const fallbackShareUrl =
      req.body.shareUrl ||
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/post/${post._id}`;
    const postText = (post.content || post.body || "").trim();
    const messageContent = (req.body.shareText || "").trim() || (
      postText
        ? `${sender.name || "A LinkVerse user"} shared a post with you on LinkVerse:\n\n${postText}\n\nOpen post: ${fallbackShareUrl}`
        : `${sender.name || "A LinkVerse user"} shared a LinkVerse post with you:\n\n${fallbackShareUrl}`
    );

    for (const recipient of recipients) {
      const roomKey = buildRoomKey(sender._id, recipient._id);
      const message = await Message.create({
        sender: sender._id,
        receiver: recipient._id,
        roomKey,
        content: messageContent
      });

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name username email profilePicture isOnline lastSeen")
        .populate("receiver", "name username email profilePicture isOnline lastSeen");

      if (req.io) {
        req.io
          .to(`user:${getIdValue(sender._id)}`)
          .emit("message_received", serializeMessage(populatedMessage, sender._id));
        req.io
          .to(`user:${getIdValue(recipient._id)}`)
          .emit("message_received", serializeMessage(populatedMessage, recipient._id));
      }
    }

    post.sharesCount = (post.sharesCount || 0) + recipients.length;
    await post.save();

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.json({
      success: true,
      message: `Post shared with ${recipients.length} LinkVerse user${
        recipients.length === 1 ? "" : "s"
      }`,
      data: {
        post: serializePost(populatedPost, sender._id)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const commentPost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const commentBody = (req.body.commentBody || req.body.body || "").trim();

    if (!commentBody) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty"
      });
    }

    const post = await Post.findById(postId);

    if (!post || !post.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const comment = await Comment.create({
      userId: user._id,
      postId,
      body: commentBody
    });

    post.comments.push(comment._id);
    post.commentsCount = post.comments.length;
    await post.save();

    await handleMentions(commentBody, user, "comment", post._id, comment._id, req.io);

    if (post.userId.toString() !== user._id.toString()) {
      const commentNotification = await Notification.create({
        receiver: post.userId,
        sender: user._id,
        type: "comment",
        post: post._id,
        comment: comment._id
      });
      if (req.io) {
        const populatedNotification = await Notification.findById(commentNotification._id)
          .populate("sender", "name username profilePicture")
          .populate("post")
          .populate("comment");
        req.io.to(`user:${post.userId}`).emit("new_notification", populatedNotification);
      }
    }

    const populatedComment = await Comment.findById(comment._id).populate(
      "userId",
      publicUserFields
    );
    const populatedPost = await populatePostQuery(Post.findById(post._id));

    return res.status(200).json({
      success: true,
      message: "Comment added",
      data: {
        comment: serializeComment(populatedComment),
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const get_comments_by_post = async (req, res) => {
  try {
    const postId = getPostIdFromRequest(req);
    const comments = await Comment.find({ postId })
      .populate("userId", publicUserFields)
      .sort({ createdAt: -1 });

    return res.json(comments.map((comment) => serializeComment(comment)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const delete_comment_of_user = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const commentId =
      req.body?.commentId ||
      req.body?.comment_id ||
      req.query?.commentId ||
      req.query?.comment_id;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const post = await Post.findById(comment.postId);

    if (
      getIdValue(comment.userId) !== getIdValue(user._id) &&
      getIdValue(post?.userId) !== getIdValue(user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments"
      });
    }

    await comment.deleteOne();

    if (post) {
      post.comments = (post.comments || []).filter(
        (postCommentId) => getIdValue(postCommentId) !== getIdValue(commentId)
      );
      post.commentsCount = post.comments.length;
      await post.save();
    }

    return res.json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const repostPost = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    const user = await getUserByToken(token);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const postId = getPostIdFromRequest(req);
    const originalPost = await Post.findById(postId);

    if (!originalPost || !originalPost.active) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const post = await Post.create({
      userId: user._id,
      originalPostId: originalPost._id,
      content: "",
      body: "",
      active: true
    });

    originalPost.sharesCount = (originalPost.sharesCount || 0) + 1;
    await originalPost.save();

    const populatedPost = await populatePostQuery(Post.findById(post._id));

    if (originalPost.userId.toString() !== user._id.toString()) {
      const repostNotification = await Notification.create({
        receiver: originalPost.userId,
        sender: user._id,
        type: "repost",
        post: post._id
      });
      if (req.io) {
        const populatedNotification = await Notification.findById(repostNotification._id)
          .populate("sender", "name username profilePicture")
          .populate("post");
        req.io.to(`user:${originalPost.userId}`).emit("new_notification", populatedNotification);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Post reposted successfully",
      data: {
        post: serializePost(populatedPost, user._id)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
