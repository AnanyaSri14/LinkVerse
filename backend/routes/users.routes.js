import { Router } from "express";
import {
  updateUserProfile,
  getUserAndProfile,
  uploadProfilePicture,
  updateProfileData,
  getAllUserProfile,
  downloadProfile,
  getUserProfileAndUserBasedOnUsername,
  hibernateAccount,
  deleteAccount
} from "../controllers/users.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";


import multer from "multer";


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});



const router = Router();

const upload = multer({ storage: storage });

router.route("/update_profile_picture")
  .post(
    verifyAuthToken,
    upload.single("profile_picture"),
    uploadProfilePicture
  );

router.post("/user_update", verifyAuthToken, updateUserProfile);
router.get("/get_user_and_profile", verifyAuthToken, getUserAndProfile);
router.post("/update_profile_data", verifyAuthToken, updateProfileData);
router.get("/users/get_all_users", verifyAuthToken, getAllUserProfile);
router.get("/download_resume", verifyAuthToken, downloadProfile);
router.route("/update_profile_data").post(verifyAuthToken, updateProfileData);
router.route('/user/get_profile_based_on_username')
  .get(getUserProfileAndUserBasedOnUsername);
router.post("/hibernate_account", verifyAuthToken, hibernateAccount);
router.post("/delete_account", verifyAuthToken, deleteAccount);
export default router;
