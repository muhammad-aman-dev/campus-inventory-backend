import { z } from "zod";

const objectIdSchema = z.string().regex(
  /^[0-9a-fA-F]{24}$/,
  "Invalid ID"
);

export const createMaintenanceSchema = z.object({
  inventoryUnit: objectIdSchema,
  issue: z.string().trim().min(3).max(150),
  description: z.string().trim().max(1000).optional(), 
  assignedTo: objectIdSchema.optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const updateMaintenanceSchema = z.object({
  assignedTo: objectIdSchema.optional(),
  remarks: z.string().trim().max(500).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field is required"
);

export const completeMaintenanceSchema = z.object({
  condition: z.enum(["excellent", "good", "fair", "damaged"]),
  remarks: z.string().trim().max(500).optional(),
});

export const maintenanceQuerySchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const maintenanceIdSchema = z.object({
  id: objectIdSchema,
});