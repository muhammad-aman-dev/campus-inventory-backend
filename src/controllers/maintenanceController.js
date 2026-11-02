import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import InventoryUnit from "../models/InventoryUnit.js";
import Maintenance from "../models/Maintenance.js";
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  completeMaintenanceSchema,
  maintenanceQuerySchema,
  maintenanceIdSchema,
} from "../validators/maintenanceValidator.js";

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

const checkStaff = async (req, res) => {
  const user = await getLoggedInUser(req);

  if (!user || !user.isActive) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  if (!["staff", "admin"].includes(user.role)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }

  return user;
};

export const createMaintenance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const validation = createMaintenanceSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { inventoryUnit, issue, description, assignedTo, remarks } =
      validation.data;

    let maintenance;

    await session.withTransaction(async () => {
      const unit = await InventoryUnit.findOneAndUpdate(
        {
          _id: inventoryUnit,
          status: { $in: ["available", "on_loan"] },
        },
        {
          $set: {
            status: "maintenance",
            condition: "damaged",
          },
        },
        { new: true, session }
      );

      if (!unit) {
        throw new Error("UNIT_NOT_ELIGIBLE");
      }

      if (assignedTo) {
        const assignedUser = await User.findOne({
          _id: assignedTo,
          role: { $in: ["staff", "admin"] },
          isActive: true,
        }).session(session);

        if (!assignedUser) {
          throw new Error("INVALID_ASSIGNEE");
        }
      }

      const [record] = await Maintenance.create(
        [{
          inventoryUnit,
          reportedBy: user._id,
          assignedTo,
          issue,
          description,
          remarks,
          status: "pending",
          startDate: null,
        }],
        { session }
      );

      maintenance = record;
    });

    await maintenance.populate([
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "reportedBy", select: "name" },
      { path: "assignedTo", select: "name email" },
    ]);

    return res.status(201).json({
      message: "Maintenance reported successfully",
      maintenance,
    });
  } catch (error) {
    if (error.message === "UNIT_NOT_ELIGIBLE") {
      return res.status(409).json({
        message: "Unit is unavailable, already under maintenance, or retired",
      });
    }

    if (error.message === "INVALID_ASSIGNEE") {
      return res.status(400).json({
        message: "Assigned user must be an active staff member or admin",
      });
    }

    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

export const getAllMaintenance = async (req, res) => {
  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const validation = maintenanceQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { status, page, limit } = validation.data;
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Maintenance.find(filter)
        .populate("inventoryUnit", "assetCode condition status")
        .populate("reportedBy", "name")
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Maintenance.countDocuments(filter),
    ]);

    return res.status(200).json({
      maintenance: records,
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

export const getMaintenanceById = async (req, res) => {
  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const validation = maintenanceIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid maintenance ID",
      });
    }

    const maintenance = await Maintenance.findById(validation.data.id)
      .populate("inventoryUnit", "assetCode condition status")
      .populate("reportedBy", "name")
      .populate("assignedTo", "name email");

    if (!maintenance) {
      return res.status(404).json({
        message: "Maintenance record not found",
      });
    }

    return res.status(200).json({ maintenance });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateMaintenance = async (req, res) => {
  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const idValidation = maintenanceIdSchema.safeParse(req.params);
    const bodyValidation = updateMaintenanceSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    const updates = bodyValidation.data;

    if (updates.assignedTo) {
      const assignedUser = await User.findOne({
        _id: updates.assignedTo,
        role: { $in: ["staff", "admin"] },
        isActive: true,
      });

      if (!assignedUser) {
        return res.status(400).json({
          message: "Assigned user must be an active staff member or admin",
        });
      }
    }

    const maintenance = await Maintenance.findOneAndUpdate(
      {
        _id: idValidation.data.id,
        status: { $ne: "completed" },
      },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("inventoryUnit", "assetCode condition status")
      .populate("assignedTo", "name email");

    if (!maintenance) {
      return res.status(404).json({
        message: "Active maintenance record not found",
      });
    }

    return res.status(200).json({
      message: "Maintenance updated successfully",
      maintenance,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const startMaintenance = async (req, res) => {
  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const validation = maintenanceIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid maintenance ID",
      });
    }

    const maintenance = await Maintenance.findOneAndUpdate(
      {
        _id: validation.data.id,
        status: "pending",
      },
      {
        $set: {
          status: "in_progress",
          startDate: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!maintenance) {
      return res.status(404).json({
        message: "Pending maintenance record not found",
      });
    }

    return res.status(200).json({
      message: "Maintenance started successfully",
      maintenance,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const completeMaintenance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const user = await checkStaff(req, res);
    if (!user) return;

    const idValidation = maintenanceIdSchema.safeParse(req.params);
    const bodyValidation = completeMaintenanceSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    let completedRecord;

    await session.withTransaction(async () => {
      const record = await Maintenance.findOne({
        _id: idValidation.data.id,
        status: "in_progress",
      }).session(session);

      if (!record) {
        throw new Error("MAINTENANCE_NOT_IN_PROGRESS");
      }

      const unit = await InventoryUnit.findOne({
        _id: record.inventoryUnit,
        status: "maintenance",
      }).session(session);

      if (!unit) {
        throw new Error("UNIT_NOT_IN_MAINTENANCE");
      }

      unit.condition = bodyValidation.data.condition;

      unit.status = bodyValidation.data.condition === "damaged"
        ? "maintenance"
        : "available";

      await unit.save({ session });

      record.status = "completed";
      record.completionDate = new Date();

      if (bodyValidation.data.remarks) {
        record.remarks = bodyValidation.data.remarks;
      }

      await record.save({ session });

      completedRecord = record;
    });

    await completedRecord.populate([
      { path: "inventoryUnit", select: "assetCode condition status" },
      { path: "reportedBy", select: "name" },
      { path: "assignedTo", select: "name email" },
    ]);

    return res.status(200).json({
      message: "Maintenance completed successfully",
      maintenance: completedRecord,
    });
  } catch (error) {
    if (error.message === "MAINTENANCE_NOT_IN_PROGRESS") {
      return res.status(404).json({
        message: "In-progress maintenance record not found",
      });
    }

    if (error.message === "UNIT_NOT_IN_MAINTENANCE") {
      return res.status(409).json({
        message: "Inventory unit is not under maintenance",
      });
    }

    return res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};