import UserLayout from "@/layout/UserLayout";
import DashboardLayout from "@/layout/DashboardLayout";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getAboutUser, getAllUsers } from "@/config/redux/action/authAction";
import styles from "./index.module.css";
import { applyAvatarFallback, getUploadUrl } from "@/config";
import { useRouter } from "next/router";

export default function Discoverpage() {
  const authState = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    if (!authState.profileFetched) {
      dispatch(getAboutUser({ token }));
    }

    if (!authState.all_profiles_fetched) {
      dispatch(getAllUsers());
    }
  }, [authState.all_profiles_fetched, authState.profileFetched, dispatch]);

  const visibleProfiles = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return (authState.all_users || [])
      .filter((profile) => profile?.userId?._id !== authState.user?.userId?._id)
      .filter((profile) => {
        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          profile?.userId?.name,
          profile?.userId?.username,
          profile?.tagline,
          profile?.domain,
          profile?.location
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      });
  }, [authState.all_users, authState.user?.userId?._id, searchText]);

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.page}>
          <div className={styles.heroCard}>
            <div>
              <h1>Discover</h1>
              <p>
                Search people by name, username, or professional focus and explore
                richer profiles faster.
              </p>
            </div>

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className={styles.searchInput}
              placeholder="Search by name, username, location, or domain"
            />
          </div>

          <div className={styles.grid}>
            {visibleProfiles.map((user) => {
              return (
                <article
                  onClick={() => {
                    router.push(`/view_profile/${user.userId.username}`);
                  }}
                  key={user._id}
                  className={styles.userCard}
                >
                  <div className={styles.userHeader}>
                    <img
                      className={styles.userCard__image}
                      src={getUploadUrl(user.userId.profilePicture)}
                      alt={user.userId.name}
                      onError={applyAvatarFallback}
                    />

                    <div className={styles.identityBlock}>
                      <h2>{user.userId.name}</h2>
                      <p>@{user.userId.username}</p>
                    </div>
                  </div>

                  <p className={styles.tagline}>
                    {user.tagline || user.currentPost || "Professional tagline coming soon"}
                  </p>

                  <p className={styles.about}>
                    {user.about || user.bio || "No summary added yet."}
                  </p>

                  <div className={styles.metaRow}>
                    {user.location && <span>{user.location}</span>}
                    {user.domain && <span>{user.domain}</span>}
                  </div>

                  <div className={styles.cardFooter}>
                    <span>{(user.skills || []).length} skills</span>
                    <button type="button">View Profile</button>
                  </div>
                </article>
              );
            })}
          </div>

          {authState.all_profiles_fetched && visibleProfiles.length === 0 && (
            <div className={styles.emptyState}>
              No profiles match your search yet.
            </div>
          )}
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}
