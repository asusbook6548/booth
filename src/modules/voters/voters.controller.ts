import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import {
  getVoters,
  getVoterById,
  updateVoter,
} from "./voters.service";

import {
  voterListQuerySchema,
  updateVoterSchema,
} from "./voters.validation";
import { formatErrorMessage } from "../../utils/error-formatter.js";

/**
 * GET /api/voters
 */
export async function getAllVoters(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      voterListQuerySchema.parse(
        req.query
      );

    const result =
      await getVoters(input);

    return res.status(200).json({
      success: true,

      message:
        "Voters fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Get voters error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to fetch voters");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

/**
 * GET /api/voters/:id
 */
export async function getOneVoter(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    const voter =
      await getVoterById(id);

    return res.status(200).json({
      success: true,
      message:
        "Voter fetched successfully",
      data: voter,
    });
  } catch (error) {
    console.error(
      "Get voter error:",
      error
    );

    const message = formatErrorMessage(error, "Voter not found");

    return res.status(404).json({
      success: false,
      message,
    });
  }
}

/**
 * PATCH /api/voters/:id
 */
export async function updateOneVoter(
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
      updateVoterSchema.parse(
        req.body
      );

    const voter =
      await updateVoter(
        id,
        input,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      message:
        "Voter updated successfully",
      data: voter,
    });
  } catch (error) {
    console.error(
      "Update voter error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to update voter");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}