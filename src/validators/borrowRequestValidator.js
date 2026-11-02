import { z } from "zod";

export const createBorrowRequestSchema = z.object({
  item: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid item ID"),
  inventoryUnit: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid inventory unit ID").optional(),
  requestedDueDate: z.coerce.date().refine(
    (date) => date > new Date(),
    "Due date must be in the future"
  ),
  purpose: z.string().trim().min(3).max(500),
});

export const borrowRequestQuerySchema = z.object({
  status: z.enum([
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "issued",
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const borrowRequestIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid request ID"),
});