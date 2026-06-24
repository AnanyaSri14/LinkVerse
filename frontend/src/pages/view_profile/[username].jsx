import React, { useEffect, useMemo } from "react";
import { clientServer } from "@/config/index";
import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import styles from "./index.module.css";
import { BASE_URL } from "@/config";
import { useRouter } from "next/router";
import { getAllPosts } from "@/config/redux/action/postAction";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchConnections,
  getAboutUser,
  sendConnectionRequest
} from "@/config/redux/action/authAction";

const mapLegacyExperience = (pastWork = []) => {
  return pastWork.map((work, index) => ({
    _id: `${work.company}-${index}`,
    company: work.company,
    role: work.position,
    duration: work.years,
    description: ""
  }));
};

export default function ViewProfilePage({ userProfile }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const authState = useSelector((state) => state.auth);
  const postReducer = useSelector((state) => state.postReducer);
  const connections = useSelector((state) => state.auth.connections) || [];

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    if (!authState.user) {
      dispatch(getAboutUser({ token }));
    }

    dispatch(
      getAllPosts({
        token,
        page: 1,
        limit: 50,
        filter: "latest"
      })
    );
    dispatch(
      fetchConnections({
        token
      })
    );
  }, [authState.user, dispatch]);

  const userPosts = useMemo(() => {
    return (postReducer.posts || [])
      .filter((post) => post.userId?.username === router.query.username)
      .slice(0, 3);
  }, [postReducer.posts, router.query.username]);

  const workExperience =
    userProfile.experience?.length > 0
      ? userProfile.experience
      : mapLegacyExperience(userProfile.pastWork || []);

  const isOwnProfile = authState.user?.userId?._id === userProfile.userId._id;

  const getConnectionPriority = (status) => {
    if (status === "accepted") return 3;
    if (status === "pending") return 2;
    if (status === "rejected") return 1;
    return 0;
  };

  const connection = connections.reduce((bestMatch, currentConnection) => {
    const isMatchingConnection =
      currentConnection.otherUserId === userProfile.userId._id ||
      currentConnection.sender?._id === userProfile.userId._id ||
      currentConnection.receiver?._id === userProfile.userId._id;

    if (!isMatchingConnection) {
      return bestMatch;
    }

    if (!bestMatch) {
      return currentConnection;
    }

    return getConnectionPriority(currentConnection.status) >
      getConnectionPriority(bestMatch.status)
      ? currentConnection
      : bestMatch;
  }, null);

  let buttonText = "Connect";

  if (isOwnProfile) {
    buttonText = "Edit Profile";
  } else if (connection) {
    if (connection.status === "pending" && connection.direction === "received") {
      buttonText = "Review Request";
    } else if (connection.status === "pending") {
      buttonText = "Pending";
    } else if (connection.status === "accepted") {
      buttonText = "Connected";
    }
  }

  const handleProfileAction = async () => {
    const token = localStorage.getItem("token");

    if (buttonText === "Edit Profile") {
      router.push("/profile");
      return;
    }

    if (buttonText === "Review Request") {
      router.push("/my_connections");
      return;
    }

    if (buttonText !== "Connect" || !token) {
      return;
    }

    await dispatch(
      sendConnectionRequest({
        token,
        connectionId: userProfile.userId._id
      })
    );

    dispatch(
      fetchConnections({
        token
      })
    );
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.heroSection}>
            <div className={styles.backDropContainer}>
              {userProfile.coverPhoto ? (
                <img
                  className={styles.backDrop}
                  src={`${BASE_URL}/uploads/${userProfile.coverPhoto}`}
                  alt="cover"
                />
              ) : (
                <div className={styles.backDropFallback}></div>
              )}
            </div>

            <div className={styles.heroProfileRow}>
              <img
                className={styles.avatar}
                src={`${BASE_URL}/uploads/${userProfile.userId.profilePicture}`}
                alt={userProfile.userId.name}
              />

              <div className={styles.heroText}>
                <div className={styles.titleRow}>
                  <div>
                    <h1>{userProfile.userId.name}</h1>
                    <p className={styles.usernameText}>@{userProfile.userId.username}</p>
                  </div>

                  <button
                    onClick={handleProfileAction}
                    className={
                      buttonText === "Connect" ? styles.connectBtn : styles.connectedButton
                    }
                  >
                    {buttonText}
                  </button>
                </div>

                <p className={styles.taglineText}>
                  {userProfile.tagline || userProfile.currentPost || "Professional tagline not added yet."}
                </p>

                <div className={styles.metaRow}>
                  {userProfile.location && <span>{userProfile.location}</span>}
                  {userProfile.domain && <span>{userProfile.domain}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.profileContent}>
            <div className={styles.profileMainColumn}>
              <section className={styles.sectionCard}>
                <h3>About</h3>
                <p>{userProfile.about || userProfile.bio || "No about section added yet."}</p>
              </section>

              <section className={styles.sectionCard}>
                <h3>Skills</h3>
                <div className={styles.skillGrid}>
                  {(userProfile.skills || []).length > 0 ? (
                    userProfile.skills.map((skill) => (
                      <span key={skill._id} className={styles.skillPill}>
                        {skill.name}
                      </span>
                    ))
                  ) : (
                    <p>No skills added yet.</p>
                  )}
                </div>
              </section>

              <section className={styles.sectionCard}>
                <h3>Projects</h3>
                <div className={styles.projectGrid}>
                  {(userProfile.projects || []).length > 0 ? (
                    userProfile.projects.map((project) => (
                      <div key={project._id} className={styles.projectCard}>
                        <div className={styles.projectHeader}>
                          <h4>{project.title}</h4>
                          {project.duration && <span>{project.duration}</span>}
                        </div>
                        <p>{project.description || "Project description not added yet."}</p>
                        {project.link && (
                          <a href={project.link} target="_blank" rel="noreferrer">
                            Visit project
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>No projects added yet.</p>
                  )}
                </div>
              </section>

              <section className={styles.sectionCard}>
                <h3>Experience</h3>
                <div className={styles.workHistoryContainer}>
                  {workExperience.length > 0 ? (
                    workExperience.map((work) => (
                      <div key={work._id} className={styles.workHistoryCard}>
                        <div className={styles.timelineDot}></div>
                        <div>
                          <h4>{work.role}</h4>
                          <p className={styles.companyText}>{work.company}</p>
                          <p className={styles.durationText}>
                            {work.duration ||
                              [work.startDate, work.endDate].filter(Boolean).join(" - ")}
                          </p>
                          {work.description && <p>{work.description}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No work experience added yet.</p>
                  )}
                </div>
              </section>
            </div>

            <aside className={styles.recentActivitySection}>
              <h3>Recent Activity</h3>

              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <div key={post._id} className={styles.postCard}>
                    {(post.media || post.image) && (
                      <img
                        className={styles.postMedia}
                        src={`${BASE_URL}/uploads/${post.media || post.image}`}
                        alt={post.body || "Post media"}
                      />
                    )}
                    <p className={styles.postCaption}>{post.body || post.content}</p>
                    <div className={styles.postMetaRow}>
                      <span>{post.likes || 0} likes</span>
                      <span>{post.commentsCount || 0} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyActivity}>
                  No recent posts to show right now.
                </div>
              )}
            </aside>
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export async function getServerSideProps(context) {
  if (!context.query.username) {
    return { notFound: true };
  }

  const request = await clientServer.get("/user/get_profile_based_on_username", {
    params: { username: context.query.username }
  });

  return {
    props: { userProfile: request.data.profile }
  };
}
