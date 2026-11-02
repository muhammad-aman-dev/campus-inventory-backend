import { z } from "zod";

export const issueLoanSchema = z.object({
  borrowRequest: z.string().regex(
    /^[0-9a-fA-F]{24}$/,
    "Invalid borrow request ID"
  ),
  dueDate: z.coerce.date().optional(),
  remarks: z.string().trim().max(500).optional(),
});
 
export const loanQuerySchema = z.object({
  status: z.enum(["active", "overdue", "returned"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const loanIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid loan ID"),
});