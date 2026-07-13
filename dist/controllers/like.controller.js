import { ApiError } from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocket, io } from "../index.js";
import { invalidatePostCache } from "../utils/cache.js";
export const togglePostLike = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { postId } = req.params;
        if (!userId) {
            throw new ApiError(404, "User id not found.");
        }
        if (!postId) {
            throw new ApiError(404, "Post id not found.");
        }
        const post = await Post.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found.");
        }
        const isLiked = post.likes.includes(userId);
        if (isLiked) {
            await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
            await invalidatePostCache(post.owner.toString());
            return res
                .status(201)
                .json(new ApiResponse(201, null, `You un-liked post ${post.owner} post`));
        }
        else {
            await Post.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });
            await invalidatePostCache(post.owner.toString());
            if (post.owner.toString() !== userId.toString()) {
                const notification = await Notification.create({
                    recipient: post.owner,
                    sender: userId,
                    type: "LIKE_POST",
                    post: post._id,
                });
                const populatedNotification = await Notification.findById(notification._id)
                    .populate("sender", "username profileImage")
                    .populate("post", "_id");
                const receiverSocket = getReceiverSocket(post.owner.toString());
                console.log("Receiver Socket:", receiverSocket);
                if (receiverSocket) {
                    console.log("📢 Emitting notification");
                    io.to(receiverSocket).emit("notification", populatedNotification);
                }
            }
            return res
                .status(201)
                .json(new ApiResponse(201, null, `You liked post ${post.owner} post`));
        }
    }
    catch (error) {
        console.log("Error", error);
        const statusCode = error instanceof ApiError ? error.statusCode : 500;
        const message = error instanceof ApiError ? error.message : "Internal Server Error";
        const errors = error instanceof ApiError ? error.errors : [];
        return res.status(statusCode).json({ success: false, message, errors });
    }
};
export const getUsersWhoLikedPost = async (req, res) => {
    try {
        const postId = req.params.postId;
        const userId = req.user?._id;
        if (!postId) {
            throw new ApiError(400, "PostId is required");
        }
        if (!userId) {
            throw new ApiError(400, "UserId is required");
        }
        const result = await Post.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(postId),
                },
            },
            {
                $addFields: {
                    likes: {
                        $ifNull: ["$likes", []],
                    },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "likes",
                    foreignField: "_id",
                    as: "likedUsers",
                },
            },
            {
                $project: {
                    _id: 0,
                    likedUsers: {
                        $map: {
                            input: "$likedUsers",
                            as: "user",
                            in: {
                                _id: "$$user._id",
                                username: "$$user.username",
                                profileImage: "$$user.profileImage",
                            },
                        },
                    },
                },
            },
        ]);
        if (!result.length) {
            throw new ApiError(404, "Post not found.");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, result, "Liked users fetched successfully"));
    }
    catch (error) {
        const statusCode = error instanceof ApiError ? error.statusCode : 500;
        const message = error instanceof ApiError ? error.message : "Internal Server Error";
        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};
