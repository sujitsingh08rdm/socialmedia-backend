import mongoose from "mongoose";
const conversationSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    ],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },
    // lastSeen: [
    //   {
    //     user: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User",
    //       required: true,
    //     },
    //   },
    //   {
    //     lastSeenMessage: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Message",
    //       default: null,
    //     },
    //   },
    // ],
    lastSeen: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            lastSeenMessage: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Message",
                default: null,
            },
        },
    ],
}, { timestamps: true });
export const Conversation = mongoose.model("Conversation", conversationSchema);
