
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import {
  registerSchema,
  loginSchema,
} from "../validators/authValidator.js";

const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d",
    }
  );
};

const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const clearTokenCookies = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });
};

const getSafeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    department: user.department,
  };
};

export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const {
      name,
      email,
      password,
      studentId,
      department,
    } = validation.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      studentId,
      department,
      role: "student",
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: getSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email })
      .select("+password +refreshToken");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save();

    setTokenCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: getSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Access token not found. Please log in.",
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
        user: getSafeUser(user),
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Access token is invalid or expired",
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found. Please log in again.",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id)
      .select("+refreshToken");

    if (!user || !user.isActive || !user.refreshToken) {
      clearTokenCookies(res);

      return res.status(401).json({
        success: false,
        message: "Invalid refresh session. Please log in again.",
      });
    }

    const incomingTokenHash = hashRefreshToken(refreshToken);

    if (incomingTokenHash !== user.refreshToken) {
      clearTokenCookies(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token is no longer valid. Please log in again.",
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = hashRefreshToken(newRefreshToken);
    await user.save();

    setTokenCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  } catch (error) {
    clearTokenCookies(res);

    return res.status(401).json({
      success: false,
      message: "Refresh token is invalid or expired. Please log in again.",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decoded.id)
          .select("+refreshToken");

        if (
          user &&
          user.refreshToken === hashRefreshToken(refreshToken)
        ) {
          user.refreshToken = null;
          await user.save();
        }
      } catch (error) {
      }
    }

    clearTokenCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
