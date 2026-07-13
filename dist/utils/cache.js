import { redisClient } from "../config/redis.js";
import { User } from "../models/user.model.js";
export const invalidatePostCache = async (ownerId) => {
    await redisClient.del("home:posts");
    const owner = await User.findById(ownerId).select("username");
    if (owner) {
        await redisClient.del(`user/posts:${owner.username}`);
    }
};
