"use client";
import {React, useEffect} from 'react'
import styles from "./index.module.css";
import { useRouter } from 'next/router';
import { setTokenIsThere } from "../../config/redux/reducer/authReducer";
import { useDispatch, useSelector} from 'react-redux';
import { getAllUsers } from "../../config/redux/action/authAction";
import { applyAvatarFallback, getUploadUrl, BASE_URL } from "../../config";
import { io } from "socket.io-client";
import { fetchNotifications } from "../../config/redux/action/notificationAction";
import { addNotification } from "../../config/redux/reducer/notificationReducer";

export default function DashboardLayout({ children }) {
  const router=useRouter();
  const dispatch=useDispatch();
  const authState = useSelector((state) => state.auth);
  const activePath = router.pathname;


    const unreadCount = useSelector((state) => state.notification?.unreadCount || 0);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

    useEffect(() => {
      if (!token) {
        router.push("/login");
        return;
      } else {
        dispatch(setTokenIsThere());
      }
    }, [router, dispatch, token]);

    useEffect(() => {
      if (!authState.isTokenThere || authState.all_profiles_fetched) {
        return;
      }

      dispatch(getAllUsers());
    }, [authState.all_profiles_fetched, authState.isTokenThere, dispatch]);

    useEffect(() => {
      if (authState.isTokenThere && token) {
        dispatch(fetchNotifications({ token }));
      }
    }, [authState.isTokenThere, dispatch, token]);

    useEffect(() => {
      if (!token) return;

      const socket = io(BASE_URL, {
        auth: {
          token
        }
      });

      socket.on("new_notification", (payload) => {
        dispatch(addNotification(payload));
      });

      return () => {
        socket.disconnect();
      };
    }, [dispatch, token]);



  return (
    <div>
      <div className={styles.container}>
        <div className={styles.homeContainer}>
          
          <div className={styles.homeContainer__leftBar}>
            <div className={styles.sideRailIntro}>
              <span>Workspace</span>
              <p>Navigate your LinkVerse network faster.</p>
            </div>

            <div onClick={() => {
            router.push("/dashboard")
            }} className={
              activePath === "/dashboard"
                ? `${styles.sideBarOption} ${styles.sideBarOptionActive}`
                : styles.sideBarOption
            }>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <p>Home</p>
            </div>

            <div onClick={() => {
            router.push("/discover")
            }} className={
              activePath === "/discover"
                ? `${styles.sideBarOption} ${styles.sideBarOptionActive}`
                : styles.sideBarOption
            }>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p>Discover</p>
            </div>

           <div onClick={() => {
            router.push("/my_connections")
            }}className={
              activePath === "/my_connections"
                ? `${styles.sideBarOption} ${styles.sideBarOptionActive}`
                : styles.sideBarOption
            }>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <p>My Connections</p>
            </div>

           <div onClick={() => {
            router.push("/messages")
            }}className={
              activePath === "/messages"
                ? `${styles.sideBarOption} ${styles.sideBarOptionActive}`
                : styles.sideBarOption
            }>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.004.148 2.02.26 3.043.333.471.034.847.412.847.884v2.197a.75.75 0 0 0 1.28.53l2.47-2.469a1.125 1.125 0 0 1 .884-.325 48.368 48.368 0 0 0 5.604-.433c1.584-.233 2.707-1.626 2.707-3.227V6.741c0-1.6-1.123-2.994-2.707-3.227A48.368 48.368 0 0 0 12 3.08c-1.91 0-3.8.146-5.605.433C3.373 3.747 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p>Messages</p>
            </div>

            <div onClick={() => {
            router.push("/notifications")
            }}className={
              activePath === "/notifications"
                ? `${styles.sideBarOption} ${styles.sideBarOptionActive}`
                : styles.sideBarOption
            }>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <p>Notifications</p>
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </div>

          </div>

          <div className={styles.homeContainer__feedContainer}>
            {children}
          </div>

          <div className={styles.homeContainer__extraContainer}>
            <h3>Top Profiles</h3>
            <p className={styles.extraSubtitle}>
              Keep an eye on active professionals in your network.
            </p>

            {authState.all_profiles_fetched && authState.all_users.slice(0, 5).map((profile) => {
              return (
                <div
                  key={profile._id}
                  className={styles.extraContainer__profile}
                  onClick={() => {
                    router.push(`/view_profile/${profile?.userId?.username}`);
                  }}
                >
                  <img
                    src={getUploadUrl(profile?.userId?.profilePicture)}
                    alt={profile?.userId?.name || "profile"}
                    onError={applyAvatarFallback}
                  />
                  <div>
                    <p>{profile?.userId?.name}</p>
                    <span>@{profile?.userId?.username}</span>
                  </div>
                </div>
              );
            })}

          </div>

        </div>
      </div>
    </div>
  );
}
