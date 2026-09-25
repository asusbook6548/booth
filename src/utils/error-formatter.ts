import { Response } from "express";
import { ZodError } from "zod";

/**
 * Extracts a user-friendly error message from any error object,
 * properly handling Zod validation errors, Prisma constraint errors,
 * stringified JSON errors, and standard JS Errors.
 */
export function formatErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (!error) return fallback;

  // Handle ZodError directly
  if (error instanceof ZodError) {
    const issues = error.issues || (error as any).errors || [];
    if (issues.length > 0) {
      return issues
        .map((issue) => {
          const path =
            issue.path && issue.path.length > 0
              ? issue.path.join(".")
              : "";
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ");
    }
    return "Validation failed. Please verify your input.";
  }

  // Handle Prisma Known Request Errors
  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaError = error as {
      code: string;
      meta?: Record<string, unknown>;
    };
    if (prismaError.code === "P2002") {
      const target = Array.isArray(prismaError.meta?.target)
        ? prismaError.meta?.target.join(", ")
        : String(prismaError.meta?.target || "field");
      return `A record with this ${target} already exists.`;
    }
    if (prismaError.code === "P2025") {
      return "The requested record was not found.";
    }
    if (prismaError.code === "P2003") {
      return "Foreign key constraint failed. Related record does not exist.";
    }
  }

  // Handle standard Error instances (and check if message is stringified JSON from Zod)
  if (error instanceof Error) {
    const msg = error.message;
    if (
      typeof msg === "string" &&
      msg.trim().startsWith("[") &&
      msg.trim().endsWith("]")
    ) {
      try {
        const parsed = JSON.parse(msg);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0].message
        ) {
          return parsed
            .map((item: any) => {
              const p =
                item.path && item.path.length > 0
                  ? item.path.join(".")
                  : "";
              return p ? `${p}: ${item.message}` : item.message;
            })
            .join("; ");
        }
      } catch {
        // Not valid JSON array, fallback below
      }
    }
    return msg || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

/**
 * Convenient helper to send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  error: unknown,
  statusCode = 400,
  defaultMessage = "An error occurred"
) {
  const message = formatErrorMessage(error, defaultMessage);
  return res.status(statusCode).json({
    success: false,
    message,
  });
}
