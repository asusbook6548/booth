import { Request, Response } from "express";

import {
  reportFilterSchema,
  exportFormatSchema,
} from "./reports.validation.js";

import {
  getVoterReport,
  getVotersForExport,
  getBoothReport,
  getVolunteerReport,
  getClassificationReport,
  mapVotersForExport,
  createExcelBuffer,
  createCsvBuffer,
} from "./reports.service.js";

import type { AuthRequest } from "../../middleware/auth.middleware.js";

/**
 * GET /api/reports/summary
 */
export async function getSummary(
  req: Request,
  res: Response
) {
  try {
    const assembly =
      await getClassificationReport();

    return res.json({
      success: true,
      data: assembly,
    });
  } catch (error) {
    console.error(
      "Report summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate summary report",
    });
  }
}

/**
 * GET /api/reports/voters
 */
export async function getVoters(
  req: Request,
  res: Response
) {
  try {
    const filters =
      reportFilterSchema.parse(
        req.query
      );

    const result =
      await getVoterReport(filters);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Voter report error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate voter report",
    });
  }
}

/**
 * GET /api/reports/booths
 */
export async function getBooths(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getBoothReport();

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Booth report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate booth report",
    });
  }
}

/**
 * GET /api/reports/volunteers
 */
export async function getVolunteers(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getVolunteerReport();

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Volunteer report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate volunteer report",
    });
  }
}

/**
 * GET /api/reports/classification
 */
export async function getClassification(
  _req: Request,
  res: Response
) {
  try {
    const result =
      await getClassificationReport();

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Classification report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate classification report",
    });
  }
}

/**
 * GET /api/reports/export/voters
 */
export async function exportVoters(
  req: AuthRequest,
  res: Response
) {
  try {
    const filters =
      reportFilterSchema.parse(
        req.query
      );

    const format =
      exportFormatSchema.parse({
        format: req.query.format,
      }).format;

    const result =
      await getVotersForExport(filters);

    const rows =
      mapVotersForExport(
        result.voters
      );

    const fileName =
      `voters-${new Date()
        .toISOString()
        .slice(0, 10)}`;

    if (format === "csv") {
      const buffer =
        createCsvBuffer(rows);

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}.csv"`
      );

      return res.send(buffer);
    }

    const buffer =
      createExcelBuffer(
        rows,
        "Voters"
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.xlsx"`
    );

    return res.send(buffer);
  } catch (error) {
    console.error(
      "Voter export error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to export voters",
    });
  }
}

/**
 * GET /api/reports/export/booths
 */
export async function exportBooths(
  req: AuthRequest,
  res: Response
) {
  try {
    const format =
      exportFormatSchema.parse({
        format: req.query.format,
      }).format;

    const result =
      await getBoothReport();

    const rows =
      result.data.map(
        (booth) => ({
          "Booth Number":
            booth.boothNumber,

          "Booth Name":
            booth.boothName,

          Village:
            booth.village ?? "",

          Volunteer:
            booth.volunteerName ?? "",

          "Volunteer Mobile":
            booth.volunteerMobile ?? "",

          "Volunteer Status":
            booth.volunteerStatus ?? "",

          "Total Voters":
            booth.totalVoters,

          Green:
            booth.green,

          "Green %":
            booth.greenPercentage,

          Yellow:
            booth.yellow,

          "Yellow %":
            booth.yellowPercentage,

          Red:
            booth.red,

          "Red %":
            booth.redPercentage,

          Black:
            booth.black,

          "Black %":
            booth.blackPercentage,

          Unclassified:
            booth.unclassified,

          Verified:
            booth.verified,

          Unverified:
            booth.unverified,

          "Verification %":
            booth.verificationPercentage,
        })
      );

    const fileName =
      `booths-${new Date()
        .toISOString()
        .slice(0, 10)}`;

    if (format === "csv") {
      const buffer =
        createCsvBuffer(rows);

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}.csv"`
      );

      return res.send(buffer);
    }

    const buffer =
      createExcelBuffer(
        rows,
        "Booths"
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.xlsx"`
    );

    return res.send(buffer);
  } catch (error) {
    console.error(
      "Booth export error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to export booths",
    });
  }
}

/**
 * GET /api/reports/export/volunteers
 */
export async function exportVolunteers(
  req: AuthRequest,
  res: Response
) {
  try {
    const format =
      exportFormatSchema.parse({
        format: req.query.format,
      }).format;

    const result =
      await getVolunteerReport();

    const rows =
      result.data.map(
        (volunteer) => ({
          Name: volunteer.name,

          Mobile:
            volunteer.mobile,

          Status:
            volunteer.status,

          "Booth Number":
            volunteer.boothNumber ?? "",

          "Booth Name":
            volunteer.boothName ?? "",

          Village:
            volunteer.village ?? "",

          "Created At":
            volunteer.createdAt,
        })
      );

    const fileName =
      `volunteers-${new Date()
        .toISOString()
        .slice(0, 10)}`;

    if (format === "csv") {
      const buffer =
        createCsvBuffer(rows);

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}.csv"`
      );

      return res.send(buffer);
    }

    const buffer =
      createExcelBuffer(
        rows,
        "Volunteers"
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.xlsx"`
    );

    return res.send(buffer);
  } catch (error) {
    console.error(
      "Volunteer export error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to export volunteers",
    });
  }
}

/**
 * GET /api/reports/export/classification
 */
export async function exportClassification(
  req: AuthRequest,
  res: Response
) {
  try {
    const format =
      exportFormatSchema.parse({
        format: req.query.format,
      }).format;

    const result =
      await getClassificationReport();

    const rows = [
      {
        Classification: "GREEN",
        Count: result.green.count,
        Percentage:
          result.green.percentage,
      },
      {
        Classification: "YELLOW",
        Count: result.yellow.count,
        Percentage:
          result.yellow.percentage,
      },
      {
        Classification: "RED",
        Count: result.red.count,
        Percentage:
          result.red.percentage,
      },
      {
        Classification: "BLACK",
        Count: result.black.count,
        Percentage:
          result.black.percentage,
      },
      {
        Classification:
          "UNCLASSIFIED",
        Count:
          result.unclassified.count,
        Percentage:
          result.unclassified.percentage,
      },
    ];

    const fileName =
      `classification-${new Date()
        .toISOString()
        .slice(0, 10)}`;

    if (format === "csv") {
      const buffer =
        createCsvBuffer(rows);

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}.csv"`
      );

      return res.send(buffer);
    }

    const buffer =
      createExcelBuffer(
        rows,
        "Classification"
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}.xlsx"`
    );

    return res.send(buffer);
  } catch (error) {
    console.error(
      "Classification export error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to export classification",
    });
  }
}