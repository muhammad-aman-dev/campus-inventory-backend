import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import BorrowRequest from "../models/BorrowRequest.js";
import InventoryUnit from "../models/InventoryUnit.js";
import Loan from "../models/Loan.js";
import {
  issueLoanSchema,
  loanQuerySchema,
  loanIdSchema,
} from "../validators/loanValidator.js";

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

export const issueLoan = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const validation = issueLoanSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { borrowRequest, dueDate, remarks } = validation.data;

    let createdLoan;

    await session.withTransaction(async () => {
      const request = await BorrowRequest.findOne({
        _id: borrowRequest,
        status: "approved",
      }).session(session);

      if (!request) {
        throw new Error("APPROVED_REQUEST_NOT_FOUND");
      }

      if (!request.inventoryUnit) {
        throw new Error("REQUEST_HAS_NO_UNIT");
      }

      const finalDueDate = dueDate || request.requestedDueDate;

      if (finalDueDate <= new Date()) {
        throw new Error("INVALID_DUE_DATE");
      }

      const unit = await InventoryUnit.findOneAndUpdate(
        {
          _id: request.inventoryUnit,
          item: request.item,
          status: "reserved",
        },
        {
          $set: { status: "on_loan" },
        },
        {
          new: true,
          session,
        }
      );

      if (!unit) {
        throw new Error("UNIT_NOT_RESERVED");
      }

      const existingLoan = await Loan.findOne({
        borrowRequest: request._id,
      }).session(session);

      if (existingLoan) {
        throw new Error("LOAN_ALREADY_EXISTS");
      }

      const [loan] = await Loan.create(
        [{
          student: request.student,
          item: request.item,
          inventoryUnit: unit._id,
          borrowRequest: request._id,
          issuedBy: user._id,
          issueDate: new Date(),
          dueDate: finalDueDate,
          status: "active",
          remarks,
        }],
        { session }
      );

      request.status = "issued";
      await request.save({ session });

      createdLoan = loan;
    });

    await createdLoan.populate([
      { path: "student", select: "name email studentId" },
      { path: "item", select: "name type" },
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "issuedBy", select: "name" },
    ]);

    return res.status(201).json({
      message: "Item issued successfully",
      loan: createdLoan,
    });
  } catch (error) {
    if (error.message === "APPROVED_REQUEST_NOT_FOUND") {
      return res.status(404).json({
        message: "Approved borrow request not found",
      });
    }

    if (error.message === "REQUEST_HAS_NO_UNIT") {
      return res.status(400).json({
        message: "No inventory unit is assigned to this request",
      });
    }

    if (error.message === "INVALID_DUE_DATE") {
      return res.status(400).json({
        message: "Due date must be in the future",
      });
    }

    if (error.message === "UNIT_NOT_RESERVED") {
      return res.status(409).json({
        message: "Inventory unit is not reserved for this request",
      });
    }

    if (error.message === "LOAN_ALREADY_EXISTS") {
      return res.status(409).json({
        message: "This request has already been issued",
      });
    }

    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const getAllLoans = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = loanQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { status, page, limit } = validation.data;

    const filter = {};

    if (user.role === "student") {
      filter.student = user._id;
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate("student", "name email studentId")
        .populate("item", "name type")
        .populate("inventoryUnit", "assetCode condition status")
        .populate("issuedBy", "name")
        .populate("returnedTo", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Loan.countDocuments(filter),
    ]);

    return res.status(200).json({
      loans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getLoanById = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = loanIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid loan ID",
      });
    }

    const filter = { _id: validation.data.id };

    if (user.role === "student") {
      filter.student = user._id;
    }

    const loan = await Loan.findOne(filter)
      .populate("student", "name email studentId")
      .populate("item", "name type")
      .populate("inventoryUnit", "assetCode condition status")
      .populate("issuedBy", "name")
      .populate("returnedTo", "name");

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    return res.status(200).json({ loan });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};