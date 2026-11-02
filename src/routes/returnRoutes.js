import express from "express";
import {
  returnLoan,
  getOverdueLoans,
} from "../controllers/returnController.js";

const router = express.Router();

router.patch("/:id/return", returnLoan);
router.get("/overdue", getOverdueLoans);

export default router;