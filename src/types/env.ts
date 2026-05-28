import type { StringValue } from "ms";

export const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET!;

export const accessTokenExpiry = process.env
  .ACCESS_TOKEN_EXPIRY! as StringValue;

if (!accessTokenSecret || !accessTokenExpiry) {
  throw new Error(
    "Missing access token secret or missing access token expiry."
  );
}
