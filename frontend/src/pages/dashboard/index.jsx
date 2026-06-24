import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import {
  getAboutUser,
  getAllUsers
} from "@/config/redux/action/authAction";
import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import { setTokenIsThere } from "@/config/redux/reducer/authReducer";
import styles from "./index.module.css";
import { applyAvatarFallback, getUploadUrl, hideBrokenMedia } from "@/config";
import {
  fetchFeed,
  createPost,
  updatePost,
  deletePost,
  togglePostLike,
  sharePost,
  sharePostInternally,
  getAllComments,
  postComment
} from "@/config/redux/action/postAction";
import {
  resetPostId,
  setFeedFilter
} from "@/config/redux/reducer/postReducer";

const feedOptions = [
  { label: "Latest", value: "latest" },
  { label: "Trending", value: "trending" },
  { label: "Connections", value: "connections" }
];

const formatPostDate = (dateValue) => {
  if (!dateValue) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
};

const copyTextToClipboard = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Unable to copy the share link");
  }
};

const truncateText = (text, limit = 180) => {
  if (!text) {
    return "";
  }

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit).trim()}...`;
};

const getPostShareDetails = (post, origin) => {
  const authorName = post.userId?.name || "A LinkVerse member";
  const postText = (post.content || post.body || "").trim();
  const postUrl = `${origin}/post/${post._id}`;
  const shareTitle = `${authorName} on LinkVerse`;
  const shareText = postText
    ? `${authorName} shared a post on LinkVerse:\n\n${postText}\n\nOpen post: ${postUrl}`
    : `${authorName} shared a post on LinkVerse:\n\n${postUrl}`;
  const internalShareText = postText
    ? `${authorName} shared a LinkVerse post with you:\n\n${postText}\n\nOpen post: ${postUrl}`
    : `${authorName} shared a LinkVerse post with you:\n\n${postUrl}`;

  return {
    authorName,
    postText,
    postUrl,
    shareTitle,
    shareText,
    internalShareText,
    previewText: truncateText(postText || "Open this shared LinkVerse post")
  };
};

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);
  const postState = useSelector((state) => state.postReducer);
  const loadMoreRef = useRef(null);
  const shareTimeoutsRef = useRef({});

  const [postContent, setPostContent] = useState("");
  const [fileContent, setFileContent] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [editingPostId, setEditingPostId] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [removeEditMedia, setRemoveEditMedia] = useState(false);
  const [shareFeedback, setShareFeedback] = useState({});
  const [shareDialogPost, setShareDialogPost] = useState(null);
  const [shareSearchTerm, setShareSearchTerm] = useState("");
  const [shareRecipientLoading, setShareRecipientLoading] = useState({});

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const currentUserId = authState.user?.userId?._id;
  const deferredShareSearchTerm = useDeferredValue(shareSearchTerm);

  const loadFeed = useCallback(
    (page = 1, append = false, filter = postState.feedFilter) => {
      if (!token) {
        return;
      }

      dispatch(
        fetchFeed({
          token,
          filter,
          page,
          append
        })
      );
    },
    [dispatch, postState.feedFilter, token]
  );

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    dispatch(setTokenIsThere());
  }, [dispatch, router, token]);

  useEffect(() => {
    if (!authState.isTokenThere || !token) {
      return;
    }

    if (!authState.profileFetched) {
      dispatch(getAboutUser({ token }));
    }
  }, [authState.isTokenThere, authState.profileFetched, dispatch, token]);

  useEffect(() => {
    if (!authState.isTokenThere || !token || authState.all_profiles_fetched) {
      return;
    }

    dispatch(getAllUsers());
  }, [authState.all_profiles_fetched, authState.isTokenThere, dispatch, token]);

  useEffect(() => {
    if (!authState.isTokenThere || !token) {
      return;
    }

    loadFeed(1, false, postState.feedFilter);
  }, [authState.isTokenThere, loadFeed, postState.feedFilter, token]);

  useEffect(() => {
    if (!loadMoreRef.current || !postState.hasMore || postState.feedLoading) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFeed(postState.page + 1, true);
        }
      },
      {
        threshold: 0.2
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadFeed, postState.feedLoading, postState.hasMore, postState.page]);

  useEffect(() => {
    const shareTimeouts = shareTimeoutsRef.current;

    return () => {
      Object.values(shareTimeouts).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  const setShareFeedbackMessage = useCallback((postId, message) => {
    setShareFeedback((currentFeedback) => ({
      ...currentFeedback,
      [postId]: message
    }));

    if (shareTimeoutsRef.current[postId]) {
      clearTimeout(shareTimeoutsRef.current[postId]);
    }

    shareTimeoutsRef.current[postId] = setTimeout(() => {
      setShareFeedback((currentFeedback) => {
        const nextFeedback = { ...currentFeedback };
        delete nextFeedback[postId];
        return nextFeedback;
      });

      delete shareTimeoutsRef.current[postId];
    }, 2500);
  }, []);

  const handleUpload = async () => {
    if (!postContent.trim() && !fileContent) {
      return;
    }

    await dispatch(
      createPost({
        token,
        content: postContent,
        file: fileContent
      })
    );

    setPostContent("");
    setFileContent(null);
  };

  const handleDeletePost = async (postId) => {
    await dispatch(deletePost({ token, postId }));
  };

  const handleToggleLike = async (postId) => {
    await dispatch(
      togglePostLike({
        token,
        postId,
        currentUserId
      })
    );
  };

  const handleOpenComments = async (postId) => {
    await dispatch(getAllComments({ postId }));
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !postState.postId) {
      return;
    }

    await dispatch(
      postComment({
        token,
        postId: postState.postId,
        body: commentText
      })
    );

    setCommentText("");
  };

  const startEditingPost = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content || post.body || "");
    setEditFile(null);
    setRemoveEditMedia(false);
  };

  const cancelEditingPost = () => {
    setEditingPostId("");
    setEditContent("");
    setEditFile(null);
    setRemoveEditMedia(false);
  };

  const handleSaveEditedPost = async () => {
    if (!editingPostId) {
      return;
    }

    await dispatch(
      updatePost({
        token,
        postId: editingPostId,
        content: editContent,
        file: editFile,
        removeMedia: removeEditMedia
      })
    );

    cancelEditingPost();
  };

  const shareDialogDetails = useMemo(() => {
    if (!shareDialogPost || typeof window === "undefined") {
      return null;
    }

    return getPostShareDetails(shareDialogPost, window.location.origin);
  }, [shareDialogPost]);

  const shareableProfiles = useMemo(() => {
    const normalizedQuery = deferredShareSearchTerm.trim().toLowerCase();
    const uniqueProfiles = [];
    const seenUserIds = new Set();

    authState.all_users.forEach((profile) => {
      const userId = profile?.userId?._id;

      if (!userId || userId === currentUserId || seenUserIds.has(userId)) {
        return;
      }

      seenUserIds.add(userId);
      uniqueProfiles.push(profile);
    });

    const sortedProfiles = uniqueProfiles.sort((firstProfile, secondProfile) => {
      return (firstProfile.userId?.name || "").localeCompare(
        secondProfile.userId?.name || ""
      );
    });

    if (!normalizedQuery) {
      return sortedProfiles;
    }

    return sortedProfiles.filter((profile) => {
      const name = profile.userId?.name?.toLowerCase() || "";
      const username = profile.userId?.username?.toLowerCase() || "";
      return name.includes(normalizedQuery) || username.includes(normalizedQuery);
    });
  }, [authState.all_users, currentUserId, deferredShareSearchTerm]);

  const syncSharedPostInDialog = useCallback((nextPost) => {
    if (!nextPost?._id) {
      return;
    }

    setShareDialogPost((currentPost) =>
      currentPost && currentPost._id === nextPost._id ? nextPost : currentPost
    );
  }, []);

  const openShareDialog = (post) => {
    setShareDialogPost(post);
    setShareSearchTerm("");
  };

  const closeShareDialog = () => {
    setShareDialogPost(null);
    setShareSearchTerm("");
    setShareRecipientLoading({});
  };

  const trackExternalShare = useCallback(async (postId, successMessage) => {
    const shareResult = await dispatch(
      sharePost({
        token,
        postId
      })
    );

    if (sharePost.rejected.match(shareResult)) {
      throw new Error(shareResult.payload || "Unable to update share count");
    }

    syncSharedPostInDialog(shareResult.payload);
    setShareFeedbackMessage(postId, successMessage);
  }, [dispatch, setShareFeedbackMessage, syncSharedPostInDialog, token]);

  const handleExternalShare = async (channel) => {
    if (!shareDialogPost || !shareDialogDetails) {
      return;
    }

    try {
      if (channel === "copy") {
        await copyTextToClipboard(shareDialogDetails.postUrl);
        await trackExternalShare(shareDialogPost._id, "Link copied");
        return;
      }

      if (channel === "gmail") {
        window.open(
          `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
            shareDialogDetails.shareTitle
          )}&body=${encodeURIComponent(shareDialogDetails.shareText)}`,
          "_blank",
          "noopener,noreferrer"
        );
        await trackExternalShare(shareDialogPost._id, "Opened Gmail");
        return;
      }

      if (channel === "whatsapp") {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareDialogDetails.shareText)}`,
          "_blank",
          "noopener,noreferrer"
        );
        await trackExternalShare(shareDialogPost._id, "Opened WhatsApp");
        return;
      }

      if (channel === "native") {
        if (navigator.share) {
          await navigator.share({
            title: shareDialogDetails.shareTitle,
            text: shareDialogDetails.postText || "Check out this LinkVerse post",
            url: shareDialogDetails.postUrl
          });
          await trackExternalShare(shareDialogPost._id, "Shared");
          return;
        }

        await copyTextToClipboard(shareDialogDetails.shareText);
        await trackExternalShare(shareDialogPost._id, "Link copied");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error(error);
      setShareFeedbackMessage(shareDialogPost._id, "Share failed");
    }
  };

  const handleShareToLinkVerseUser = async (profile) => {
    if (!shareDialogPost || !shareDialogDetails || !profile?.userId?._id) {
      return;
    }

    const recipientId = profile.userId._id;

    setShareRecipientLoading((currentState) => ({
      ...currentState,
      [recipientId]: true
    }));

    try {
      const shareResult = await dispatch(
        sharePostInternally({
          token,
          postId: shareDialogPost._id,
          recipientIds: [recipientId],
          shareUrl: shareDialogDetails.postUrl,
          shareText: shareDialogDetails.internalShareText
        })
      );

      if (sharePostInternally.rejected.match(shareResult)) {
        throw new Error(
          shareResult.payload || "Unable to share post with this LinkVerse user"
        );
      }

      syncSharedPostInDialog(shareResult.payload);
      setShareFeedbackMessage(
        shareDialogPost._id,
        `Shared with ${profile.userId.name}`
      );
    } catch (error) {
      console.error(error);
      setShareFeedbackMessage(shareDialogPost._id, "Internal share failed");
    } finally {
      setShareRecipientLoading((currentState) => {
        const nextState = { ...currentState };
        delete nextState[recipientId];
        return nextState;
      });
    }
  };

  const composerSummary = useMemo(() => {
    if (!fileContent) {
      return "You can post text, an image, or both.";
    }

    return `Selected file: ${fileContent.name}`;
  }, [fileContent]);

  if (!authState.user) {
    return (
      <UserLayout>
        <DashboardLayout>
          <div className={styles.loadingState}>Loading your feed...</div>
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.page}>
          <section className={styles.composerCard}>
            <div className={styles.composerHeader}>
              <div className={styles.composerProfileRow}>
                <img
                  className={styles.userProfile}
                  src={getUploadUrl(authState.user.userId?.profilePicture)}
                  alt={authState.user.userId?.name || "profile"}
                  onError={applyAvatarFallback}
                />
                <div className={styles.composerIdentity}>
                  <p className={styles.nameText}>
                    {authState.user.userId?.name || "LinkVerse Member"}
                  </p>
                  <p className={styles.handleText}>
                    @{authState.user.userId?.username || "username"}
                  </p>
                  <p className={styles.composerMetaText}>Posting as you</p>
                </div>
              </div>

              <div className={styles.composerPromptBlock}>
                <h2>Share something with your network</h2>
                <p>{composerSummary}</p>
              </div>
            </div>

            <textarea
              onChange={(event) => setPostContent(event.target.value)}
              value={postContent}
              placeholder="What are you building, learning, or celebrating today?"
              className={styles.textAreaOfContent}
            />

            <div className={styles.composerFooter}>
              <label htmlFor="fileUpload" className={styles.filePicker}>
                Add image
              </label>
              <input
                onChange={(event) => setFileContent(event.target.files?.[0] || null)}
                type="file"
                accept="image/*"
                hidden
                id="fileUpload"
              />

              <button
                onClick={handleUpload}
                className={styles.primaryButton}
                disabled={postState.actionLoading}
                type="button"
              >
                {postState.actionLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </section>

          <section className={styles.feedCard}>
            <div className={styles.feedHeader}>
              <div>
                <h2>Network Feed</h2>
                <p>Switch between the newest updates, trending posts, and your connections.</p>
              </div>

              <div className={styles.filterGroup}>
                {feedOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      postState.feedFilter === option.value
                        ? styles.filterButtonActive
                        : styles.filterButton
                    }
                    onClick={() => {
                      if (postState.feedFilter !== option.value) {
                        dispatch(setFeedFilter(option.value));
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.postsContainer}>
              {postState.posts.map((post) => {
                const isOwnPost = post?.userId?._id === currentUserId;
                const isEditing = editingPostId === post._id;

                return (
                  <article key={post._id} className={styles.singleCard}>
                    <div className={styles.singleCardHeader}>
                      <div className={styles.profileRow}>
                        <img
                          className={styles.singleCard__userProfile}
                          src={getUploadUrl(post.userId?.profilePicture)}
                          alt={post.userId?.name || "profile"}
                          onError={applyAvatarFallback}
                        />
                        <div className={styles.profileIdentity}>
                          <div className={styles.profileNameRow}>
                            <p className={styles.nameText}>{post.userId?.name}</p>
                            {isOwnPost && <span className={styles.authorBadge}>You</span>}
                          </div>
                          <p className={styles.handleText}>@{post.userId?.username}</p>
                          <p className={styles.timeText}>{formatPostDate(post.createdAt)}</p>
                        </div>
                      </div>

                      {isOwnPost && (
                        <div className={styles.ownerActions}>
                          <button
                            type="button"
                            onClick={() => startEditingPost(post)}
                            className={styles.inlineAction}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post._id)}
                            className={styles.inlineDanger}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className={styles.editContainer}>
                        <textarea
                          className={styles.textAreaOfContent}
                          value={editContent}
                          onChange={(event) => setEditContent(event.target.value)}
                        />
                        <div className={styles.editRow}>
                          <label className={styles.filePicker} htmlFor={`edit-${post._id}`}>
                            Replace image
                          </label>
                          <input
                            id={`edit-${post._id}`}
                            hidden
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              setEditFile(event.target.files?.[0] || null)
                            }
                          />
                          {(post.media || post.image) && (
                            <label className={styles.checkboxRow}>
                              <input
                                type="checkbox"
                                checked={removeEditMedia}
                                onChange={(event) =>
                                  setRemoveEditMedia(event.target.checked)
                                }
                              />
                              Remove current image
                            </label>
                          )}
                        </div>
                        <div className={styles.editActions}>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={handleSaveEditedPost}
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={cancelEditingPost}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={styles.postBody}>{post.content || post.body}</p>

                        {(post.media || post.image) && (
                          <div className={styles.singleCard__image}>
                            <img
                              className={styles.postImage}
                              src={getUploadUrl(post.media || post.image)}
                              alt={post.content || post.body || "post"}
                              onError={hideBrokenMedia}
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div className={styles.statsRow}>
                      <span>{post.likes || 0} likes</span>
                      <span>{post.commentsCount || 0} comments</span>
                      <span>{post.sharesCount || 0} shares</span>
                    </div>

                    <div className={styles.optionsContainer}>
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post._id)}
                        className={
                          post.likedByCurrentUser
                            ? styles.singleOptionActive
                            : styles.singleOption
                        }
                      >
                        {post.likedByCurrentUser ? "Unlike" : "Like"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenComments(post._id)}
                        className={styles.singleOption}
                      >
                        Comment
                      </button>

                      <button
                        type="button"
                        onClick={() => openShareDialog(post)}
                        className={styles.singleOption}
                      >
                        {shareFeedback[post._id] || "Share"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {!postState.feedLoading && postState.posts.length === 0 && (
                <div className={styles.emptyState}>
                  No posts found for this feed yet. Try switching filters or create the first post.
                </div>
              )}

              {postState.feedLoading && (
                <div className={styles.loadingState}>Loading more posts...</div>
              )}

              <div ref={loadMoreRef} className={styles.loadMoreTrigger}></div>
            </div>
          </section>
        </div>

        {shareDialogPost && shareDialogDetails && (
          <div className={styles.shareModalOverlay} onClick={closeShareDialog}>
            <div
              className={styles.shareModal}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className={styles.shareModalHeader}>
                <div>
                  <h3>Share post</h3>
                  <p>Send this post inside LinkVerse or share it outside.</p>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeShareDialog}
                >
                  Close
                </button>
              </div>

              <div className={styles.sharePreviewCard}>
                <p className={styles.sharePreviewTitle}>{shareDialogDetails.authorName}</p>
                <p className={styles.sharePreviewBody}>{shareDialogDetails.previewText}</p>
                <a
                  href={shareDialogDetails.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sharePreviewLink}
                >
                  {shareDialogDetails.postUrl}
                </a>
              </div>

              <div className={styles.shareSection}>
                <div className={styles.shareSectionHeader}>
                  <div>
                    <h4>Share with LinkVerse users</h4>
                    <p>Send this post directly inside the app.</p>
                  </div>
                </div>

                <input
                  type="text"
                  value={shareSearchTerm}
                  onChange={(event) => setShareSearchTerm(event.target.value)}
                  className={styles.shareSearchInput}
                  placeholder="Search by name or username"
                />

                <div className={styles.shareRecipientList}>
                  {!authState.all_profiles_fetched && (
                    <p className={styles.shareEmptyState}>Loading LinkVerse users...</p>
                  )}

                  {authState.all_profiles_fetched && shareableProfiles.length === 0 && (
                    <p className={styles.shareEmptyState}>
                      No matching LinkVerse users found.
                    </p>
                  )}

                  {shareableProfiles.map((profile) => (
                    <div key={profile._id} className={styles.shareRecipientCard}>
                      <div className={styles.shareRecipientInfo}>
                        <img
                          src={getUploadUrl(profile.userId?.profilePicture)}
                          alt={profile.userId?.name || "profile"}
                          onError={applyAvatarFallback}
                        />
                        <div>
                          <p>{profile.userId?.name}</p>
                          <span>@{profile.userId?.username}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={Boolean(shareRecipientLoading[profile.userId?._id])}
                        onClick={() => handleShareToLinkVerseUser(profile)}
                      >
                        {shareRecipientLoading[profile.userId?._id]
                          ? "Sharing..."
                          : "Share"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.shareSection}>
                <div className={styles.shareSectionHeader}>
                  <div>
                    <h4>Share outside LinkVerse</h4>
                    <p>Open your preferred channel with this post link ready to send.</p>
                  </div>
                </div>

                <div className={styles.shareActionGrid}>
                  <button
                    type="button"
                    className={styles.shareActionButton}
                    onClick={() => handleExternalShare("copy")}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className={styles.shareActionButton}
                    onClick={() => handleExternalShare("gmail")}
                  >
                    Gmail
                  </button>
                  <button
                    type="button"
                    className={styles.shareActionButton}
                    onClick={() => handleExternalShare("whatsapp")}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className={styles.shareActionButton}
                    onClick={() => handleExternalShare("native")}
                  >
                    More options
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {postState.postId !== "" && (
          <div
            onClick={() => {
              dispatch(resetPostId());
            }}
            className={styles.commentsContainer}
          >
            <div
              onClick={(event) => {
                event.stopPropagation();
              }}
              className={styles.allCommentsContainer}
            >
              <div className={styles.commentsHeader}>
                <div>
                  <h3>Comments</h3>
                  <p>Join the conversation around this post.</p>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    dispatch(resetPostId());
                  }}
                >
                  Close
                </button>
              </div>

              <div className={styles.commentsList}>
                {postState.comments.length === 0 && (
                  <p className={styles.emptyCommentState}>No comments yet.</p>
                )}

                {postState.comments.map((comment) => (
                  <div className={styles.singleComment} key={comment._id}>
                    <div className={styles.singleComment_profileContainer}>
                      <img
                        src={getUploadUrl(comment.userId?.profilePicture)}
                        alt={comment.userId?.name || "profile"}
                        onError={applyAvatarFallback}
                      />
                      <div>
                        <p className={styles.nameText}>{comment.userId?.name}</p>
                        <p className={styles.metaText}>@{comment.userId?.username}</p>
                      </div>
                    </div>
                    <p>{comment.body}</p>
                  </div>
                ))}
              </div>

              <div className={styles.postCommentContainer}>
                <input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment"
                />
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  className={styles.primaryButton}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </UserLayout>
  );
}
