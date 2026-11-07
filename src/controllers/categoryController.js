
import Category from "../models/Category.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validators/categoryValidator.js";
import Item from "../models/Item.js";

const getLoggedInUser = async (req) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return null;
  }

  const decoded = jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET
  );

  const user = await User.findById(decoded.id);

  if (!user || !user.isActive) {
    return null;
  }

  return user;
};

export const createCategory = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Staff access required",
      });
    }

    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingCategory = await Category.findOne({
      name: validation.data.name,
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create(validation.data);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const categories = await Category.find()
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: {
        categories,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    if (!["staff", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Staff access required",
      });
    }

    const validation = updateCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      validation.data,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: {
        category,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const itemCount = await Item.countDocuments({
      category: req.params.id,
    });

    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: "This category still has items. Remove or move them first.",
      });
    }

    const category = await Category.findByIdAndDelete(
      req.params.id
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
