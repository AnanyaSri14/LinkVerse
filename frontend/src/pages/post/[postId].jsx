import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  applyAvatarFallback,
  clientServer,
  getAccessToken,
  getUploadUrl,
  hideBrokenMedia
} from "@/config";
import UserLayout from "@/layout/UserLayout";
import styles from "./index.module.css";

const formatPostDate = (dateValue) => {
  if (!dateValue) {
    return "Recently shared";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
};

export default function PublicPostPage() {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!router.isReady || !router.query.postId) {
      return;
    }

    const loadPost = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await clientServer.get(`/post/public/${router.query.postId}`);
        setPost(response.data.data.post);
      } catch (error) {
        setErrorMessage(
          error?.response?.data?.message || "Unable to load this shared post"
        );
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [router.isReady, router.query.postId]);

  const primaryAction = useMemo(() => {
    return getAccessToken()
      ? {
          label: "Open your dashboard",
          href: "/dashboard"
        }
      : {
          label: "Sign in to LinkVerse",
          href: "/login?mode=signin"
        };
  }, []);

  return (
    <UserLayout>
      <div className={styles.page}>
        <section className={styles.heroCard}>
          <p className={styles.eyebrow}>Shared from LinkVerse</p>
          <h1>Open the post your network shared with you.</h1>
          <p className={styles.heroCopy}>
            See the original post, explore the author, and continue the conversation on
            LinkVerse.
          </p>
        </section>

        {loading && <div className={styles.stateCard}>Loading post...</div>}

        {!loading && errorMessage && (
          <div className={styles.stateCard}>{errorMessage}</div>
        )}

        {!loading && post && (
          <article className={styles.postCard}>
            <div className={styles.postHeader}>
              <div className={styles.authorRow}>
                <img
                  src={getUploadUrl(post.userId?.profilePicture)}
                  alt={post.userId?.name || "profile"}
                  onError={applyAvatarFallback}
                />
                <div>
                  <h2>{post.userId?.name || "LinkVerse Member"}</h2>
                  <p>@{post.userId?.username || "username"}</p>
                  <span>{formatPostDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            <p className={styles.postBody}>{post.content || post.body}</p>

            {(post.media || post.image) && (
              <div className={styles.imageFrame}>
                <img
                  src={getUploadUrl(post.media || post.image)}
                  alt={post.content || post.body || "shared post"}
                  className={styles.postImage}
                  onError={hideBrokenMedia}
                />
              </div>
            )}

            <div className={styles.statsRow}>
              <span>{post.likes || 0} likes</span>
              <span>{post.commentsCount || 0} comments</span>
              <span>{post.sharesCount || 0} shares</span>
            </div>

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => router.push(primaryAction.href)}
              >
                {primaryAction.label}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() =>
                  router.push(`/view_profile/${post.userId?.username || ""}`)
                }
              >
                View author profile
              </button>
            </div>
          </article>
        )}
      </div>
    </UserLayout>
  );
}
