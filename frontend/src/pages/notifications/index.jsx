import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import {
  fetchNotifications,
  markNotificationsAsRead
} from "@/config/redux/action/notificationAction";
import { applyAvatarFallback, getUploadUrl } from "@/config";
import styles from "./index.module.css";

const formatNotificationDate = (dateValue) => {
  if (!dateValue) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric"
  }).format(new Date(dateValue));
};

export default function NotificationsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const notificationState = useSelector((state) => state.notification);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    dispatch(fetchNotifications({ token })).then(() => {
      dispatch(markNotificationsAsRead({ token }));
    });
  }, [dispatch, router, token]);

  const handleNotificationClick = (notification) => {
    if (["mention_post", "mention_comment", "like", "comment", "repost"].includes(notification.type) && notification.post) {
      router.push(`/post/${notification.post._id || notification.post}`);
    } else if (notification.type === "message") {
      router.push("/messages");
    } else if (["connection_request", "connection_accepted"].includes(notification.type)) {
      router.push("/my_connections");
    }
  };

  const getNotificationText = (notification) => {
    const senderName = notification.sender?.name || "Someone";
    switch (notification.type) {
      case "password_changed":
        return {
          emoji: "🔐",
          title: "Security Alert",
          desc: "Your password was successfully changed."
        };
      case "connection_request":
        return {
          emoji: "📩",
          title: "Connection Request",
          desc: `${senderName} sent you a connection request.`
        };
      case "connection_accepted":
        return {
          emoji: "🤝",
          title: "Connection Accepted",
          desc: `${senderName} accepted your connection request. You are now connected!`
        };
      case "mention_post":
        return {
          emoji: "💬",
          title: "Post Mention",
          desc: `${senderName} mentioned you in a post.`
        };
      case "mention_comment":
        return {
          emoji: "💬",
          title: "Comment Mention",
          desc: `${senderName} mentioned you in a comment on a post.`
        };
      case "repost":
        return {
          emoji: "🔄",
          title: "Post Reposted",
          desc: `${senderName} reposted your post.`
        };
      case "like":
        return {
          emoji: "❤️",
          title: "New Like",
          desc: `${senderName} liked your post.`
        };
      case "comment":
        return {
          emoji: "💬",
          title: "New Comment",
          desc: `${senderName} commented on your post: "${notification.comment?.body || ""}"`
        };
      case "message":
        return {
          emoji: "✉️",
          title: "New Message",
          desc: `${senderName} sent you a message.`
        };
      default:
        return {
          emoji: "🔔",
          title: "Notification",
          desc: "You have a new update."
        };
    }
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <h2>Notifications</h2>
            <p>Stay updated with connections, messages, likes, comments, and mentions.</p>
          </div>

          <div className={styles.notificationList}>
            {notificationState.isLoading && (
              <div className={styles.loading}>Loading notifications...</div>
            )}

            {!notificationState.isLoading && notificationState.notifications.length === 0 && (
              <div className={styles.empty}>No notifications yet. You are all caught up!</div>
            )}

            {!notificationState.isLoading &&
              notificationState.notifications.map((notification) => {
                const info = getNotificationText(notification);
                const isUnread = !notification.isRead;

                return (
                  <div
                    key={notification._id}
                    className={`${styles.card} ${isUnread ? styles.unread : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={styles.emoji}>{info.emoji}</div>
                    
                    {notification.sender ? (
                      <img
                        className={styles.avatar}
                        src={getUploadUrl(notification.sender.profilePicture)}
                        alt={notification.sender.name}
                        onError={applyAvatarFallback}
                      />
                    ) : (
                      <div className={styles.systemIcon}>⚙️</div>
                    )}

                    <div className={styles.content}>
                      <h4 className={styles.title}>{info.title}</h4>
                      <p className={styles.desc}>{info.desc}</p>
                      <span className={styles.time}>
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </div>

                    {isUnread && <div className={styles.unreadDot} />}
                  </div>
                );
              })}
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
