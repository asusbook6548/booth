import { z } from "zod";

export const createAssemblySchema = z.object({
  number: z.string().min(1).max(20).trim(),
  name: z.string().min(2).max(100).trim(),
  district: z.string().min(2).max(100).trim(),
  electionYear: z.number().int().min(2000).max(2100),
});

export type CreateAssemblyInput =
  z.infer<typeof createAssemblySchema>;