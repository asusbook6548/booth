import fs from "fs";
import path from "path";
import swaggerJSDoc from "swagger-jsdoc";

const isDist = !fs.existsSync(
  path.resolve(process.cwd(), "src/app.ts")
);

const baseDir = isDist ? "dist" : "src";
const ext = isDist ? "js" : "ts";

const apiFiles = [
  path.resolve(process.cwd(), `${baseDir}/app.${ext}`),

  // Auth
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/auth/auth.routes.${ext}`
  ),

  // Users
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/users/users.routes.${ext}`
  ),

  // Assembly
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/assembly/assembly.routes.${ext}`
  ),

  // Booths
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/booths/booths.routes.${ext}`
  ),

  // Volunteers
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/volunteer/volunteer.routes.${ext}`
  ),

  // Volunteer Auth
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/volunteer-auth/volunteer-auth.routes.${ext}`
  ),

  // Voters
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/voters/voters.routes.${ext}`
  ),

  // Volunteer Voters
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/volunteer-voters/volunteer-voters.routes.${ext}`
  ),

  // Classification
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/classification/classification.routes.${ext}`
  ),

  // Analytics
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/analytics/analytics.routes.${ext}`
  ),

  // Booth Analysis
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/booth-analysis/booth-analysis.routes.${ext}`
  ),

  // Reports
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/reports/reports.routes.${ext}`
  ),

  // Settings
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/settings/settings.routes.${ext}`
  ),

  // Audit Logs
  path.resolve(
    process.cwd(),
    `${baseDir}/modules/audit-logs/audit-logs.routes.${ext}`
  ),
];

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Booth Command API",
      version: "3.1.1",
      description:
        "REST API for Booth Command management system",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],

    tags: [
      {
        name: "Health",
        description: "System health check",
      },
      {
        name: "Auth",
        description: "Admin authentication",
      },
      {
        name: "Users",
        description: "Admin user management",
      },
      {
        name: "Assemblies",
        description: "Assembly constituency management",
      },
      {
        name: "Voters",
        description: "Admin voter management",
      },
      {
        name: "Volunteer Voters",
        description:
          "Voter APIs restricted to volunteer's assigned booth",
      },
      {
        name: "Volunteers",
        description: "Volunteer management",
      },
      {
        name: "Volunteer Auth",
        description: "Volunteer authentication",
      },
      {
        name: "Booths",
        description: "Booth management",
      },
      {
        name: "Classification",
        description:
          "Voter political classification (Green, Yellow, Red, Black)",
      },
      {
        name: "Analytics",
        description:
          "Electoral and operational analytics",
      },
      {
        name: "Booth Analysis",
        description:
          "Detailed booth strength, weakness, opportunity, and confidence analysis",
      },
      {
        name: "Reports",
        description:
          "System reports and Excel/CSV exports",
      },
      {
        name: "Settings",
        description:
          "Configurable system analysis thresholds",
      },
      {
        name: "Audit Logs",
        description: "Admin audit log tracking and monitoring",
      },
    ],

    components: {
      // ============================================
      // SECURITY
      // ============================================

      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter JWT access token. Example: eyJhbGciOiJIUzI1NiIs...",
        },
      },

      // ============================================
      // REUSABLE SCHEMAS
      // ============================================

      schemas: {
        // ==========================================
        // USER
        // ==========================================

        User: {
          type: "object",
          description:
            "Admin user returned by authentication and user management APIs. Password is never returned.",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example:
                "550e8400-e29b-41d4-a716-446655440000",
            },

            name: {
              type: "string",
              example: "Admin User",
            },

            email: {
              type: "string",
              format: "email",
              example: "admin@example.com",
            },

            role: {
              type: "string",
              enum: ["ADMIN"],
              example: "ADMIN",
            },

            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              example: "ACTIVE",
            },

            createdAt: {
              type: "string",
              format: "date-time",
            },

            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },

          required: [
            "id",
            "name",
            "email",
            "role",
            "status",
            "createdAt",
            "updatedAt",
          ],
        },

        // ==========================================
        // SYSTEM SETTINGS
        // ==========================================

        SystemSettings: {
          type: "object",
          description:
            "System thresholds used by analytics and booth analysis.",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example:
                "550e8400-e29b-41d4-a716-446655440000",
            },

            strongGreenPercent: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 55,
              description:
                "Green percentage at or above this value is considered strong.",
            },

            moderateGreenPercent: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 40,
              description:
                "Green percentage at or above this value is considered moderate.",
            },

            highOpportunityYellow: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 15,
              description:
                "Yellow percentage at or above this value is considered high opportunity.",
            },

            mediumOpportunityYellow: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 8,
              description:
                "Yellow percentage at or above this value is considered medium opportunity.",
            },

            highVerification: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 80,
              description:
                "Verification percentage at or above this value is considered high.",
            },

            mediumVerification: {
              type: "number",
              format: "float",
              minimum: 0,
              maximum: 100,
              example: 50,
              description:
                "Verification percentage at or above this value is considered medium.",
            },

            createdAt: {
              type: "string",
              format: "date-time",
            },

            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },

          required: [
            "id",
            "strongGreenPercent",
            "moderateGreenPercent",
            "highOpportunityYellow",
            "mediumOpportunityYellow",
            "highVerification",
            "mediumVerification",
            "createdAt",
            "updatedAt",
          ],
        },

        // ==========================================
        // ERROR RESPONSE
        // ==========================================

        ErrorResponse: {
          type: "object",
          description:
            "Standard API error response.",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },

            message: {
              type: "string",
              example: "Something went wrong",
            },
          },

          required: [
            "success",
            "message",
          ],
        },

        // ==========================================
        // PAGINATION
        // ==========================================

        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
              example: 1,
            },

            limit: {
              type: "integer",
              minimum: 1,
              example: 20,
            },

            total: {
              type: "integer",
              minimum: 0,
              example: 100,
            },

            totalPages: {
              type: "integer",
              minimum: 0,
              example: 5,
            },
          },

          required: [
            "page",
            "limit",
            "total",
            "totalPages",
          ],
        },

        // ==========================================
        // AUDIT LOG
        // ==========================================

        AuditLog: {
          type: "object",
          description:
            "Audit log entry recording administrative or volunteer activity. Passwords and credentials are never exposed.",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            action: {
              type: "string",
              example: "VOTER_UPDATED",
            },
            entity: {
              type: "string",
              example: "VOTER",
            },
            entityId: {
              type: "string",
              nullable: true,
              example: "550e8400-e29b-41d4-a716-446655440000",
            },
            details: {
              type: "object",
              nullable: true,
              description: "Action-specific details payload",
            },
            userId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            volunteerId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            voterId: {
              type: "string",
              format: "uuid",
              nullable: true,
            },
            user: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
                email: {
                  type: "string",
                  format: "email",
                },
                role: {
                  type: "string",
                  enum: ["ADMIN"],
                },
              },
            },
            volunteer: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                },
                name: {
                  type: "string",
                },
                mobile: {
                  type: "string",
                },
                status: {
                  type: "string",
                  enum: ["ACTIVE", "INACTIVE"],
                },
              },
            },
            voter: {
              type: "object",
              nullable: true,
              properties: {
                id: {
                  type: "string",
                },
                epic: {
                  type: "string",
                },
                name: {
                  type: "string",
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: [
            "id",
            "action",
            "entity",
            "createdAt",
          ],
        },
      },
    },
  },

  // ==============================================
  // FILES TO SCAN FOR SWAGGER JSDOC
  // ==============================================

  apis: apiFiles,

  // IMPORTANT:
  // Keep this TRUE during development so missing
  // Swagger references/documentation are detected.
  failOnErrors: true,
};

export const swaggerSpec =
  swaggerJSDoc(options);