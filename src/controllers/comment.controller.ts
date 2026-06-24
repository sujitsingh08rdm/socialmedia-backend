import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { Post } from "../models/post.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";

interface CreateCommentParams {
  postId: string;
}

export const createComment = async (
  req: Request<CreateCommentParams>,
  res: Response
) => {
  try {
    const userId = req.user?._id;
    const postId = req.params.postId;
    const { comment, parentComment, taggedUser } = req.body;

    if (!userId) {
      throw new ApiError(404, "Userid not found");
    }

    if (!postId) {
      throw new ApiError(400, "PostId required");
    }

    if (!comment || comment.trim() === "") {
      throw new ApiError(400, "comment is needed");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const createdComment = await Comment.create({
      comment,
      post: postId,
      commentedBy: userId,
      parentComment: parentComment || null,
      taggedUser: taggedUser || null,
    });

    const populatedComment = await Comment.findById(createdComment._id)
      .populate("commentedBy", "username profileImage")
      .populate("taggedUser", "username");

    post.comments.push(createdComment._id);
    await post.save({ validateBeforeSave: false });

    return res
      .status(201)
      .json(
        new ApiResponse(201, populatedComment, "Comment created sucessfully")
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

export const getCommentsByPostId = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    // const comments = await Comment.find({ post: postId });

    const rootComments = await Comment.find({
      post: postId,
      parentComment: null,
    })
      .populate("commentedBy", "username profileImage")
      .lean();

    const commentsWithReplies = await Promise.all(
      rootComments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
        })
          .populate("commentedBy", "username profileImage")
          .populate("taggedUser", "username")
          .lean();

        return {
          ...comment,
          replies,
        };
      })
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          commentsWithReplies,
          "comments fetched sucessfully"
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

export const deleteComment = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { postId, commentId } = req.params;

    if (!userId) {
      throw new ApiError(404, "Userid not found.");
    }

    if (!commentId) {
      throw new ApiError(400, "commentId not found.");
    }

    const post = await Post.findById(postId);

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    if (!comment.post?.equals(post._id)) {
      throw new ApiError(403, "Comment does not belong to post");
    }

    const isPostOwner = post.owner.equals(userId);
    const isCommentOwner = comment.commentedBy?.equals(userId);

    if (!isPostOwner && !isCommentOwner) {
      throw new ApiError(401, "You are not authorized to perfomed this delete");
    }

    await Comment.findByIdAndDelete(commentId);

    //remove comment-reference from post
    await Post.findByIdAndUpdate(postId, {
      $pull: { comments: commentId },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "comment deleted Sucessfully."));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

// export const deleteComment = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?._id;
//     const { postId, commentId } = req.params;

//     if (!userId) throw new ApiError(401, "User not authenticated");
//     if (!postId || !commentId) throw new ApiError(400, "Invalid params");

//     const [post, comment] = await Promise.all([
//       Post.findById(postId),
//       Comment.findById(commentId),
//     ]);

//     if (!post) throw new ApiError(404, "Post not found");
//     if (!comment) throw new ApiError(404, "Comment not found");

//     const isPostOwner = post.owner.equals(userId);
//     const isCommentOwner = comment.commentedBy.equals(userId);

//     if (!isPostOwner && !isCommentOwner) {
//       throw new ApiError(403, "Not authorized to delete this comment");
//     }

//     await Comment.findByIdAndDelete(commentId);

//     return res
//       .status(200)
//       .json(new ApiResponse(200, null, "Comment deleted successfully"));
//   } catch (error: unknown) {
//     console.log("Error", error);

//     const statusCode = error instanceof ApiError ? error.statusCode : 500;
//     const message =
//       error instanceof ApiError ? error.message : "Internal Server Error";

//     return res.status(statusCode).json({ success: false, message });
//   }
// };
