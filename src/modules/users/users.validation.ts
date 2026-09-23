import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100),

  email: z
    .string()
    .trim()
    .email("Invalid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),

  role: z
    .enum(["ADMIN"])
    .optional()
    .default("ADMIN"),

  status: z
    .enum(["ACTIVE", "INACTIVE"])
    .optional()
    .default("ACTIVE"),
});

export type CreateUserInput = z.infer<
  typeof createUserSchema
>;

export const userListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z.string().trim().optional(),

  status: z
    .enum(["ACTIVE", "INACTIVE"])
    .optional(),
});

export type UserListInput = z.infer<
  typeof userListSchema
>;

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  email: z
    .string()
    .trim()
    .email()
    .optional(),
});

export type UpdateUserInput = z.infer<
  typeof updateUserSchema
>;

export const updateStatusSchema = z.object({
  status: z.enum([
    "ACTIVE",
    "INACTIVE",
  ]),
});

export type UpdateStatusInput = z.infer<
  typeof updateStatusSchema
>;

export const updatePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8)
    .max(100),
});

export type UpdatePasswordInput = z.infer<
  typeof updatePasswordSchema
>;