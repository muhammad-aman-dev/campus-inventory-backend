import express from "express";
import {
  createInventoryUnit,
  getAllInventoryUnits,
  getInventoryUnitById,
  updateInventoryUnit,
  retireInventoryUnit,
} from "../controllers/inventoryUnitController.js";

const router = express.Router();

router.post("/", createInventoryUnit);
router.get("/", getAllInventoryUnits);
router.get("/:id", getInventoryUnitById);
router.put("/:id", updateInventoryUnit);
router.patch("/:id/retire", retireInventoryUnit);

export default router;