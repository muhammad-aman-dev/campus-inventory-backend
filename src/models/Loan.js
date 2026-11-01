import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
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
      required: true,
    },

    borrowRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BorrowRequest",
      required: true,
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    returnDate: {
      type: Date,
    },

    returnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["active", "overdue", "returned"],
      default: "active",
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Loan = mongoose.model("Loan", loanSchema);

export default Loan;