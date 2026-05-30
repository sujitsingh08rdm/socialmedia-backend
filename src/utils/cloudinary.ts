import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

export const uploadToCloudinary = (localFilePath) => {
  try {
    console.log(localFilePath);
  } catch (error) {
    console.log("Cloudinary error : ", error);
    fs.unlinkSync(localFilePath);
  }
};
