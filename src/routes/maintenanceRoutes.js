import express from "express";
import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenance,
  startMaintenance,
  completeMaintenance,
} from "../controllers/maintenanceController.js";

const router = express.Router();

router.post("/", createMaintenance);
router.get("/", getAllMaintenance);
router.get("/:id", getMaintenanceById);
router.put("/:id", updateMaintenance);
router.patch("/:id/start", startMaintenance);
router.patch("/:id/complete", completeMaintenance);

export default router;