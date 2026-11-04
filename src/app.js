import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import authorizationRoutes from "./routes/authorizationRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import inventoryUnitRoutes from "./routes/inventoryUnitRoutes.js";
import borrowRequestRoutes from "./routes/borrowRequestRoutes.js";
import borrowRequestReviewRoutes from "./routes/borrowRequestReviewRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/authorization", authorizationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/inventory-units", inventoryUnitRoutes);
app.use("/api/borrow-requests", borrowRequestRoutes);
app.use("/api/borrow-requests", borrowRequestReviewRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/loans", returnRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Campus Inventory API is running"
  });
});

export default app;
