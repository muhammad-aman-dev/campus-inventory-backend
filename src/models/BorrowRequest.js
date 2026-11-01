import mongoose from "mongoose";

const borrowRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    inventoryUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryUnit",
    },

    requestDate: {
      type: Date,
      default: Date.now,
    },

    requestedDueDate: {
      type: Date,
      required: true,
    },

    purpose: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "issued",
      ],
      default: "pending",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const BorrowRequest = mongoose.model(
  "BorrowRequest",
  borrowRequestSchema
);

export default BorrowRequest;