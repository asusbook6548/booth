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
 * Required:
 *   file: voter Excel (.xlsx / .xls) or CSV file
 *
 * The assembly is determined automatically from the server
 * configuration (getCurrentAssembly).
 *
 * The user must NOT pass assemblyId.
 * The backend always uses the configured assembly.
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
     * Import — assembly is determined server-side
     */
    const result =
      await importVoterFileService(
        req.file.buffer,

        req.file.originalname,

        req.file.mimetype,

        req.user.id,
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

    const status =
      (error as { status?: number })?.status === 404 ? 404 : 400;

    const message = formatErrorMessage(error, "Voter import failed");

    return res.status(status).json({
      success: false,
      message,
    });
  }
}