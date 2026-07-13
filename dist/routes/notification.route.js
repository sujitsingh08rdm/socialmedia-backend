import express from "express";
import { getNotification, markRead, } from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.get("/", verifyJWT, getNotification);
router.patch("/read", verifyJWT, markRead);
export default router;
