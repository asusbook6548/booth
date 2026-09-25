import {
  Request,
  Response,
} from "express";

import type {
  AuthRequest,
} from "../../middleware/auth.middleware.js";

import {
  updateSettingsSchema,
} from "./settings.validation.js";

import {
  getSettings,
  updateSettings,
} from "./settings.service.js";
import { formatErrorMessage } from "../../utils/error-formatter.js";

/**
 * GET /api/settings
 */
export async function getSystemSettings(
  _req: Request,
  res: Response
) {
  try {
    const settings =
      await getSettings();

    return res.json({
      success: true,

      data: {
        id: settings.id,

        strongGreenPercent:
          settings.strongGreenPercent,

        moderateGreenPercent:
          settings.moderateGreenPercent,

        highOpportunityYellow:
          settings.highOpportunityYellow,

        mediumOpportunityYellow:
          settings.mediumOpportunityYellow,

        highVerification:
          settings.highVerification,

        mediumVerification:
          settings.mediumVerification,

        createdAt:
          settings.createdAt,

        updatedAt:
          settings.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Get system settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch system settings",
    });
  }
}

/**
 * PATCH /api/settings
 */
export async function updateSystemSettings(
  req: AuthRequest,
  res: Response
) {
  try {
    const input =
      updateSettingsSchema.parse(
        req.body
      );

    if (
      Object.keys(input).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one setting is required",
      });
    }

    /*
     * Important:
     * Validate against the final values,
     * not only values supplied in this request.
     */
    const current =
      await getSettings();

    const finalValues = {
      strongGreenPercent:
        input.strongGreenPercent ??
        current.strongGreenPercent,

      moderateGreenPercent:
        input.moderateGreenPercent ??
        current.moderateGreenPercent,

      highOpportunityYellow:
        input.highOpportunityYellow ??
        current.highOpportunityYellow,

      mediumOpportunityYellow:
        input.mediumOpportunityYellow ??
        current.mediumOpportunityYellow,

      highVerification:
        input.highVerification ??
        current.highVerification,

      mediumVerification:
        input.mediumVerification ??
        current.mediumVerification,
    };

    if (
      finalValues.strongGreenPercent <
      finalValues.moderateGreenPercent
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Strong Green percentage must be greater than or equal to Moderate Green percentage",
      });
    }

    if (
      finalValues.highOpportunityYellow <
      finalValues.mediumOpportunityYellow
    ) {
      return res.status(400).json({
        success: false,
        message:
          "High Yellow opportunity must be greater than or equal to Medium Yellow opportunity",
      });
    }

    if (
      finalValues.highVerification <
      finalValues.mediumVerification
    ) {
      return res.status(400).json({
        success: false,
        message:
          "High Verification must be greater than or equal to Medium Verification",
      });
    }

    const updated =
      await updateSettings(
        input,
        req.user!.id
      );

    return res.json({
      success: true,

      message:
        "System settings updated successfully",

      data: {
        id: updated.id,

        strongGreenPercent:
          updated.strongGreenPercent,

        moderateGreenPercent:
          updated.moderateGreenPercent,

        highOpportunityYellow:
          updated.highOpportunityYellow,

        mediumOpportunityYellow:
          updated.mediumOpportunityYellow,

        highVerification:
          updated.highVerification,

        mediumVerification:
          updated.mediumVerification,

        updatedAt:
          updated.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Update system settings error:",
      error
    );

    const message = formatErrorMessage(error, "Failed to update system settings");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}