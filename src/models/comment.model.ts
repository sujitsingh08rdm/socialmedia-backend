import mongoose, { Model } from "mongoose";
import { ICommentDocument } from "../types/index.js";

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    comment: { type: String, required: true },
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    taggedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
