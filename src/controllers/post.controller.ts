import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    let imageLocalPath;
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

// here i need to implement the mongoDB aggregation pipeline to get the comments
export const getAllPostsForHome = async (req: Request, res: Response) => {
  try {
    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "owner.password": 0,
          "owner.refreshToken": 0,
          "owner._v": 0,
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "comments",
          foreignField: "_id",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comment.commentedBy",
          foreignField: "_id",
          as: "commentUsers",
        },
      },
      {
        $addFields: {
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                _id: "$$comment._id",
                comment: "$$comment.comment",
                createdAt: "$$comment.createdAt",
                commentedBy: {
                  $let: {
                    vars: {
                      user: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$commentUsers",
                              as: "user",
                              cond: {
                                $eq: ["$$user._id", "$$comment.commentedBy"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: "$$user._id",
                      username: "$$user.username",
                      profileImage: "$$user.profileImage",
                    },
                  },
                },
              },
            },
          },
        },
      },
      { $addFields: { commentCount: { $size: "$comments" } } },
      { $project: { commentUsers: 0, _v: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    console.log(posts);

    return res
      .status(200)
      .json(new ApiResponse(200, posts, "post fetched successfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};
