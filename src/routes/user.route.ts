import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  addBio,
  updateBio,
  updateProfileImage,
  getUserProfileData,
  followUser,
  unFollowUser,
  deleteBio,
  getUserFollower,
  searchUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/register").post(upload.single("profileImage"), registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// secured routes
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/add-bio").post(verifyJWT, addBio);
router.route("/update-bio").patch(verifyJWT, updateBio);
router.route("/delete-bio").delete(verifyJWT, deleteBio);

router
  .route("/update-profile-image")
  .patch(verifyJWT, upload.single("profileImage"), updateProfileImage);

router
  .route("/get-user-profile-data/:username")
  .get(verifyJWT, getUserProfileData);

router.route("/follow/:username").post(verifyJWT, followUser);
router.route("/unfollow/:username").post(verifyJWT, unFollowUser);
router.route("/get-followers").get(verifyJWT, getUserFollower);
router.route("/search").get(verifyJWT, searchUser);

export default router;
