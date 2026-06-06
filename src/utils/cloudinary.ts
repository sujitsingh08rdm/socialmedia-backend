import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (localFilePath: string) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("Cloudinary error : ", error);
    fs.unlinkSync(localFilePath);
  }
};

export const removeFromCloudinary = async (imageUrl: String) => {
  try {
    const imageUrlArr = imageUrl.split("/");
    const imageNameWithExtention = imageUrlArr[imageUrlArr.length - 1];
    const imageNameArr = imageNameWithExtention.split(".");
    const imageName = imageNameArr[0];

    await cloudinary.uploader.destroy(imageName);
  } catch (error) {
    console.log("Cloudinary error : ", error);
  }
};
