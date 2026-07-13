import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const uploadToCloudinary = async (localFilePath) => {
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch (error) {
        console.log("Cloudinary error : ", error);
        fs.unlinkSync(localFilePath);
    }
};
export const uploadVideoToCloudinary = async (localFilePath) => {
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "video",
            eager: [{ streaming_profile: "full_hd", format: "m3u8" }],
            eager_async: false,
        });
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch (error) {
        console.log("Cloudinary error : ", error);
    }
    finally {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
};
export const removeFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result;
    }
    catch (error) {
        console.log("Cloudinary error:", error);
    }
};
export default cloudinary;
