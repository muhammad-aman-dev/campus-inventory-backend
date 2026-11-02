import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Loan from "../models/Loan.js";
import InventoryUnit from "../models/InventoryUnit.js";
import {
  returnLoanSchema,
  returnLoanIdSchema,
} from "../validators/returnValidator.js";

const getLoggedInUser = async (req) => {
  const token = req.cookies?.accessToken;

  if (!token) return null;

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch {
    return null;
  }

  return User.findById(decoded.id);
};

export const returnLoan = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const idValidation = returnLoanIdSchema.safeParse(req.params);
    const bodyValidation = returnLoanSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    const { condition, remarks } = bodyValidation.data;
    let returnedLoan;

    await session.withTransaction(async () => {
      const loan = await Loan.findOne({
        _id: idValidation.data.id,
        status: { $in: ["active", "overdue"] },
      }).session(session);

      if (!loan) {
        throw new Error("ACTIVE_LOAN_NOT_FOUND");
      }

      const unit = await InventoryUnit.findOne({
        _id: loan.inventoryUnit,
        status: "on_loan",
      }).session(session);

      if (!unit) {
        throw new Error("UNIT_NOT_ON_LOAN");
      }

      unit.condition = condition;
      unit.status = condition === "damaged" ? "maintenance" : "available";

      await unit.save({ session });

      loan.status = "returned";
      loan.returnDate = new Date();
      loan.returnedTo = user._id;

      if (remarks) {
        loan.remarks = remarks;
      }

      await loan.save({ session });

      returnedLoan = loan;
    });

    await returnedLoan.populate([
      { path: "student", select: "name email studentId" },
      { path: "item", select: "name type" },
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "returnedTo", select: "name" },
    ]);

    return res.status(200).json({
      message: "Item returned successfully",
      loan: returnedLoan,
    });
  } catch (error) {
    if (error.message === "ACTIVE_LOAN_NOT_FOUND") {
      return res.status(404).json({
        message: "Active loan not found or already returned",
      });
    }

    if (error.message === "UNIT_NOT_ON_LOAN") {
      return res.status(409).json({
        message: "Inventory unit is not currently on loan",
      });
    }

    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const getOverdueLoans = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Only staff and admins can view all overdue loans",
      });
    }

    const now = new Date();

    const overdueLoans = await Loan.find({
      status: { $in: ["active", "overdue"] },
      dueDate: { $lt: now },
      returnDate: null,
    })
      .populate("student", "name email studentId")
      .populate("item", "name type")
      .populate("inventoryUnit", "assetCode")
      .sort({ dueDate: 1 });

    return res.status(200).json({
      count: overdueLoans.length,
      overdueLoans,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};