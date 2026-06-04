import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPost,
  getAllPostsForHome,
  getUserPosts,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router
  .route("/create-post")
  .post(verifyJWT, upload.single("image"), createPost);
router.route("/all-posts").get(verifyJWT, getAllPostsForHome);
router.route("/user-posts/:username").get(verifyJWT, getUserPosts);

export default router;
