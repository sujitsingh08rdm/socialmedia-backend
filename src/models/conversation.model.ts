import mongoose, { Model } from "mongoose";
import { IConversationDocument } from "../types/index.js";

const conversationSchema = new mongoose.Schema<
  IConversationDocument,
  Model<IConversationDocument>
>(
  {
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
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversationDocument>(
  "Conversation",
  conversationSchema
);
