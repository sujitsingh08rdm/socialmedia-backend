import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    let imageLocalPath;
    let imageUrl;
    let post;
    let image;
    if (req.file?.path) {
      imageLocalPath = req.file?.path;
      image = await uploadToCloudinary(imageLocalPath);
    }

    const { content } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "user not found");
    }

    if (image === undefined) {
      post = await Post.create({ content, owner: userId });
    } else {
      post = await Post.create({ content, image: image.url, owner: userId });
    }

    return res.json(new ApiResponse(200, post, "post created successfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};
