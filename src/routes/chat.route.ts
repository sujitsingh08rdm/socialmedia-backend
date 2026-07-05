import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMessage,
  getOrCreateConversation,
  getUserConversation,
  markSeen,
  sendMessage,
} from "../controllers/chat.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.route("/conversation").post(verifyJWT, getOrCreateConversation);
router.route("/message").post(verifyJWT, upload.single("image"), sendMessage);
router.route("/messages/:conversationId").get(verifyJWT, getMessage);
router.route("/seen/:conversationId").patch(verifyJWT, markSeen);
router.route("/conversations").get(verifyJWT, getUserConversation);

export default router;
