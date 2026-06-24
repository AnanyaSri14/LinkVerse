import { Router } from "express";
import {
  getChatSidebar,
  getMessagesForConversation,
  sendMessage,
  deleteMessage
} from "../controllers/chat.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/chat/sidebar", verifyAuthToken, getChatSidebar);
router.get("/chat/messages/:userId", verifyAuthToken, getMessagesForConversation);
router.post("/chat/messages", verifyAuthToken, sendMessage);
router.delete("/chat/messages/:messageId", verifyAuthToken, deleteMessage);

export default router;
