import { Router } from "express";
import {
  sendConnection,
  respondToConnection,
  getConnections,
  getConnectionsLegacy,
  getMutualConnections,
  getConnectionSuggestions
} from "../controllers/connections.controller.js";
import { verifyAuthToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/connection/send", verifyAuthToken, sendConnection);
router.post("/connection/respond", verifyAuthToken, respondToConnection);
router.get("/connections", verifyAuthToken, getConnections);
router.get("/connections/suggestions", verifyAuthToken, getConnectionSuggestions);
router.get("/connections/mutual/:userId", verifyAuthToken, getMutualConnections);

// Legacy routes are kept so the older screens continue working during the transition.
router.post("/send_connection_request", verifyAuthToken, sendConnection);
router.get("/getConnectionRequests", verifyAuthToken, getConnectionsLegacy);
router.get("/user_connection_request", verifyAuthToken, getConnectionsLegacy);
router.post("/accept_connection_request", verifyAuthToken, respondToConnection);

export default router;
