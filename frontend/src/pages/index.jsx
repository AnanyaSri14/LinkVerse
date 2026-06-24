import { useRouter } from "next/router";
import styles from "@/styles/Home.module.css";
import UserLayout from "@/layout/UserLayout";

export default function Home() {
  const router = useRouter();

  return (
    <UserLayout>
      <div className={styles.container}>

        <div className={styles.mainContainer}>

          <div className={styles.mainContainer_left}>
            <p>Connect with Friends without Exaggeration</p>
            <p>A True social media platform, with stories no blufs!</p>

            <button
              type="button"
              onClick={() => router.push("/login?mode=signup")}
              className={styles.buttonJoin}
            >
              Join Now
            </button>
          </div>

          <div className={styles.mainContainer_right}>
            <img src="/images/homepage_connection.jpg" alt="connection" />

          </div>

        </div>
      </div>
    </UserLayout>
  );
}
