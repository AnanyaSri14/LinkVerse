import { Router } from "express";
import {
  register,
  login,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  logout
} from "../controllers/auth.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/refresh-token", refreshAccessToken);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/change-password", verifyAuthToken, changePassword);
router.post("/auth/logout", verifyAuthToken, logout);

// Legacy aliases keep older frontend calls working during the migration.
router.post("/register", register);
router.post("/login", login);

export default router;
