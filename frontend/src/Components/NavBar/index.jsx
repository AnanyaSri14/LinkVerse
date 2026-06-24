import React from "react";
import styles from "./styles.module.css";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../config/redux/action/authAction";

export default function NavBarComponent() {
  const authState = useSelector((state) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();

  return (
    <div className={styles.container}>
      <nav className={styles.navBar}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => {
            router.push("/");
          }}
        >
          <span className={styles.brandMark}>
            <svg
              viewBox="0 0 48 48"
              aria-hidden="true"
              className={styles.brandSymbol}
            >
              <path
                d="M14 15L24 24L34 14"
                className={styles.brandLine}
              />
              <path
                d="M14 33L24 24L34 34"
                className={styles.brandLine}
              />
              <circle cx="14" cy="15" r="4" className={styles.brandNode} />
              <circle cx="24" cy="24" r="4.5" className={styles.brandNodeCore} />
              <circle cx="34" cy="14" r="4" className={styles.brandNode} />
              <circle cx="14" cy="33" r="4" className={styles.brandNode} />
              <circle cx="34" cy="34" r="4" className={styles.brandNode} />
            </svg>
          </span>
          <span className={styles.brandText}>
            <strong>LinkVerse</strong>
            <small>Link your work, voice, and network</small>
          </span>
        </button>

        <div className={styles.navBarOptionContainer}>
          {authState.user && authState.user.userId ? (
            <div className={styles.authActions}>
              <div className={styles.greetingPill}>
                <span className={styles.greetingLabel}>Welcome back</span>
                <strong>{authState.user.userId.name}</strong>
              </div>

              <button
                type="button"
                className={styles.navAction}
                onClick={() => {
                  router.push("/profile");
                }}
              >
                Profile
              </button>

              <button
                type="button"
                className={styles.navActionPrimary}
                onClick={async () => {
                  await dispatch(logoutUser());
                  router.push("/");
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                router.push("/login?mode=signup");
              }}
              className={styles.buttonJoin}
            >
              Be a part
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
