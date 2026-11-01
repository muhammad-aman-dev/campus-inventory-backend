import mongoose from "mongoose";

const inventoryUnitSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },

    assetCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    condition: {
      type: String,
      enum: ["excellent", "good", "fair", "damaged"],
      default: "good",
    },

    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "on_loan",
        "maintenance",
        "retired",
      ],
      default: "available",
    },

    location: {
      type: String,
      trim: true,
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

const InventoryUnit = mongoose.model(
  "InventoryUnit",
  inventoryUnitSchema
);

export default InventoryUnit;