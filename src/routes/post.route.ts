import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createPost } from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = express.Router();

router
  .route("/create-post")
  .post(verifyJWT, upload.single("image"), createPost);

export default router;
