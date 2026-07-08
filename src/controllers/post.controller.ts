import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import cloudinary, {
  removeFromCloudinary,
  uploadToCloudinary,
  uploadVideoToCloudinary,
} from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import sanitizeHtml from "sanitize-html";
import mongoose from "mongoose";
import { io } from "../index.js";
import { redisClient } from "../config/redis.js";
import { unFollowUser } from "./user.controller.js";

export const createPost = async (req: Request, res: Response) => {
  try {
    let post;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (files["image"] && files["video"]) {
      throw new ApiError(
        400,
        "You can upload either an image or a video, not both"
      );
    }

    let image;
    let videoHlsUrl: string | undefined;
    let videoThumbnail: string | undefined;

    let imagePublicId: string | undefined;
    let videoPublicId: string | undefined;

    if (files["image"]?.[0]?.path) {
      image = await uploadToCloudinary(files["image"][0].path);
      imagePublicId = image.public_id;
    }

    if (files["video"]?.[0]?.path) {
      const videoResult = await uploadVideoToCloudinary(files["video"][0].path);

      if (!videoResult) {
        throw new ApiError(500, "Failed upload video to cloudinary");
      }

      videoPublicId = videoResult.public_id;

      videoHlsUrl =
        videoResult.eager?.[0]?.secure_url ?? videoResult.secure_url;

      videoThumbnail = cloudinary.url(videoResult.public_id, {
        resource_type: "video",
        format: "jpg",
        transformation: [
          {
            start_offset: "2",
            width: 800,
            crop: "scale",
          },
        ],
      });
    }

    const { content } = req.body;

    const cleanContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        a: ["href", "target", "rel"],
        img: ["src", "alt"],
      },
    });

    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "user not found");
    }

    const createdPost = await Post.create({
      content: cleanContent,
      owner: userId,
      ...(image && { image: image.url }),
      ...(imagePublicId && { imagePublicId }),

      ...(videoHlsUrl && { video: videoHlsUrl }),
      ...(videoThumbnail && { videoThumbnail }),
      ...(videoPublicId && { videoPublicId }),
    });

    // if (image === undefined) {
    //   post = await Post.create({ content: cleanContent, owner: userId });
    // } else {
    //   post = await Post.create({
    //     content: cleanContent,
    //     image: image.url,
    //     owner: userId,
    //   });
    // }

    // user.posts.push(post._id);
    // await user.save({ validateBeforeSave: false });

    const populatedPost = await Post.findById(createdPost._id).populate(
      "owner",
      "username profileImage"
    );

    if (!populatedPost) {
      throw new ApiError(500, "Failed to populate post");
    }

    const formattedPost = {
      ...populatedPost.toObject(),
      likes: [],
      likeCount: 0,
      commentsCount: 0,
      comments: [],
    };

    io.emit("new_post", formattedPost);

    await redisClient.del("home:posts");

    await redisClient.del(`user/posts:${user.username}`);

    return res.json(
      new ApiResponse(200, formattedPost, "post created successfully")
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

// here i need to implement the mongoDB aggregation pipeline to get the comments
export const getAllPostsForHome = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const cacheKey = "home:posts";

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            JSON.parse(cachedData),
            "post fetched from cache"
          )
        );
    }

    if (!userId) {
      throw new ApiError(404, "userID not found");
    }

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
      // {
      //   $lookup: {
      //     from: "comments",
      //     localField: "comments",
      //     foreignField: "_id",
      //     as: "comments",
      //   },
      // },
      // This is bug fix for above, we uncomment it lateer
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.commentedBy",
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
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ["$likes", []] } },
          isLiked: {
            $in: [userId, "$likes"],
          },
        },
      },
      { $project: { commentUsers: 0, _v: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    await redisClient.set(cacheKey, JSON.stringify(posts), { EX: 60 });

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

export const getUserPostById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;

    if (!userId) {
      throw new ApiError(404, "User id not found");
    }

    if (!postId) {
      throw new ApiError(400, "Post id not found");
    }

    if (!mongoose.Types.ObjectId.isValid(postId as string)) {
      throw new ApiError(400, "Invalid post id");
    }

    const post = await Post.findOne({
      _id: postId,
      // owner: userId,
    })
      .populate("owner", "username profileImage")
      .populate("comments")
      .populate("likes", "username profileImage");

    if (!post) {
      throw new ApiError(404, "Post not found or you are not the owner");
    }

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: post,
    });
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

