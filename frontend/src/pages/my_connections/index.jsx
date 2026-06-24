import UserLayout from "@/layout/UserLayout";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import styles from "./index.module.css";
import { applyAvatarFallback, getUploadUrl } from "@/config";
import { useRouter } from "next/router";
import {
  fetchConnections,
  respondToConnectionRequest,
  getConnectionSuggestions,
  getAboutUser,
  sendConnectionRequest
} from "@/config/redux/action/authAction";
import DashboardLayout from "@/layout/DashboardLayout";

const FILTER_CONFIG = [
  {
    key: "received",
    label: "Received"
  },
  {
    key: "sent",
    label: "Sent"
  },
  {
    key: "accepted",
    label: "Accepted"
  }
];

export default function MyConnectionsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const authState = useSelector((state) => state.auth);
  const [activeFilter, setActiveFilter] = useState("received");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    dispatch(fetchConnections({ token }));
    dispatch(getConnectionSuggestions({ token }));

    if (!authState.user?.userId?._id) {
      dispatch(getAboutUser({ token }));
    }
  }, [authState.user?.userId?._id, dispatch]);

  const groupedConnections = {
    received: authState.connections.filter(
      (connection) =>
        connection.status === "pending" && connection.direction === "received"
    ),
    sent: authState.connections.filter(
      (connection) =>
        connection.status === "pending" && connection.direction === "sent"
    ),
    accepted: authState.connections.filter(
      (connection) => connection.status === "accepted"
    )
  };

  const activeConnections = groupedConnections[activeFilter] || [];
  const activeLabel =
    FILTER_CONFIG.find((filter) => filter.key === activeFilter)?.label || "Connections";

  const refreshConnectionData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(fetchConnections({ token }));
    await dispatch(getConnectionSuggestions({ token }));
  };

  const handleConnectionAction = async (event, connectionId, action) => {
    event.stopPropagation();

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(
      respondToConnectionRequest({
        connectionId,
        token,
        action
      })
    );
  };

  const handleSuggestionConnect = async (event, userId) => {
    event.stopPropagation();

    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    await dispatch(
      sendConnectionRequest({
        token,
        connectionId: userId
      })
    );
  };

  const renderActionButtons = (connection) => {
    if (activeFilter === "received") {
      return (
        <div className={styles.actionButtons}>
          <button
            onClick={(event) => {
              handleConnectionAction(event, connection._id, "accept");
            }}
            className={styles.primaryButton}
          >
            Accept
          </button>
          <button
            onClick={(event) => {
              handleConnectionAction(event, connection._id, "reject");
            }}
            className={styles.secondaryButton}
          >
            Reject
          </button>
        </div>
      );
    }

    if (activeFilter === "sent") {
      return (
        <div className={styles.actionButtons}>
          <button
            onClick={(event) => {
              handleConnectionAction(event, connection._id, "cancel");
            }}
            className={styles.secondaryButton}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className={styles.actionButtons}>
        <span className={styles.statusBadge}>Connected</span>
      </div>
    );
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.pageContainer}>
          <div className={styles.headerRow}>
            <div>
              <h2>My Connections</h2>
              <p className={styles.subTitle}>
                Track incoming requests, sent invites, and accepted connections.
              </p>
            </div>
            <button onClick={refreshConnectionData} className={styles.refreshButton}>
              Refresh
            </button>
          </div>

          <div className={styles.filterBar}>
            {FILTER_CONFIG.map((filter) => (
              <button
                key={filter.key}
                className={
                  activeFilter === filter.key
                    ? `${styles.filterButton} ${styles.filterButtonActive}`
                    : styles.filterButton
                }
                onClick={() => {
                  setActiveFilter(filter.key);
                }}
              >
                {filter.label}
                <span className={styles.filterCount}>
                  {authState.connectionCounts[filter.key] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3>{activeLabel}</h3>
              <span className={styles.sectionCount}>
                {activeConnections.length} result
                {activeConnections.length === 1 ? "" : "s"}
              </span>
            </div>

            {activeConnections.length === 0 ? (
              <div className={styles.emptyState}>
                No {activeLabel.toLowerCase()} connections available right now.
              </div>
            ) : (
              <div className={styles.connectionList}>
                {activeConnections.map((connection) => {
                  const otherUser = connection.otherUser;

                  return (
                    <div
                      key={connection._id}
                      onClick={() => {
                        if (!otherUser?.username) {
                          return;
                        }

                        router.push(`/view_profile/${otherUser.username}`);
                      }}
                      className={styles.userCard}
                    >
                      <div className={styles.cardBody}>
                        <div className={styles.profilePicture}>
                          <img
                            src={getUploadUrl(otherUser?.profilePicture)}
                            alt={otherUser?.name || "Connection user"}
                            onError={applyAvatarFallback}
                          />
                        </div>

                        <div className={styles.userInfo}>
                          <h3>{otherUser?.name}</h3>
                          <p>@{otherUser?.username}</p>

                          {connection.mutualConnections > 0 && (
                            <p className={styles.metaText}>
                              {connection.mutualConnections} mutual connection
                              {connection.mutualConnections === 1 ? "" : "s"}
                            </p>
                          )}

                          {renderActionButtons(connection)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3>People You May Know</h3>
              <span className={styles.sectionCount}>
                {authState.connectionSuggestions.length} suggestion
                {authState.connectionSuggestions.length === 1 ? "" : "s"}
              </span>
            </div>

            {authState.connectionSuggestions.length === 0 ? (
              <div className={styles.emptyState}>
                No fresh suggestions right now. Check back after you make more connections.
              </div>
            ) : (
              <div className={styles.suggestionsGrid}>
                {authState.connectionSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.user._id}
                    className={styles.suggestionCard}
                    onClick={() => {
                      router.push(`/view_profile/${suggestion.user.username}`);
                    }}
                  >
                    <img
                      className={styles.suggestionAvatar}
                      src={getUploadUrl(suggestion.user.profilePicture)}
                      alt={suggestion.user.name}
                      onError={applyAvatarFallback}
                    />
                    <h4>{suggestion.user.name}</h4>
                    <p>@{suggestion.user.username}</p>
                    <p className={styles.metaText}>
                      {suggestion.mutualConnections} mutual connection
                      {suggestion.mutualConnections === 1 ? "" : "s"}
                    </p>
                    <button
                      onClick={(event) => {
                        handleSuggestionConnect(event, suggestion.user._id);
                      }}
                      className={styles.primaryButton}
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
