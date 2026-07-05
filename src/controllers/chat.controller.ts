import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { Conversation } from "../models/conversation.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Message } from "../models/message.model.js";
import { getReceiverSocket, io } from "../index.js";

export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { receiverId } = req.body;

    if (!userId || !receiverId) {
      throw new ApiError(400, "Invalid Users");
    }

    if (userId.equals(receiverId)) {
      throw new ApiError(400, "Cannot chat yourself.");
    }

    const participants = [userId.toString(), receiverId.toString()].sort();

    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        lastSeen: [
          {
            user: userId,
            lastSeenMessage: null,
          },
          {
            user: receiverId,
            lastSeenMessage: null,
          },
        ],
      });
    }

    res
      .status(200)
      .json(new ApiResponse(200, conversation, "conversation fetched"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = req.user?._id;
    if (!senderId) {
      throw new ApiError(404, "Sender id not found");
    }

    let { conversationId, text } = req.body;

    if (!conversationId) {
      throw new ApiError(401, "Conversation Id not found");
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new ApiError(401, "Conversation not found.");
    }

    if (!conversation.participants.some((id) => id.equals(senderId))) {
      throw new ApiError(403, "Not a participants");
    }

    let image;

    if (req.file?.path) {
      let imageLocalPath = req.file.path;
      let uploadedImage = await uploadToCloudinary(imageLocalPath);
      image = uploadedImage?.secure_url;
    }

    let message;

    if (image === undefined) {
      message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text,
        seenBy: [senderId],
      });
    } else {
      message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text,
        image,
        seenBy: [senderId],
      });
    }

    // await Conversation.findByIdAndUpdate(conversationId, {
    //   lastMessage: message._id,
    // });

    conversation.lastMessage = message._id;

    const senderLastSeen = conversation.lastSeen.find((entry) =>
      entry.user.equals(senderId)
    );

    if (senderLastSeen) {
      senderLastSeen.lastSeenMessage = message._id;
    }

    await conversation.save();

    const updatedConversation = await Conversation.findById(conversationId)
      .populate("participants", "username profileImage")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username profileImage",
        },
      });

    const populated = await message.populate("sender", "username profileImage");

    const receiverId = conversation.participants.find(
      (id) => !id.equals(senderId)
    );

    const receiverSocket = receiverId
      ? getReceiverSocket(receiverId.toString())
      : undefined;

    // if (receiverSocket) {
    //
    //   io.to(receiverSocket).emit("receiveMessage", populated);
    // }

    // if (receiverSocket) {
    //   io.to(conversationId).emit("conversationUpdated", {
    //     conversation: updatedConversation,
    //     message: populated,
    //   });
    // }

    if (receiverId) {
      io.to(receiverId.toString()).emit("conversationUpdated", {
        conversation: updatedConversation,
        message: populated,
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          conversation: updatedConversation,
          message: populated,
        },
        "Message sent successfully"
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

export const getMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { conversationId } = req.params;

    if (!conversationId) {
      throw new ApiError(404, "Conversation id not found");
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    if (!conversation.participants.some((id: any) => id.equals(userId))) {
      throw new ApiError(404, "Not Authorized.");
    }

    const page = Number(req.query.page) || 1;
    const limit = 20;

    const skip = (page - 1) * limit;

    const message = await Message.find({
      conversation: conversationId,
    })
      .populate("sender", "username profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res
      .status(200)
      .json(new ApiResponse(200, message, "message fetched Successfully"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const markSeen = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { conversationId } = req.params;

    if (!userId) {
      throw new ApiError(404, "User id not found");
    }

    if (!conversationId) {
      throw new ApiError(404, "CoversationId not found");
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const lastSeenEntry = conversation?.lastSeen.find((entry) => {
      console.log("Comparing:", entry.user.toString(), userId.toString());

      return entry.user.equals(userId);
    });

    console.log("Found entry:", lastSeenEntry);

    if (lastSeenEntry) {
      lastSeenEntry.lastSeenMessage = conversation.lastMessage;
    }

    await conversation.save();

    io.to(conversationId).emit("messagesSeen", {
      conversationId,
      userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message marked as seen"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export const getUserConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(404, "User id not found");
    }

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profileImage")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username profileImage" },
      })
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const lastSeen = conversation.lastSeen.find((entry) =>
          entry.user.equals(userId)
        );

        let unreadCount = 0;

        if (!lastSeen?.lastSeenMessage) {
          // User has never opened this chat
          unreadCount = await Message.countDocuments({
            conversation: conversation._id,
            sender: { $ne: userId },
          });
        } else {
          // Count messages after the last seen message
          unreadCount = await Message.countDocuments({
            conversation: conversation._id,
            sender: { $ne: userId },
            _id: { $gt: lastSeen.lastSeenMessage },
          });
        }

        return {
          ...conversation.toObject(),
          unreadCount,
        };
      })
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          conversationsWithUnread,
          "Conversations Fetched successfully"
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
