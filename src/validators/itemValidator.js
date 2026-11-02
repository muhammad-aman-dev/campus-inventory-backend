
import { z } from "zod";

export const createItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Item name must contain at least 2 characters")
    .max(150, "Item name cannot exceed 150 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  category: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID"),

  type: z.enum(["equipment", "book"]),

  author: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  modelNumber: z.string().trim().optional(),
  image: z.string().trim().optional(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const itemQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID")
    .optional(),
  type: z.enum(["equipment", "book"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
