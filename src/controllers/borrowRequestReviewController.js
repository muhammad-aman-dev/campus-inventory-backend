import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import BorrowRequest from "../models/BorrowRequest.js";
import InventoryUnit from "../models/InventoryUnit.js";
import {
  approveBorrowRequestSchema,
  rejectBorrowRequestSchema,
  reviewBorrowRequestIdSchema,
} from "../validators/borrowRequestReviewValidator.js";

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

export const approveBorrowRequest = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const idValidation = reviewBorrowRequestIdSchema.safeParse(req.params);
    const bodyValidation = approveBorrowRequestSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    const { id } = idValidation.data;
    const { inventoryUnit } = bodyValidation.data;

    let approvedRequest;

    await session.withTransaction(async () => {
      const borrowRequest = await BorrowRequest.findOne({
        _id: id,
        status: "pending",
      }).session(session);

      if (!borrowRequest) {
        throw new Error("PENDING_REQUEST_NOT_FOUND");
      }

      const unit = await InventoryUnit.findOneAndUpdate(
        {
          _id: inventoryUnit,
          item: borrowRequest.item,
          status: "available",
        },
        {
          $set: { status: "reserved" },
        },
        {
          new: true,
          session,
        }
      );

      if (!unit) {
        throw new Error("UNIT_NOT_AVAILABLE");
      }

      borrowRequest.inventoryUnit = unit._id;
      borrowRequest.status = "approved";
      borrowRequest.reviewedBy = user._id;
      borrowRequest.reviewedAt = new Date();

      await borrowRequest.save({ session });

      approvedRequest = borrowRequest;
    });

    await approvedRequest.populate([
      { path: "student", select: "name email studentId" },
      { path: "item", select: "name type" },
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "reviewedBy", select: "name" },
    ]);

    return res.status(200).json({
      message: "Borrow request approved and unit reserved successfully",
      borrowRequest: approvedRequest,
    });
  } catch (error) {
    if (error.message === "PENDING_REQUEST_NOT_FOUND") {
      return res.status(404).json({
        message: "Pending borrow request not found",
      });
    }

    if (error.message === "UNIT_NOT_AVAILABLE") {
      return res.status(409).json({
        message: "Selected unit is unavailable or does not belong to this item",
      });
    }

    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const rejectBorrowRequest = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const idValidation = reviewBorrowRequestIdSchema.safeParse(req.params);
    const bodyValidation = rejectBorrowRequestSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    const borrowRequest = await BorrowRequest.findOneAndUpdate(
      {
        _id: idValidation.data.id,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: bodyValidation.data.rejectionReason,
          reviewedBy: user._id,
          reviewedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("student", "name email studentId")
      .populate("item", "name type")
      .populate("reviewedBy", "name");

    if (!borrowRequest) {
      return res.status(404).json({
        message: "Pending borrow request not found",
      });
    }

    return res.status(200).json({
      message: "Borrow request rejected successfully",
      borrowRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};