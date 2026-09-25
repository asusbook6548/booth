import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createAssembly,
  getAssemblies,
  getAssemblyById,
  updateAssembly,
} from "./assembly.service";
import {
  createAssemblySchema,
  updateAssemblySchema,
} from "./assembly.validation";

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

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create assembly",
    });
  }
}

export async function getAll(_req: Request, res: Response) {
  try {
    const assemblies = await getAssemblies();

    return res.status(200).json({
      success: true,
      data: { assemblies },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assemblies",
    });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const assembly = await getAssemblyById(
      String(req.params.id)
    );

    return res.status(200).json({
      success: true,
      data: { assembly },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Assembly not found",
    });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const input = updateAssemblySchema.parse(req.body);

    const assembly = await updateAssembly(
      String(req.params.id),
      input,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      message: "Assembly updated successfully",
      data: { assembly },
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update assembly",
    });
  }
}