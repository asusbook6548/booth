import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { prisma } from "./config/prisma.js";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import assemblyRoutes from "./modules/assembly/assembly.routes.js";
import boothsRoutes from "./modules/booths/booths.routes.js";
import volunteersRoutes from "./modules/volunteer/volunteer.routes.js";
import volunteerAuthRoutes from "./modules/volunteer-auth/volunteer-auth.routes.js";
import votersRoutes from "./modules/voters/voters.routes.js";
import volunteerVoterRoutes from "./modules/volunteer-voters/volunteer-voters.routes.js";
import classificationRoutes from "./modules/classification/classification.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import boothAnalysisRoutes from "./modules/booth-analysis/booth-analysis.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import auditLogsRoutes from "./modules/audit-logs/audit-logs.routes.js";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { formatErrorMessage } from "./utils/error-formatter.js";

const app = express();

// ========================================
// SECURITY
// ========================================

app.use(helmet());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? true
        : process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);

// ========================================
// BODY PARSING
// ========================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ========================================
// LOGGING
// ========================================

app.use(morgan("dev"));

// API Response Logger Middleware: logs status and payload for every API response
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    const duration = Date.now() - start;
    console.log(
      `[Backend API Response] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Duration: ${duration}ms\nResponse Body:`,
      body
    );
    return originalJson(body);
  };

  next();
});

// ========================================
// HEALTH
// ========================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health and database connectivity
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend is running and database is connected
 *       500:
 *         description: Database connection failed
 */
app.get(
  "/api/health",
  async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return res.status(200).json({
        success: true,
        message:
          "Booth Command Backend is running",
        database: "connected",
      });
    } catch (error) {
      console.error(
        "Health check error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Database connection failed",
      });
    }
  },
);

// ========================================
// AUTH
// ========================================

app.use(
  "/api/auth",
  authRoutes,
);

// ========================================
// USERS
// ========================================

app.use(
  "/api/users",
  usersRoutes,
);

// ========================================
// ASSEMBLY
// ========================================

app.use(
  "/api/assemblies",
  assemblyRoutes,
);

// ========================================
// BOOTHS
// ========================================

app.use(
  "/api/booths",
  boothsRoutes,
);

// ========================================
// VOLUNTEERS
// ========================================

app.use(
  "/api/volunteers",
  volunteersRoutes,
);

// ========================================
// VOLUNTEER AUTH
// ========================================

app.use(
  "/api/volunteer-auth",
  volunteerAuthRoutes,
);

// ========================================
// VOTERS
// ========================================

app.use(
  "/api/voters",
  votersRoutes,
);

// ========================================
// VOLUNTEER VOTERS
// ========================================

app.use(
  "/api/volunteer-voters",
  volunteerVoterRoutes,
);

// ========================================
// CLASSIFICATION
// ========================================

app.use(
  "/api/classification",
  classificationRoutes,
);

// ========================================
// ANALYTICS
// ========================================

// IMPORTANT:
// Booth-specific routes must come before
// the generic analytics routes.

app.use(
  "/api/analytics/booths",
  boothAnalysisRoutes,
);

app.use(
  "/api/analytics",
  analyticsRoutes,
);

// ========================================
// REPORTS
// ========================================

app.use(
  "/api/reports",
  reportsRoutes,
);

// ========================================
// SYSTEM SETTINGS
// ========================================

app.use(
  "/api/settings",
  settingsRoutes,
);

// ========================================
// AUDIT LOGS
// ========================================

app.use(
  "/api/audit-logs",
  auditLogsRoutes,
);

// ========================================
// SWAGGER
// ========================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec),
);

// ========================================
// 404 HANDLER
// ========================================

app.use(
  (_req, res) => {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  },
);

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled server error:", err);
    const message = formatErrorMessage(err, "Internal server error");
    const status =
      (err as { status?: number; statusCode?: number })?.status ||
      (err as { status?: number; statusCode?: number })?.statusCode ||
      500;

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message,
    });
  }
);

export default app;