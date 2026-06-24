import React from "react";
import NavBarComponent from "@/Components/NavBar";
import styles from "./index.module.css";


function UserLayout({children}){
    return(
        <div className={styles.shell}>
            <NavBarComponent/>
            <main className={styles.pageContent}>{children}</main>
        </div>
    )
}

export default UserLayout;
