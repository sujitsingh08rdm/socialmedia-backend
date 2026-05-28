import mongoose from "mongoose";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
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

export const User = mongoose.model("User", userSchema);
