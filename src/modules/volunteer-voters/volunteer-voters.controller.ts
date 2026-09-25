import { Response } from "express";
import { VolunteerAuthRequest } from "../../middleware/volunteer-auth.middleware";
import {
  updateMyBoothVoter,
  getMyBoothVoters,
} from "./volunteer-voters.service";
import {
  updateVoterSchema,
  voterFilterSchema,
} from "./volunteer-voters.validation";

export async function getVoters(
  req: VolunteerAuthRequest,
  res: Response
) {
  try {
    if (!req.volunteer) {
      return res.status(401).json({
        success: false,
        message: "Volunteer authentication required",
      });
    }

    const filters = voterFilterSchema.parse(req.query);

    const result = await getMyBoothVoters(
      req.volunteer.id,
      filters
    );

    return res.status(200).json({
      success: true,
      message: "Booth voters fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);

    const status =
      (error as { statusCode?: number })?.statusCode || 400;

    return res.status(status).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch voters",
    });
  }
}

export async function updateVoter(
  req: VolunteerAuthRequest,
  res: Response
) {
  try {
    if (!req.volunteer) {
      return res.status(401).json({
        success: false,
        message: "Volunteer authentication required",
      });
    }

    const voterId = String(req.params.id);

    const input = updateVoterSchema.parse(req.body);

    const voter = await updateMyBoothVoter(
      req.volunteer.id,
      voterId,
      input
    );

    return res.status(200).json({
      success: true,
      message: "Voter updated successfully",
      data: voter,
    });
  } catch (error) {
    console.error(error);

    const status =
      (error as { statusCode?: number })?.statusCode || 400;

    return res.status(status).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update voter",
    });
  }
}