import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import {
  applyAvatarFallback,
  BASE_URL,
  clientServer,
  getAccessToken,
  getUploadUrl
} from "@/config";
import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import styles from "./index.module.css";

const upsertMessage = (messages, nextMessage) => {
  if (messages.some((message) => message._id === nextMessage._id)) {
    return messages;
  }

  return [...messages, nextMessage];
};

const normalizeMessageForViewer = (message, viewerUserId) => {
  return {
    ...message,
    isOwnMessage:
      (message.sender?._id || message.sender) === viewerUserId
  };
};

const removeMessageById = (currentMessages, messageId) => {
  return currentMessages.filter((message) => message._id !== messageId);
};

const sortConversations = (currentConversations) => {
  return [...currentConversations].sort((firstConversation, secondConversation) => {
    const firstDate =
      firstConversation.lastMessage?.createdAt || firstConversation.user.lastSeen || 0;
    const secondDate =
      secondConversation.lastMessage?.createdAt || secondConversation.user.lastSeen || 0;

    return new Date(secondDate) - new Date(firstDate);
  });
};

const formatPresence = (contact) => {
  if (contact?.isOnline) {
    return "Online";
  }

  if (!contact?.lastSeen) {
    return "Offline";
  }

  return `Last seen ${new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric"
  }).format(new Date(contact.lastSeen))}`;
};

const renderMessageContent = (content = "") => {
  const segments = content.split(/(https?:\/\/[^\s]+)/g);

  return segments.map((segment, index) => {
    if (/^https?:\/\/[^\s]+$/i.test(segment)) {
      return (
        <a key={`${segment}-${index}`} href={segment} target="_blank" rel="noreferrer">
          {segment}
        </a>
      );
    }

    return <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>;
  });
};

