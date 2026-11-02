import { z } from "zod";

const objectIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  "Invalid ID"
);

export const createInventoryUnitSchema = z.object({
  item: objectIdSchema,
  assetCode: z.string().trim().min(2).max(50),
  condition: z.enum(["excellent", "good", "fair", "damaged"]).optional(),
  location: z.string().trim().max(150).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const updateInventoryUnitSchema = z.object({
  condition: z.enum(["excellent", "good", "fair", "damaged"]).optional(),
  location: z.string().trim().max(150).optional(),
  remarks: z.string().trim().max(500).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

export const inventoryUnitQuerySchema = z.object({
  item: objectIdSchema.optional(),
  status: z.enum([
    "available",
    "reserved",
    "on_loan",
    "maintenance",
    "retired",
  ]).optional(),
  condition: z.enum(["excellent", "good", "fair", "damaged"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const inventoryUnitIdSchema = z.object({
  id: objectIdSchema,
});