import { z } from "zod";

const objectIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  "Invalid user ID"
);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(100),
  department: z.string().trim().max(100).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().max(100).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

export const staffIdSchema = z.object({
  id: objectIdSchema,
});

export const staffQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});