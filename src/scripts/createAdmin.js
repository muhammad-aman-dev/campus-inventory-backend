import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = (process.env.ADMIN_EMAIL || "admin@campus.com").toLowerCase();

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || "System Admin",
      email,
      password: process.env.ADMIN_PASSWORD || "Admin@12345",
      role: "admin",
    });

    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});