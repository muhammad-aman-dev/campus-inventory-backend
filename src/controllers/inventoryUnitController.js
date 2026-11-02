import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Item from "../models/Item.js";
import InventoryUnit from "../models/InventoryUnit.js";
import {
  createInventoryUnitSchema,
  updateInventoryUnitSchema,
  inventoryUnitQuerySchema,
  inventoryUnitIdSchema,
} from "../validators/inventoryUnitValidator.js";

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

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const createInventoryUnit = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const validation = createInventoryUnitSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { item, assetCode, condition, location, remarks } = validation.data;

    const existingItem = await Item.findOne({
      _id: item,
      isActive: true,
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const existingUnit = await InventoryUnit.findOne({ assetCode });

    if (existingUnit) {
      return res.status(409).json({
        message: "Asset code already exists",
      });
    }

    const inventoryUnit = await InventoryUnit.create({
      item,
      assetCode,
      condition: condition || "good",
      location,
      remarks,
      status: "available",
    });

    await inventoryUnit.populate("item", "name type");

    return res.status(201).json({
      message: "Inventory unit created successfully",
      inventoryUnit,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Asset code already exists",
      });
    }

    return res.status(500).json({ message: error.message });
  }
};

export const getAllInventoryUnits = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = inventoryUnitQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { item, status, condition, search, page, limit } = validation.data;

    const filter = {};

    if (item) filter.item = item;
    if (condition) filter.condition = condition;

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: "retired" };
    }

    if (search) {
      filter.assetCode = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    }

    const skip = (page - 1) * limit;

    const [inventoryUnits, total] = await Promise.all([
      InventoryUnit.find(filter)
        .populate("item", "name type category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryUnit.countDocuments(filter),
    ]);

    return res.status(200).json({
      inventoryUnits,
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

export const getInventoryUnitById = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const validation = inventoryUnitIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid inventory unit ID",
      });
    }

    const inventoryUnit = await InventoryUnit.findById(validation.data.id)
      .populate("item", "name type category description");

    if (!inventoryUnit) {
      return res.status(404).json({
        message: "Inventory unit not found",
      });
    }

    if (inventoryUnit.status === "retired" && user.role !== "admin") {
      return res.status(404).json({
        message: "Inventory unit not found",
      });
    }

    return res.status(200).json({ inventoryUnit });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateInventoryUnit = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const idValidation = inventoryUnitIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return res.status(400).json({
        message: "Invalid inventory unit ID",
      });
    }

    const bodyValidation = updateInventoryUnitSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: bodyValidation.error.flatten(),
      });
    }

    const inventoryUnit = await InventoryUnit.findById(idValidation.data.id);

    if (!inventoryUnit || inventoryUnit.status === "retired") {
      return res.status(404).json({
        message: "Inventory unit not found",
      });
    }

    Object.assign(inventoryUnit, bodyValidation.data);

    await inventoryUnit.save();
    await inventoryUnit.populate("item", "name type");

    return res.status(200).json({
      message: "Inventory unit updated successfully",
      inventoryUnit,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const retireInventoryUnit = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can retire inventory units" });
    }

    const validation = inventoryUnitIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid inventory unit ID",
      });
    }

    const inventoryUnit = await InventoryUnit.findById(validation.data.id);

    if (!inventoryUnit || inventoryUnit.status === "retired") {
      return res.status(404).json({
        message: "Inventory unit not found",
      });
    }

    if (["reserved", "on_loan", "maintenance"].includes(inventoryUnit.status)) {
      return res.status(400).json({
        message: "This unit cannot be retired while reserved, on loan, or under maintenance",
      });
    }

    inventoryUnit.status = "retired";
    await inventoryUnit.save();

    return res.status(200).json({
      message: "Inventory unit retired successfully",
      inventoryUnit,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};