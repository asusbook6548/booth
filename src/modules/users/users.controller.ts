import {
  Request,
  Response,
} from "express";

import type {
  AuthRequest,
} from "../../middleware/auth.middleware.js";

import {
  createUserSchema,
  userListSchema,
  updateUserSchema,
  updateStatusSchema,
  updatePasswordSchema,
} from "./users.validation.js";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  updateUserPassword,
} from "./users.service.js";

/**
 * POST /api/users
 */
export async function createNewUser(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      createUserSchema.parse(
        req.body
      );

    const result =
      await createUser(
        input,
        req.user?.id
      );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create user";

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

/**
 * GET /api/users
 */
export async function listUsers(
  req: Request,
  res: Response
) {
  try {
    const input =
      userListSchema.parse(
        req.query
      );

    const result =
      await getUsers(input);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "List users error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch users",
    });
  }
}

/**
 * GET /api/users/:id
 */
export async function getUser(
  req: Request,
  res: Response
) {
  try {
    const user =
      await getUserById(
        String(req.params.id)
      );

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(
      "Get user error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch user";

    return res.status(
      message === "User not found"
        ? 404
        : 400
    ).json({
      success: false,
      message,
    });
  }
}

/**
 * PATCH /api/users/:id
 */
export async function editUser(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      updateUserSchema.parse(
        req.body
      );

    const user =
      await updateUser(
        String(req.params.id),
        input,
        req.user!.id
      );

    return res.json({
      success: true,
      message:
        "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user",
    });
  }
}

/**
 * PATCH /api/users/:id/status
 */
export async function changeUserStatus(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      updateStatusSchema.parse(
        req.body
      );

    const user =
      await updateUserStatus(
        String(req.params.id),
        input,
        req.user!.id
      );

    return res.json({
      success: true,
      message:
        "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      "Update user status error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user status",
    });
  }
}

/**
 * PATCH /api/users/:id/password
 */
export async function changeUserPassword(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      updatePasswordSchema.parse(
        req.body
      );

    const result =
      await updateUserPassword(
        String(req.params.id),
        input.newPassword,
        req.user!.id
      );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Update password error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update password",
    });
  }
}