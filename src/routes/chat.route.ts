import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMessage,
  getOrCreateConversation,
  sendMessage,
} from "../controllers/chat.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.route("/conversation").post(verifyJWT, getOrCreateConversation);
router.route("/message").post(verifyJWT, upload.single("image"), sendMessage);
router
  .route("/messages/:conversationId")
  .get(verifyJWT, upload.single("image"), getMessage);

export default router;
