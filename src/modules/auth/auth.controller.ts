import { Request, Response } from "express";
import { loginAdmin } from "./auth.service";
import { loginSchema } from "./auth.validation";
import { AuthRequest } from "../../middleware/auth.middleware";

import { formatErrorMessage } from "../../utils/error-formatter.js";

export async function login(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);

    const result = await loginAdmin(input);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.error("Login error:", error);
    const message = formatErrorMessage(error, "Invalid email or password");

    return res.status(401).json({
      success: false,
      message,
    });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  return res.status(200).json({
    success: true,
    message: "Authenticated user",
    data: {
      user: req.user,
    },
  });
}