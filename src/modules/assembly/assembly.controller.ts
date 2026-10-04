import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createAssembly,
  getCurrentAssembly,
} from "./assembly.service";
import { createAssemblySchema } from "./assembly.validation";

// ========================================
// POST /api/assemblies
// ========================================
//
// One-time assembly setup.
// Returns 409 if an assembly already exists.
//

export async function create(req: AuthRequest, res: Response) {
  try {
    const input = createAssemblySchema.parse(req.body);

    const assembly = await createAssembly(input, req.user?.id);

    return res.status(201).json({
      success: true,
      message: "Assembly created successfully",
      data: { assembly },
    });
  } catch (error) {
    console.error(error);

    const status =
      (error as { status?: number })?.status === 409 ? 409 : 400;

    return res.status(status).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create assembly",
    });
  }
}

// ========================================
// GET /api/assemblies
// ========================================
//
// Returns the single configured assembly.
// Returns 404 if no assembly exists.
//

export async function getOne(_req: Request, res: Response) {
  try {
    const assembly = await getCurrentAssembly();

    return res.status(200).json({
      success: true,
      data: { assembly },
    });
  } catch (error) {
    console.error(error);

    const status =
      (error as { status?: number })?.status === 404 ? 404 : 500;

    return res.status(status).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch assembly",
    });
  }
}