// Post details submited by an user --
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const userId = req.user?._id;

    if (!username) {
      throw new ApiError(404, "username not found");
    }

    if (!userId) {
      throw new ApiError(404, "userID not found");
    }

    const cacheKey = `user/posts:${username}`;

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            JSON.parse(cachedData),
            "user post fetched successfully from cache"
          )
        );
    }

    const posts = await Post.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      { $match: { "owner.username": username } },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "comments.commentedBy",
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
            },
          },
          commentCount: { $size: "$comments" },
          likeCount: { $size: { $ifNull: ["$likes", []] } },
          isLiked: {
            $in: [
              userId,
              {
                $map: {
                  input: { $ifNull: ["$likes", []] },
                  as: "l",
                  in: { $toString: "$$l" },
                },
              },
            ],
          },
        },
      },
      {
        $project: {
          content: 1,
          image: 1,
          video: 1,
          videoThumbnail: 1,
          createdAt: 1,
          commentCount: 1,
          owner: {
            _id: "$owner._id",
            username: "$owner.username",
            profileImage: "$owner.profileImage",
          },
          comments: {
            _id: 1,
            comment: 1,
            commentedBy: { _id: 1, username: 1, profileImage: 1 },
          },
          likeCount: 1,
          isLiked: 1,
          likes: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    await redisClient.set(cacheKey, JSON.stringify(posts), {
      EX: 60,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, posts, "users fetched sucessfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const updatePostContent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;
    const { content } = req.body;
    const imageLocalPath = req.file?.path;

    if (!content || content.trim() === "") {
      throw new ApiError(400, "No Content Provided");
    }

    if (!userId) {
      throw new ApiError(404, "User id not found");
    }

    if (!postId) {
      throw new ApiError(404, "Post id not found");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    if (!post.owner.equals(userId)) {
      throw new ApiError(401, "You are not authrizd to perform this action.");
    }

    if (content?.trim()) {
      post.content = content.trim();
    }

    // Replace image
    if (imageLocalPath) {
      if (post.image) {
        await removeFromCloudinary(post.image);
      }

      const uploadedImage = await uploadToCloudinary(imageLocalPath);

      if (!uploadedImage) {
        throw new ApiError(500, "Failed to upload image");
      }

      post.image = uploadedImage.secure_url;
    }

    await post.save({ validateBeforeSave: false });

    await redisClient.del("home:posts");

    await redisClient.del(`user/posts:${req.user?.username}`);

    return res
      .status(200)
      .json(new ApiResponse(200, post, "Post updated sucessfully."));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    if (!postId) {
      throw new ApiError(404, "Post id not found");
    }

    if (!userId) {
      throw new ApiError(404, "Suer id not Found");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post Not found");
    }

    if (post.videoPublicId) {
      await removeFromCloudinary(post.videoPublicId, "video");
    }

    if (post.imagePublicId) {
      await removeFromCloudinary(post.imagePublicId, "image");
    }

    const deletedPost = await Post.findByIdAndDelete({
      _id: postId,
      owner: userId,
    });

    if (!deletedPost) {
      throw new ApiError(401, "You are not authorized to perform this action");
    }

    await redisClient.del("home:posts");

    await redisClient.del(`user/posts:${req.user?.username}`);

    return res
      .status(203)
      .json(new ApiResponse(203, null, "post deleted successfully."));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};
