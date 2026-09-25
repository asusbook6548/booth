import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";

import {
  createBooth,
  getBooths,
  getBoothById,
  updateBooth,
} from "./booths.service";

import {
  createBoothSchema,
  updateBoothSchema,
} from "./booths.validation";

export async function create(req: AuthRequest, res: Response) {
  try {
    const input = createBoothSchema.parse(req.body);

    const booth = await createBooth(input, req.user?.id);

    return res.status(201).json({
      success: true,
      message: "Booth created successfully",
      data: {
        booth,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create booth",
    });
  }
}

export async function getAll(req: Request, res: Response) {
  try {
    const assemblyId =
      typeof req.query.assemblyId === "string"
        ? req.query.assemblyId
        : undefined;

    const booths = await getBooths(assemblyId);

    return res.status(200).json({
      success: true,
      data: {
        booths,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch booths",
    });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const booth = await getBoothById(
      String(req.params.id)
    );

    return res.status(200).json({
      success: true,
      data: {
        booth,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Booth not found",
    });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const input = updateBoothSchema.parse(req.body);

    const booth = await updateBooth(
      String(req.params.id),
      input,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      message: "Booth updated successfully",
      data: {
        booth,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update booth",
    });
  }
}