import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/register").post(upload.single("profileImage"), registerUser);
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").get(verifyJWT, logoutUser);

export default router;
