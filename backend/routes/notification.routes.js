import { Router } from "express";
import {
  getNotifications,
  markAllAsRead,
  markAsRead
} from "../controllers/notification.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verifyAuthToken);

router.get("/notifications", getNotifications);
router.put("/notifications/read/all", markAllAsRead);
router.put("/notifications/read/:id", markAsRead);

export default router;
