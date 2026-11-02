import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  createStaffSchema,
  updateStaffSchema,
  staffIdSchema,
  staffQuerySchema,
} from "../validators/staffValidator.js";

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

const checkAdmin = async (req, res) => {
  const user = await getLoggedInUser(req);

  if (!user || !user.isActive) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  if (user.role !== "admin") {
    res.status(403).json({ message: "Only admins can manage staff accounts" });
    return null;
  }

  return user;
};

export const createStaff = async (req, res) => {
  try {
    const admin = await checkAdmin(req, res);

    if (!admin) return;

    const validation = createStaffSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { name, email, password, department } = validation.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const staff = await User.create({
      name,
      email,
      password,
      department,
      role: "staff",
      isActive: true,
    });

    return res.status(201).json({
      message: "Staff account created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        department: staff.department,
        isActive: staff.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({ message: error.message });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    const admin = await checkAdmin(req, res);

    if (!admin) return;

    const validation = staffQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const { search, page, limit } = validation.data;

    const filter = { role: "staff" };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
        { department: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [staffMembers, total] = await Promise.all([
      User.find(filter)
        .select("name email role department isActive createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      staff: staffMembers,
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

export const getStaffById = async (req, res) => {
  try {
    const admin = await checkAdmin(req, res);

    if (!admin) return;

    const validation = staffIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await User.findOne({
      _id: validation.data.id,
      role: "staff",
    }).select("name email role department isActive createdAt");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    return res.status(200).json({ staff });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const admin = await checkAdmin(req, res);

    if (!admin) return;

    const idValidation = staffIdSchema.safeParse(req.params);
    const bodyValidation = updateStaffSchema.safeParse(req.body);

    if (!idValidation.success || !bodyValidation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: {
          params: idValidation.success ? undefined : idValidation.error.flatten(),
          body: bodyValidation.success ? undefined : bodyValidation.error.flatten(),
        },
      });
    }

    const staff = await User.findOneAndUpdate(
      {
        _id: idValidation.data.id,
        role: "staff",
      },
      {
        $set: bodyValidation.data,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("name email role department isActive createdAt");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      message: "Staff details updated successfully",
      staff,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deactivateStaff = async (req, res) => {
  try {
    const admin = await checkAdmin(req, res);

    if (!admin) return;

    const validation = staffIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await User.findOneAndUpdate(
      {
        _id: validation.data.id,
        role: "staff",
        isActive: true,
      },
      {
        $set: { isActive: false },
        $unset: { refreshToken: 1 },
      },
      {
        new: true,
      }
    ).select("name email role department isActive");

    if (!staff) {
      return res.status(404).json({
        message: "Active staff member not found",
      });
    }

    return res.status(200).json({
      message: "Staff account deactivated successfully",
      staff,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};