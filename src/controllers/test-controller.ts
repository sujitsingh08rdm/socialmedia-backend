import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const testController = async (req: Request, res: Response) => {
  try {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "API is working fine"));
  } catch (error) {
    console.log("Error", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;

    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";

    const errors = error instanceof ApiError ? error.errors : [];

    return res.status(statusCode).json({ success: false, message, errors });
  }
};

export { testController };
