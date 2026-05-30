import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

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
      httpsOnly: true,
      secure: true,
    };

    return res
      .status(201)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", refreshToken)
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
