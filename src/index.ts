import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import app from "./app.js";
import connectDB from "./config/db.js";

const port = process.env.PORT || 4001;

connectDB()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`Server running on PORT ${port} successfully..`);
    });
    server.on("error", (error) => {
      console.log("server Error : ", error);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error(`MongoDB Connection failed: ${error}`);
    process.exit(1);
  });
