import {
  Request,
  Response,
} from "express";

import {
  analyticsBoothFilterSchema,
} from "./analytics.validation.js";

import {
  getAnalyticsOverview,
  getClassificationAnalytics,
  getVerificationAnalytics,
  getBoothAnalytics,
  getSingleBoothAnalytics,
} from "./analytics.service.js";

// ========================================
// OVERVIEW
// ========================================

export async function getOverview(
  req: Request,
  res: Response
) {
  try {
    const boothId =
      typeof req.query.boothId === "string" && req.query.boothId.trim() !== ""
        ? req.query.boothId.trim()
        : undefined;

    const result =
      await getAnalyticsOverview(boothId);

    return res.status(200).json({
      success: true,

      message:
        "Analytics overview fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Analytics overview error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch analytics overview",
    });
  }
}

// ========================================
// CLASSIFICATION
// ========================================

export async function getClassification(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getClassificationAnalytics();

    return res.status(200).json({
      success: true,

      message:
        "Classification analytics fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Classification analytics error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch classification analytics",
    });
  }
}

// ========================================
// VERIFICATION
// ========================================

export async function getVerification(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getVerificationAnalytics();

    return res.status(200).json({
      success: true,

      message:
        "Verification analytics fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Verification analytics error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch verification analytics",
    });
  }
}

// ========================================
// BOOTHS
// ========================================

export async function getBooths(
  req: Request,
  res: Response
) {
  try {
    const filters =
      analyticsBoothFilterSchema.parse(
        req.query
      );

    const result =
      await getBoothAnalytics(
        filters
      );

    return res.status(200).json({
      success: true,

      message:
        "Booth analytics fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Booth analytics error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch booth analytics",
    });
  }
}

// ========================================
// SINGLE BOOTH
// ========================================

export async function getBooth(
  req: Request,
  res: Response
) {
  try {
    const boothId =
      String(req.params.id);

    const result =
      await getSingleBoothAnalytics(
        boothId
      );

    return res.status(200).json({
      success: true,

      message:
        "Booth analytics fetched successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Single booth analytics error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch booth analytics",
    });
  }
}