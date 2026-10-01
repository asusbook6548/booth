import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import {
  importVoterFile as importVoterFileService,
} from "./voter-import.service";
import { formatErrorMessage } from "../../utils/error-formatter.js";

/**
 * POST /api/voters/import
 *
 * multipart/form-data
 *
 * file:
 * voter Excel / CSV file
 *
 * assemblyId:
 * Assembly UUID
 */
export async function importVoterFile(
  req: AuthRequest,
  res: Response
) {
  try {
    /**
     * Admin authentication
     */
    if (!req.user) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required",
      });
    }

    /**
     * Check uploaded file
     */
    if (!req.file) {
      return res.status(400).json({
        success: false,

        message:
          "Voter file is required",
      });
    }

    /**
     * Check assemblyId
     */
    const assemblyId =
      String(
        req.body.assemblyId || ""
      ).trim();

    if (!assemblyId) {
      return res.status(400).json({
        success: false,

        message:
          "assemblyId is required",
      });
    }

    /**
     * Import
     */
    const result =
      await importVoterFileService(
        req.file.buffer,

        req.file.originalname,

        req.file.mimetype,

        req.user.id,

        assemblyId
      );

    return res.status(200).json({
      success: true,

      message:
        "Voter file imported successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Voter import error:",
      error
    );

    const message = formatErrorMessage(error, "Voter import failed");

    return res.status(400).json({
      success: false,
      message,
    });
  }
}