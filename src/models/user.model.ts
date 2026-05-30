import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { accessTokenExpiry, accessTokenSecret } from "../types/env.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    { _id: this._id, username: this.username, email: this.email },
    accessTokenSecret,
    { expiresIn: accessTokenExpiry }
  );
};

userSchema.methods.generateRefreshToken = async function () {
  const refreshTokenSecret: Secret = process.env.REFRESH_TOKEN_SECRET as Secret;
  // jwt.sign(payload, secretOrPrivateKey, options); payload -> data we want to store in token.
  const options: jwt.SignOptions = {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"],
  };

  return jwt.sign({ _id: this.id }, refreshTokenSecret, options);
};

export const User = mongoose.model("User", userSchema);
