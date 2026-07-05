import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { Notification } from "../models/notification.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const notifications = await Notification.find({
      recipient: userId,
    })
      .populate("sender", "username profileImage")
      .populate("post", "_id")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          notifications,
          "Notifications fetched successfully"
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

export const markRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { notificationIds } = req.body;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      throw new ApiError(400, "Notification IDs are required");
    }

    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        recipient: userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    // await Notification.updateMany(
    //   { recipient: userId, isRead: false },
    //   { $set: { isRead: true } }
    // );

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Notifications marked as read"));
  } catch (error: unknown) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";
    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};