export default function MessagesPage() {
  const router = useRouter();
  const authState = useSelector((state) => state.auth);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const selectedUserIdRef = useRef("");

  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [typingMessage, setTypingMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const token = getAccessToken();
  const viewerUserId = authState.user?.userId?._id || "";

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  const loadSidebar = useCallback(async () => {
    if (!token) {
      router.push("/login");
      return;
    }

    const response = await clientServer.get("/chat/sidebar", {
      params: {
        token
      }
    });

    setConversations(response.data.data.conversations);

    if (!selectedUserId && response.data.data.conversations.length > 0) {
      const firstConversation = response.data.data.conversations[0];
      setSelectedUserId(firstConversation.user._id);
      setSelectedContact(firstConversation.user);
    }

    setIsLoading(false);
  }, [router, selectedUserId, token]);

  const loadMessages = useCallback(async (userId) => {
    if (!userId) {
      return;
    }

    const response = await clientServer.get(`/chat/messages/${userId}`, {
      params: {
        token
      }
    });

    setSelectedContact(response.data.data.contact);
    setMessages(
      response.data.data.messages.map((message) =>
        normalizeMessageForViewer(message, viewerUserId)
      )
    );
    socketRef.current?.emit("join_room", {
      otherUserId: userId
    });
  }, [token, viewerUserId]);

  const handleDeletePayload = useCallback((payload) => {
    if (!payload?.messageId) {
      return;
    }

    if (payload.contactUserId === selectedUserIdRef.current) {
      setMessages((currentMessages) =>
        removeMessageById(currentMessages, payload.messageId)
      );
    }

    setConversations((currentConversations) =>
      sortConversations(
        currentConversations.map((conversation) =>
          conversation.user._id === payload.contactUserId
            ? {
                ...conversation,
                lastMessage: payload.lastMessage || null
              }
            : conversation
        )
      )
    );
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSidebar();
  }, [loadSidebar]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages(selectedUserId);
  }, [loadMessages, selectedUserId]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(BASE_URL, {
      auth: {
        token
      }
    });

    socketRef.current = socket;

    socket.on("presence:update", (payload) => {
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.user._id === payload.userId
            ? {
                ...conversation,
                user: {
                  ...conversation.user,
                  isOnline: payload.isOnline,
                  lastSeen: payload.lastSeen
                }
              }
            : conversation
        )
      );

      if (selectedUserIdRef.current === payload.userId) {
        setSelectedContact((currentContact) =>
          currentContact
            ? {
                ...currentContact,
                isOnline: payload.isOnline,
                lastSeen: payload.lastSeen
              }
            : currentContact
        );
      }
    });

    socket.on("typing", (payload) => {
      if (payload.userId === selectedUserIdRef.current && payload.isTyping) {
        setTypingMessage("Typing...");
      } else if (payload.userId === selectedUserIdRef.current) {
        setTypingMessage("");
      }
    });

    socket.on("message_received", (payload) => {
      const incomingUserId =
        payload.sender?._id === authState.user?.userId?._id
          ? payload.receiver?._id
          : payload.sender?._id;

      setConversations((currentConversations) => {
        const existingConversation = currentConversations.find(
          (conversation) => conversation.user._id === incomingUserId
        );

        if (!existingConversation) {
          return currentConversations;
        }

        return [
          {
            ...existingConversation,
            lastMessage: payload
          },
          ...currentConversations.filter(
            (conversation) => conversation.user._id !== incomingUserId
          )
        ];
      });

      if (
        payload.sender?._id === selectedUserIdRef.current ||
        payload.receiver?._id === selectedUserIdRef.current
      ) {
        setMessages((currentMessages) =>
          upsertMessage(
            currentMessages,
            normalizeMessageForViewer(payload, viewerUserId)
          )
        );
      }
    });

    socket.on("message_deleted", (payload) => {
      handleDeletePayload(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [authState.user?.userId?._id, handleDeletePayload, token, viewerUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, typingMessage]);

  const handleTyping = (nextValue) => {
    setMessageText(nextValue);

    if (!selectedUserId) {
      return;
    }

    socketRef.current?.emit("typing", {
      otherUserId: selectedUserId
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", {
        otherUserId: selectedUserId
      });
    }, 1200);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedUserId) {
      return;
    }

    socketRef.current?.emit(
      "send_message",
      {
        receiverId: selectedUserId,
        content: messageText
      },
      (acknowledgement) => {
        if (acknowledgement?.success) {
          setMessages((currentMessages) =>
            upsertMessage(
              currentMessages,
              normalizeMessageForViewer(acknowledgement.data.message, viewerUserId)
            )
          );
          setMessageText("");
          setTypingMessage("");
        }
      }
    );

    socketRef.current?.emit("stop_typing", {
      otherUserId: selectedUserId
    });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) {
      return;
    }

    if (!window.confirm("Delete this message for both participants?")) {
      return;
    }

    try {
      const response = await clientServer.delete(`/chat/messages/${messageId}`, {
        params: {
          token
        }
      });

      handleDeletePayload(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.page}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <h2>Messages</h2>
              <p>Chat with your accepted connections in real time.</p>
            </div>

            <div className={styles.sidebarList}>
              {isLoading && <p>Loading conversations...</p>}

              {!isLoading && conversations.length === 0 && (
                <p>No accepted connections are available for chat yet.</p>
              )}

              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.user._id}
                  className={
                    selectedUserId === conversation.user._id
                      ? styles.conversationActive
                      : styles.conversationCard
                  }
                  onClick={() => {
                    setSelectedUserId(conversation.user._id);
                    setSelectedContact(conversation.user);
                    setTypingMessage("");
                  }}
                >
                  <img
                    src={getUploadUrl(conversation.user.profilePicture)}
                    alt={conversation.user.name}
                    onError={applyAvatarFallback}
                  />
                  <div className={styles.conversationText}>
                    <div className={styles.conversationTitle}>
                      <span>{conversation.user.name}</span>
                      <span
                        className={
                          conversation.user.isOnline
                            ? styles.onlineDot
                            : styles.offlineDot
                        }
                      ></span>
                    </div>
                    <p>@{conversation.user.username}</p>
                    <p className={styles.previewText}>
                      {conversation.lastMessage?.content || "Start the conversation"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.chatPanel}>
            {selectedContact ? (
              <>
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderInfo}>
                    <img
                      src={getUploadUrl(selectedContact.profilePicture)}
                      alt={selectedContact.name}
                      onError={applyAvatarFallback}
                    />
                    <div>
                      <h3>{selectedContact.name}</h3>
                      <p>@{selectedContact.username}</p>
                      <span>{formatPresence(selectedContact)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.messageList}>
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={
                        message.isOwnMessage ? styles.ownMessage : styles.otherMessage
                      }
                    >
                      {message.isOwnMessage && (
                        <button
                          type="button"
                          className={styles.messageDeleteButton}
                          onClick={() => {
                            handleDeleteMessage(message._id);
                          }}
                        >
                          Delete
                        </button>
                      )}
                      <p>{renderMessageContent(message.content)}</p>
                      <span>
                        {new Intl.DateTimeFormat("en-IN", {
                          hour: "numeric",
                          minute: "numeric"
                        }).format(new Date(message.createdAt))}
                      </span>
                    </div>
                  ))}

                  {!typingMessage && messages.length === 0 && (
                    <div className={styles.emptyMessages}>
                      No messages yet. Start the conversation from here.
                    </div>
                  )}

                  {typingMessage && (
                    <div className={styles.typingIndicator}>{typingMessage}</div>
                  )}
                  <div ref={messagesEndRef}></div>
                </div>

                <div className={styles.chatComposer}>
                  <textarea
                    value={messageText}
                    onChange={(event) => handleTyping(event.target.value)}
                    placeholder="Write a message"
                  />
                  <button type="button" onClick={handleSendMessage}>
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyPanel}>
                Select a contact to start chatting.
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
