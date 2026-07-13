import { createClient } from "redis";
export const redisClient = createClient({
    url: process.env.REDIS_URL,
});
redisClient.on("error", (err) => {
    console.error(err, " : error redis");
});
export const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected");
    }
    catch (error) {
        console.error("redis error", error);
    }
};
