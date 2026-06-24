import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // null indicates a system notification (e.g. password changed)
    },
    type: {
      type: String,
      enum: [
        "password_changed",
        "connection_request",
        "connection_accepted",
        "mention_post",
        "mention_comment",
        "repost",
        "like",
        "comment",
        "message"
      ],
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
