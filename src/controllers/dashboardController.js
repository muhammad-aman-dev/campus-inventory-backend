import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Item from "../models/Item.js";
import InventoryUnit from "../models/InventoryUnit.js";
import BorrowRequest from "../models/BorrowRequest.js";
import Loan from "../models/Loan.js";
import Maintenance from "../models/Maintenance.js";

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

export const getDashboardStats = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    const now = new Date();

    const [
      totalItems,
      totalInventoryUnits,
      availableUnits,
      reservedUnits,
      unitsOnLoan,
      pendingRequests,
      activeLoans,
      overdueLoans,
      maintenanceRecords,
      totalStudents,
      totalStaff,
    ] = await Promise.all([
      Item.countDocuments({ isActive: true }),

      InventoryUnit.countDocuments({
        status: { $ne: "retired" },
      }),

      InventoryUnit.countDocuments({
        status: "available",
      }),

      InventoryUnit.countDocuments({
        status: "reserved",
      }),

      InventoryUnit.countDocuments({
        status: "on_loan",
      }),

      BorrowRequest.countDocuments({
        status: "pending",
      }),

      Loan.countDocuments({
        status: { $in: ["active", "overdue"] },
        returnDate: null,
      }),

      Loan.countDocuments({
        status: { $in: ["active", "overdue"] },
        dueDate: { $lt: now },
        returnDate: null,
      }),

      Maintenance.countDocuments({
        status: { $in: ["pending", "in_progress"] },
      }),

      User.countDocuments({
        role: "student",
        isActive: true,
      }),

      User.countDocuments({
        role: "staff",
        isActive: true,
      }),
    ]);

    return res.status(200).json({
      message: "Dashboard statistics retrieved successfully",
      dashboard: {
        totalItems,
        totalInventoryUnits,
        availableUnits,
        reservedUnits,
        unitsOnLoan,
        pendingRequests,
        activeLoans,
        overdueLoans,
        maintenanceRecords,
        totalStudents,
        totalStaff,
      },
      generatedAt: now,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};