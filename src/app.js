
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Campus Inventory API is running"
  });
});

export default app;
