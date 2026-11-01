import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    inventoryUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryUnit",
      required: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    issue: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    completionDate: {
      type: Date,
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
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

const Maintenance = mongoose.model(
  "Maintenance",
  maintenanceSchema
);

export default Maintenance;