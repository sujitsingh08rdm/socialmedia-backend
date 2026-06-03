import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  removeFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { AccessTokenPayload } from "../types/index.js";
import fs from "fs";

export const registerUser = async (req: Request, res: Response) => {
  try {
    let profileImageLocalPath;
    let profileImageUrl;

    if (req.file?.path) {
      profileImageLocalPath = req.file.path;
      const cloudinaryResult = await uploadToCloudinary(profileImageLocalPath);
      if (cloudinaryResult?.url) {
        profileImageUrl = cloudinaryResult.url;
      }
    }

    const { username, email, password } = req.body;

    if (!username || username === "") {
      throw new ApiError(400, "user name is required");
    }

    if (!email || email === "") {
      throw new ApiError(400, "email is required");
    }

    if (!email.includes("@")) {
      throw new ApiError(400, "invalid email");
    }

    if (!password || password === "") {
      throw new ApiError(400, "Password is required");
    }

    let existingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existingUser) {
      throw new ApiError(
        409,
        "user with this email or username already exisnt, please try something else"
      );
    }

    let user;

    if (profileImageUrl) {
      user = await User.create({
        username,
        email,
        password,
        profileImage: profileImageUrl,
      });
    } else {
      user = await User.create({ username, email, password });
    }

    const createdUser = await User.findOne({ $or: [{ username, email }] });

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong with creating user");
    }

    const accessToken = createdUser.generateAccessToken();
    const refreshToken = createdUser.generateRefreshToken();

    createdUser.refreshToken = refreshToken;
    await createdUser.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(createdUser._id).select(
      "-password -refreshToken"
    );

    const cookiesOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(201)
      .cookie("accessToken", accessToken, cookiesOptions)
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .json(
        new ApiResponse(
          201,
          { success: true, user: loggedInUser, accessToken, refreshToken },
          "User registered Successfully..."
        )
      );
  } catch (error) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username && !email) {
      throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) {
      throw new ApiError(404, "user not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
      throw new ApiError(401, "invalid credentials");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const cookiesOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookiesOptions)
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User Logged in Succesfully"
        )
      );
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    // Alternate method
    // const user = await User.findById(userId);

    // if (!user) {
    //   throw new ApiError(400, "something went wrong while logout");
    // }

    // user.refreshToken = undefined;
    // await user.save();

    await User.findByIdAndUpdate(
      userId,
      { $unset: { refreshToken: 1 } },
      {
        new: true,
      }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, null, "User logged out successfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    return res
      .status(200)
      .json(new ApiResponse(200, user, "current User fetched successfully."));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as AccessTokenPayload;

    const userId = decodedToken?._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "invalid  refresh-token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refreshTOken invalid/expired");
    }

    const newRefreshToken = user.generateRefreshToken();
    const newAccessToken = user.generateAccessToken();

    user.refreshToken = newRefreshToken;
    user.save({ validateBeforeSave: false });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(201)
      .cookie("accessToken", newAccessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          201,
          { refreshToken: newRefreshToken, accessToken: newAccessToken },
          "refresh token successfully created"
        )
      );
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const changeCurrentPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      throw new ApiError(400, "new password and confirm password do not match");
    }
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "Unauthorized request");
    }

    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isOldPasswordCorrect) {
      throw new ApiError(401, "you old password do not match");
    }

    user.password = newPassword;

    user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password successfully changed"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const addBio = async (req: Request, res: Response) => {
  try {
    const { bio } = req.body;

    if (!bio || bio === "") {
      throw new ApiError(400, "Bio cannot be empty");
    }

    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    user.bio = bio.trim();
    user.save({ validateBeforeSave: false });

    return res
      .status(201)
      .json(new ApiResponse(201, null, "bio added succesfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const updateBio = async (req: Request, res: Response) => {
  try {
    const { updatedBio } = req.body;
    if (!updatedBio || updatedBio === "") {
      throw new ApiError(400, "updated bio cannot be empty");
    }

    const userId = req.user?._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { bio: updatedBio } },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Bio updated successfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    let profileImagePath = req.file?.path;

    if (!profileImagePath) {
      throw new ApiError(400, "profile image is required.");
    }

    const userId = req.user?._id;
    if (!userId) {
      fs.unlinkSync(profileImagePath);
      throw new ApiError(500, "no user id found.");
    }

    const user = await User.findById(userId);

    if (!user) {
      fs.unlinkSync(profileImagePath);
      throw new ApiError(400, "user not found");
    }

    if (!user.profileImage) {
      const profileImage = await uploadToCloudinary(profileImagePath);
      user.profileImage = profileImage?.url;
      user.save({ validateBeforeSave: false });
      res
        .status(200)
        .json(new ApiResponse(200, null, "profile image added sucessfully"));
    } else {
      const oldProfileImageUrl = user.profileImage;
      await removeFromCloudinary(oldProfileImageUrl);
      const newProfileImage = await uploadToCloudinary(profileImagePath);
      user.profileImage = newProfileImage?.url;
      user.save({ validateBeforeSave: false });
      res
        .status(200)
        .json(new ApiResponse(200, null, "profile image Updated sucessfully"));
    }
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

// Create controller to get user profile details" It should container posts, followers and following.
// Here we will use mongoDB Aggregation pipeline
