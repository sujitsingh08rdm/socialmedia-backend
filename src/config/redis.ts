import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("error", (err) => {
  console.error(err, ": error redis");
});

redisClient.on("end", () => {
  console.log("Redis connection closed");
});

redisClient.on("error", (err) => {
  console.error(err, " : error redis");
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected");
  } catch (error) {
    console.error("redis error", error);
  }
};
