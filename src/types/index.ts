import mongoose from "mongoose";
import { Document } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  bio?: string;
  profileImage?: string;
  posts: mongoose.Types.ObjectId[];
  password: string;
  refreshToken?: String;
}

export interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export interface IUserDocument extends IUser, Document, IUserMethods {}
