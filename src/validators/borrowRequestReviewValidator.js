import { z } from "zod";

export const approveBorrowRequestSchema = z.object({
  inventoryUnit: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid inventory unit ID"
  ),
});

export const rejectBorrowRequestSchema = z.object({
  rejectionReason: z.string().trim().min(3).max(500),
});

export const reviewBorrowRequestIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid request ID"),
});