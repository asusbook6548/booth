import { Request, Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import {
  createVolunteer,
  getVolunteers,
  getVolunteerById,
  updateVolunteer,
  assignBooth,
  unassignBooth,
} from "./volunteer.service";

import {
  createVolunteerSchema,
  updateVolunteerSchema,
  assignBoothSchema,
} from "./volunteer.validation";
import { formatErrorMessage } from "../../utils/error-formatter.js";

/**
 * POST /api/volunteers
 */
export async function create(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const input =
      createVolunteerSchema.parse(
        req.body
      );

    const volunteer =
      await createVolunteer(
        input,
        req.user.id
      );

    return res.status(201).json({
      success: true,
      message:
        "Volunteer created successfully",
      data: volunteer,
    });
  } catch (error) {
    console.error(
      "Create volunteer error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to create volunteer");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

/**
 * GET /api/volunteers
 */
export async function getAll(
  _req: AuthRequest,
  res: Response
) {
  try {
    const volunteers =
      await getVolunteers();

    return res.status(200).json({
      success: true,
      message:
        "Volunteers fetched successfully",
      data: volunteers,
    });
  } catch (error) {
    console.error(
      "Get volunteers error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to fetch volunteers");

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/**
 * GET /api/volunteers/:id
 */
export async function getOne(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const volunteer =
      await getVolunteerById(id);

    return res.status(200).json({
      success: true,
      message:
        "Volunteer fetched successfully",
      data: volunteer,
    });
  } catch (error) {
    console.error(
      "Get volunteer error:",
      error
    );

    const message = formatErrorMessage(error, "Volunteer not found");

    return res.status(404).json({
      success: false,
      message,
    });
  }
}

/**
 * PATCH /api/volunteers/:id
 */
export async function update(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const id =
      String(req.params.id);

    const input =
      updateVolunteerSchema.parse(
        req.body
      );

    const volunteer =
      await updateVolunteer(
        id,
        input,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message:
        "Volunteer updated successfully",
      data: volunteer,
    });
  } catch (error) {
    console.error(
      "Update volunteer error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to update volunteer");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

/**
 * PATCH /api/volunteers/:id/assign-booth
 */
export async function assign(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const volunteerId =
      String(req.params.id);

    const input =
      assignBoothSchema.parse(
        req.body
      );

    const result =
      await assignBooth(
        volunteerId,
        input.boothId,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message:
        "Booth assigned successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Assign booth error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to assign booth");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

/**
 * DELETE /api/volunteers/:id/assign-booth
 */
export async function unassign(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const volunteerId =
      String(req.params.id);

    const result =
      await unassignBooth(
        volunteerId,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message:
        "Booth unassigned successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Unassign booth error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to unassign booth");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}