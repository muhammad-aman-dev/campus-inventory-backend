import express from "express";
import {
  issueLoan,
  getAllLoans,
  getLoanById,
} from "../controllers/loanController.js";

const router = express.Router();

router.post("/issue", issueLoan);
router.get("/", getAllLoans);
router.get("/:id", getLoanById);

export default router;