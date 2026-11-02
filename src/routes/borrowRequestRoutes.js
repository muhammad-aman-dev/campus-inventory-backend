import express from "express";
import {
  createBorrowRequest,
  getAllBorrowRequests,
  getBorrowRequestById,
  cancelBorrowRequest,
} from "../controllers/borrowRequestController.js";

const router = express.Router();

router.post("/", createBorrowRequest);
router.get("/", getAllBorrowRequests);
router.get("/:id", getBorrowRequestById);
router.patch("/:id/cancel", cancelBorrowRequest);

export default router;