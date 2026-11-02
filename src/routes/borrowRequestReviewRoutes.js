import express from "express";
import {
  approveBorrowRequest,
  rejectBorrowRequest,
} from "../controllers/borrowRequestReviewController.js";

const router = express.Router();

router.patch("/:id/approve", approveBorrowRequest);
router.patch("/:id/reject", rejectBorrowRequest);

export default router;   