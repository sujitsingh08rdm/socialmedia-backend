import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { Document } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  bio?: string;
  profileImage?: string;
  posts: mongoose.Types.ObjectId[];
  password: string;
  refreshToken?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
}

export interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

export interface IUserDocument extends IUser, Document, IUserMethods {}

export interface AccessTokenPayload extends JwtPayload {
  _id: string;
  user: string;
  email: string;
}
