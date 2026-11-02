import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Item from "../models/Item.js";
import InventoryUnit from "../models/InventoryUnit.js";
import BorrowRequest from "../models/BorrowRequest.js";
import {
  createBorrowRequestSchema,
  borrowRequestQuerySchema,
  borrowRequestIdSchema,
} from "../validators/borrowRequestValidator.js";

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

export const createBorrowRequest = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "student") {
      return res.status(403).json({
        message: "Only students can create borrow requests",
      });
    }

    const validation = createBorrowRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { item, inventoryUnit, requestedDueDate, purpose } = validation.data;

    const existingItem = await Item.findOne({
      _id: item,
      isActive: true,
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    let selectedUnit = null;

    if (inventoryUnit) {
      selectedUnit = await InventoryUnit.findOne({
        _id: inventoryUnit,
        item,
        status: "available",
      });

      if (!selectedUnit) {
        return res.status(400).json({
          message: "Selected inventory unit is unavailable or does not belong to this item",
        });
      }
    }

    const borrowRequest = await BorrowRequest.create({
      student: user._id,
      item,
      inventoryUnit: selectedUnit?._id || null,
      requestedDueDate,
      purpose,
      status: "pending",
    });

    await borrowRequest.populate([
      { path: "item", select: "name type" },
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "student", select: "name email studentId" },
    ]);

    return res.status(201).json({
      message: "Borrow request submitted successfully",
      borrowRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllBorrowRequests = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = borrowRequestQuerySchema.safeParse(req.query);

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

    const [requests, total] = await Promise.all([
      BorrowRequest.find(filter)
        .populate("student", "name email studentId")
        .populate("item", "name type")
        .populate("inventoryUnit", "assetCode condition status")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BorrowRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      requests,
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

export const getBorrowRequestById = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = borrowRequestIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid borrow request ID",
      });
    }

    const filter = { _id: validation.data.id };

    if (user.role === "student") {
      filter.student = user._id;
    }

    const borrowRequest = await BorrowRequest.findOne(filter)
      .populate("student", "name email studentId")
      .populate("item", "name type")
      .populate("inventoryUnit", "assetCode condition status")
      .populate("reviewedBy", "name");

    if (!borrowRequest) {
      return res.status(404).json({
        message: "Borrow request not found",
      });
    }

    return res.status(200).json({ borrowRequest });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelBorrowRequest = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "student") {
      return res.status(403).json({
        message: "Only students can cancel their requests",
      });
    }

    const validation = borrowRequestIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid borrow request ID",
      });
    }

    const borrowRequest = await BorrowRequest.findOneAndUpdate(
      {
        _id: validation.data.id,
        student: user._id,
        status: "pending",
      },
      {
        $set: { status: "cancelled" },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!borrowRequest) {
      return res.status(404).json({
        message: "Pending borrow request not found",
      });
    }

    return res.status(200).json({
      message: "Borrow request cancelled successfully",
      borrowRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};