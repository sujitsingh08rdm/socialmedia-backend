import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectToDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGO_URI}`
    );
  } catch (error) {
    console.error("mongoDb connection error : ->", error);
    process.exit(1);
  }
};

export default connectToDB;
