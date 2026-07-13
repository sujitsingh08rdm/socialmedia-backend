import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUsersWhoLikedPost, togglePostLike, } from "../controllers/like.controller.js";
const router = express.Router();
router.route("/post/:postId/toggle-like").post(verifyJWT, togglePostLike);
router.route("/post/:postId").get(verifyJWT, getUsersWhoLikedPost);
export default router;
