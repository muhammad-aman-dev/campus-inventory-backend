import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    type: {
      type: String,
      enum: ["equipment", "book"],
      required: true,
    },

    author: {
      type: String,
      trim: true,
    },

    publisher: {
      type: String,
      trim: true,
    },

    isbn: {
      type: String,
      trim: true,
    },

    manufacturer: {
      type: String,
      trim: true,
    },

    modelNumber: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model("Item", itemSchema);

export default Item;