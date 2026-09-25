import { z } from "zod";

export const auditLogFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  volunteerId: z.string().uuid().optional(),
  voterId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;
