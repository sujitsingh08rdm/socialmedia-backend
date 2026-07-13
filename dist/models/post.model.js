import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    image: {
        type: String,
    },
    imagePublicId: { type: String },
    video: {
        type: String,
    },
    videoThumbnail: { type: String },
    videoPublicId: { type: String },
    owner: {
        type: mongoose.Types.ObjectId,
        ref: "User",
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
        },
    ],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
export const Post = mongoose.model("Post", postSchema);
