import express from "express";
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
} from "../controllers/staffController.js";

const router = express.Router();

router.post("/", createStaff);
router.get("/", getAllStaff);
router.get("/:id", getStaffById);
router.put("/:id", updateStaff);
router.patch("/:id/deactivate", deactivateStaff);

export default router;