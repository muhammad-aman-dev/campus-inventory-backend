import express from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
  getProfile,
  logout,
  refreshAccessToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email requests. Please try again later.",
  },
});

router.post("/register", register);
router.post("/login", login);
router.get("/profile", getProfile);
router.post("/logout", logout);
router.post("/refresh", refreshAccessToken);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", emailLimiter, resendVerification);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

export default router;