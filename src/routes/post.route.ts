import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createPost,
  deletePost,
  getAllPostsForHome,
  getUserPosts,
  updatePostContent,
  getUserPostById,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router.route("/create-post").post(
  verifyJWT,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createPost
);
router.route("/all-posts").get(verifyJWT, getAllPostsForHome);
router.route("/user-posts/:username").get(verifyJWT, getUserPosts);
router.route("/:postId").get(verifyJWT, getUserPostById);
router
  .route("/update-post-content/:postId")
  .patch(verifyJWT, upload.single("image"), updatePostContent);

router.route("/delete-post/:postId").delete(verifyJWT, deletePost);

export default router;
