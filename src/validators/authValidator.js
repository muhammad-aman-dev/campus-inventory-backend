import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(6, "Password must contain at least 6 characters"),

  studentId: z
    .string()
    .trim()
    .optional(),

  department: z
    .string()
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required"),
});

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .transform((value) => value.toLowerCase()),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  password: z
    .string()
    .min(6, "Password must contain at least 6 characters"),
});