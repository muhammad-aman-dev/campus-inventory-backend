import { z } from "zod";

export const returnLoanSchema = z.object({
  condition: z.enum([
    "excellent",
    "good",
    "fair",
    "damaged",
  ]),
  remarks: z.string().trim().max(500).optional(),
});

export const returnLoanIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid loan ID"),
});