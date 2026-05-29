import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import testRoute from "./routes/test.route.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());

//routes
app.use("/api/v1/test", testRoute);

export default app;
