import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createComment,
  deleteComment,
  getCommentsByPostId,
  getMainPageCommentsByPostId,
} from "../controllers/comment.controller.js";

const router = express.Router();

router.route("/create-comment/:postId").post(verifyJWT, createComment);
router.route("/main-all/:postId").get(getMainPageCommentsByPostId);
router.route("/all/:postId").get(verifyJWT, getCommentsByPostId);
router
  .route("/delete-comment/post/:postId/comment/:commentId")
  .delete(verifyJWT, deleteComment);

export default router;
