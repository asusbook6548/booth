import { z } from "zod";

export const createBoothSchema = z.object({
  boothNumber: z.string().min(1).max(20).trim(),
  name: z.string().min(1).max(150).trim(),
  village: z.string().max(150).trim().optional(),
  assemblyId: z.string().uuid().optional(),
});

export const updateBoothSchema = z.object({
  boothNumber: z.string().min(1).max(20).trim().optional(),
  name: z.string().min(1).max(150).trim().optional(),
  village: z.string().max(150).trim().optional(),
  status: z
    .enum(["NOT_STARTED", "VOTING_STARTED", "PROBLEM"])
    .optional(),
});

export type CreateBoothInput =
  z.infer<typeof createBoothSchema>;

export type UpdateBoothInput =
  z.infer<typeof updateBoothSchema>;