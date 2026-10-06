import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import jobRoutes from "./routes/jobRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
connectDB();

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "../frontend/dist");


if(process.env.NODE_ENV !== "production")
{
      app.use(cors({origin: "http://localhost:5173"})); // Enable CORS for all routes
}


app.use(express.json({ limit: "1mb" }));

app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("JobLens API is running");
  });
}

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});