import { Router } from "express";
import multer from "multer";
import {
  updateProfile,
  saveSkill,
  deleteSkill,
  saveProject,
  deleteProject,
  saveExperience,
  deleteExperience,
  uploadResumeAndAutofill
} from "../controllers/profile.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.put(
  "/profile/update",
  verifyAuthToken,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 }
  ]),
  updateProfile
);

router.post("/profile/skills", verifyAuthToken, saveSkill);
router.delete("/profile/skills/:skillId", verifyAuthToken, deleteSkill);

router.post("/profile/projects", verifyAuthToken, saveProject);
router.delete("/profile/projects/:projectId", verifyAuthToken, deleteProject);

router.post("/profile/experience", verifyAuthToken, saveExperience);
router.delete("/profile/experience/:experienceId", verifyAuthToken, deleteExperience);
router.post(
  "/profile/upload_resume",
  verifyAuthToken,
  upload.single("resume"),
  uploadResumeAndAutofill
);

export default router;
