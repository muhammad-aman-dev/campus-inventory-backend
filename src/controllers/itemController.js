
import Item from "../models/Item.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

import {
  createItemSchema,
  updateItemSchema,
  itemQuerySchema,
} from "../validators/itemValidator.js";

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

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

export const createItem = async (req, res) => {
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

    const validation = createItemSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const category = await Category.findOne({
      _id: validation.data.category,
      isActive: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Active category not found",
      });
    }

    if (category.type !== validation.data.type) {
      return res.status(400).json({
        success: false,
        message: "Item type must match category type",
      });
    }

    const item = await Item.create(validation.data);

    const populatedItem = await Item.findById(item._id)
      .populate("category", "name type");

    return res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: {
        item: populatedItem,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllItems = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const validation = itemQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      search,
      category,
      type,
      page,
      limit,
    } = validation.data;

    const filter = {
      isActive: true,
    };

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.name = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    }

    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      Item.find(filter)
        .populate("category", "name type")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),

      Item.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: items.length,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      data: {
        items,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getItemById = async (req, res) => {
  try {
    const user = await getLoggedInUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    const item = await Item.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate("category", "name type");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        item,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateItem = async (req, res) => {
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

    const validation = updateItemSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    if (validation.data.category || validation.data.type) {
      const existingItem = await Item.findById(req.params.id);

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      const categoryId =
        validation.data.category || existingItem.category;

      const itemType =
        validation.data.type || existingItem.type;

      const category = await Category.findOne({
        _id: categoryId,
        isActive: true,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Active category not found",
        });
      }

      if (category.type !== itemType) {
        return res.status(400).json({
          success: false,
          message: "Item type must match category type",
        });
      }
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      validation.data,
      {
        new: true,
        runValidators: true,
      }
    ).populate("category", "name type");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: {
        item,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteItem = async (req, res) => {
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

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Item deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
