import { z } from "zod";

/**
 * Admin voter list filters
 */
export const voterListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z.string().trim().optional(),

  assemblyId: z.string().uuid().optional(),

  boothId: z.string().uuid().optional(),

  classification: z
    .enum(["GREEN", "YELLOW", "RED", "BLACK"])
    .optional(),

  verification: z
    .enum(["VERIFIED", "UNVERIFIED"])
    .optional(),

  voteStatus: z
    .enum(["PENDING", "DONE"])
    .optional(),

  gender: z.string().trim().optional(),
});

/**
 * Admin manual voter update
 */
export const updateVoterSchema = z.object({
  mobile: z
    .string()
    .max(20)
    .nullable()
    .optional(),

  classification: z
    .enum(["GREEN", "YELLOW", "RED", "BLACK"])
    .nullable()
    .optional(),

  verification: z
    .enum(["VERIFIED", "UNVERIFIED"])
    .optional(),

  voteStatus: z
    .enum(["PENDING", "DONE"])
    .optional(),
});

/**
 * Parsed voter row
 */
export const parsedVoterRowSchema = z.object({
  epic: z.string().min(1).max(50),

  name: z.string().min(1).max(150),

  fatherName: z
    .string()
    .max(150)
    .nullable(),

  motherName: z
    .string()
    .max(150)
    .nullable(),

  husbandName: z
    .string()
    .max(150)
    .nullable(),

  houseNumber: z
    .string()
    .max(100)
    .nullable(),

  gender: z
    .string()
    .max(20)
    .nullable(),

  age: z
    .number()
    .int()
    .min(0)
    .max(120)
    .nullable(),

  mobile: z
    .string()
    .max(20)
    .nullable(),

  assemblyId: z.string().uuid(),

  boothId: z.string().uuid(),

  boothNumber: z
    .string()
    .max(20),

  partSerial: z
    .string()
    .max(50)
    .nullable(),

  pollingStationName: z
    .string()
    .max(255)
    .nullable(),
});

export type VoterListQueryInput =
  z.infer<typeof voterListQuerySchema>;

export type UpdateVoterInput =
  z.infer<typeof updateVoterSchema>;

export type ParsedVoterRow =
  z.infer<typeof parsedVoterRowSchema>;