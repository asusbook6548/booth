import { Request, Response } from "express";
import { ZodError } from "zod";
import { auditLogFilterSchema } from "./audit-logs.validation.js";
import { getAuditLogs } from "./audit-logs.service.js";
import { formatErrorMessage } from "../../utils/error-formatter.js";

/**
 * GET /api/audit-logs
 *
 * Controller for retrieving paginated audit logs with filtering and search.
 */
export async function getAuditLogsController(
  req: Request,
  res: Response
) {
  try {
    const filters = auditLogFilterSchema.parse(req.query);
    const result = await getAuditLogs(filters);

    return res.status(200).json({
      success: true,
      message: "Audit logs fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = formatErrorMessage(error, "Invalid query parameters");
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error("Get audit logs error:", error);
    const message = formatErrorMessage(error, "Failed to fetch audit logs");
    return res.status(500).json({
      success: false,
      message,
    });
  }
}
