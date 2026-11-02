
import express from "express";

import {
  getCurrentUser,
  requireStaff,
  requireAdmin,
} from "../controllers/authorizationController.js";

const router = express.Router();

router.get("/me", getCurrentUser);
router.get("/staff-check", requireStaff);
router.get("/admin-check", requireAdmin);

export default router;
