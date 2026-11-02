
import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const getCurrentUser = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account inactive",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          department: user.department,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Access token is invalid or expired",
    });
  }
};

export const requireStaff = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account inactive",
      });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Staff access required.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff access granted",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Access token is invalid or expired",
    });
  }
};

export const requireAdmin = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account inactive",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin access required.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin access granted",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Access token is invalid or expired",
    });
  }
};
