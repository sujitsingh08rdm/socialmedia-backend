import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import app from "./app.js";
import connectToDB from "./config/db.js";

const port = process.env.PORT || 4001;

connectToDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("server Error : ", error);
      throw error;
    });
    app.listen(port, () => {
      console.log(`Server running on PORT ${port} successfully..`);
    });
  })
  .catch((error) => {
    console.error(`MongoDB Connection failed: ${error}`);
  });
