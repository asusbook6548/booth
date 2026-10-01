import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { getSingleActiveAssembly } from "../../utils/single-assembly.js";

// ========================================
// EXCEL ROW STRUCTURE
// ========================================

export interface RawExcelVoter {
  epicNo?: unknown;
  epicName?: unknown;
  epicName1?: unknown;

  Gender?: unknown;

  mobileNo?: unknown;
  enrollDob?: unknown;
  Age?: unknown;

  fathersOrGuardian?: unknown;
  fathersOrGuardianHindi?: unknown;

  mothersName?: unknown;
  spouseName?: unknown;

  houseNo?: unknown;

  acNo?: unknown;
  partNo?: unknown;
  partSerial?: unknown;

  pollingStation?: unknown;
}

// ========================================
// CLEAN STRING
// ========================================

function cleanString(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const result = String(value)
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .trim();

  return result.length > 0
    ? result
    : null;
}

// ========================================
// CLEAN MOBILE
// ========================================

function cleanMobile(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  let mobile = String(value)
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .trim();

  if (mobile.endsWith(".0")) {
    mobile = mobile.slice(0, -2);
  }

  return mobile || null;
}

// ========================================
// CLEAN NUMBER
// ========================================

function cleanNumber(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  return number;
}

// ========================================
// SANITIZE JSON VALUE
// ========================================
//
// PostgreSQL JSON/JSONB does not accept
// certain control characters such as \u0000.
//
// This function recursively sanitizes:
// - strings
// - arrays
// - objects
// - numbers
// - booleans
// - null
//
// Hindi and other normal Unicode characters
// are preserved.
//

function sanitizeJsonValue(
  value: unknown
): unknown {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    );
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeJsonValue(item)
    );
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(
      value
    )) {
      const cleanKey = key.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        ""
      );

      result[cleanKey] =
        sanitizeJsonValue(item);
    }

    return result;
  }

  return String(value);
}

// ========================================
// CONVERT ROW TO PRISMA JSON
// ========================================
//
// JSON.stringify + JSON.parse ensures that
// the final value is valid JSON before Prisma
// sends it to PostgreSQL.
//

function toPrismaJson(
  value: unknown
): Prisma.InputJsonValue {
  const sanitized =
    sanitizeJsonValue(value);

  return JSON.parse(
    JSON.stringify(sanitized)
  ) as Prisma.InputJsonValue;
}

// ========================================
// READ EXCEL / XLS / CSV
// ========================================

export function parseVoterExcel(
  fileBuffer: Buffer
): RawExcelVoter[] {
  const workbook =
    XLSX.read(
      fileBuffer,
      {
        type: "buffer",
        cellDates: false,
      }
    );

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "Excel file has no worksheet"
    );
  }

  const worksheet =
    workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      "Unable to read Excel worksheet"
    );
  }

  const rows =
    XLSX.utils.sheet_to_json<RawExcelVoter>(
      worksheet,
      {
        defval: null,
        raw: false,
      }
    );

  return rows.map(
    (row) => ({
      epicNo:
        cleanString(
          row.epicNo
        ),

      epicName:
        cleanString(
          row.epicName
        ),

      epicName1:
        cleanString(
          row.epicName1
        ),

      Gender:
        cleanString(
          row.Gender
        ),

      mobileNo:
        cleanMobile(
          row.mobileNo
        ),

      enrollDob:
        cleanString(
          row.enrollDob
        ),

      Age:
        cleanNumber(
          row.Age
        ),

      fathersOrGuardian:
        cleanString(
          row.fathersOrGuardian
        ),

      fathersOrGuardianHindi:
        cleanString(
          row.fathersOrGuardianHindi
        ),

      mothersName:
        cleanString(
          row.mothersName
        ),

      spouseName:
        cleanString(
          row.spouseName
        ),

      houseNo:
        cleanString(
          row.houseNo
        ),

      acNo:
        cleanString(
          row.acNo
        ),

      partNo:
        cleanString(
          row.partNo
        ),

      partSerial:
        cleanString(
          row.partSerial
        ),

      pollingStation:
        cleanString(
          row.pollingStation
        ),
    })
  );
}

// ========================================
// IMPORT VOTER FILE
// ========================================

export async function importVoterFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  uploadedById: string,
  assemblyId: string
) {
  // ======================================
  // CHECK ASSEMBLY
  // ======================================

  const activeAssembly = await getSingleActiveAssembly();

  if (assemblyId && assemblyId !== activeAssembly.id) {
    throw new Error(
      "Specified assembly is not the active assembly. V3.1.1 supports only one active assembly"
    );
  }

  const effectiveAssemblyId = activeAssembly.id;

  // ======================================
  // CREATE IMPORT BATCH
  // ======================================

  const batch =
    await prisma.importBatch.create({
      data: {
        fileName,
        fileType,
        uploadedById,
        status: "REVIEWING",
      },
    });

  let rows: RawExcelVoter[];

  // ======================================
  // PARSE FILE
  // ======================================

  try {
    rows =
      parseVoterExcel(
        fileBuffer
      );
  } catch (error) {
    await prisma.importBatch.update({
      where: {
        id: batch.id,
      },

      data: {
        status: "FAILED",
      },
    });

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unable to read voter file"
    );
  }

  // ======================================
  // COUNTERS
  // ======================================

  const totalRows =
    rows.length;

  let validRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;
  let importedRows = 0;

  // ======================================
  // TRACK EPICS
  // ======================================

  const seenEpics =
    new Set<string>();

  // ======================================
  // PROCESS ROWS
  // ======================================

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {
    const row =
      rows[index];

    const rowNumber =
      index + 2;

    try {
      // ==================================
      // EPIC
      // ==================================

      const epicValue =
        cleanString(
          row.epicNo
        );

      const epic =
        epicValue?.toUpperCase();

      // ==================================
      // NAME
      // ==================================

      const name =
        cleanString(
          row.epicName
        );

      // ==================================
      // BOOTH / PART NUMBER
      // ==================================

      const boothNumber =
        cleanString(
          row.partNo
        );

      // ==================================
      // REQUIRED VALIDATION
      // ==================================

      if (!epic) {
        throw new Error(
          "EPIC number is missing"
        );
      }

      if (!name) {
        throw new Error(
          "Voter name is missing"
        );
      }

      if (!boothNumber) {
        throw new Error(
          "Part/Booth number is missing"
        );
      }

      // ==================================
      // DUPLICATE EPIC IN CURRENT FILE
      // ==================================

      if (
        seenEpics.has(epic)
      ) {
        duplicateRows++;

        throw new Error(
          `Duplicate EPIC in uploaded file: ${epic}`
        );
      }

      seenEpics.add(epic);

      // ==================================
      // FIND BOOTH
      // ==================================

      const booth =
        await prisma.booth.findUnique({
          where: {
            assemblyId_boothNumber: {
              assemblyId: effectiveAssemblyId,
              boothNumber,
            },
          },
        });

      if (!booth) {
        throw new Error(
          `Booth ${boothNumber} not found in selected assembly`
        );
      }

      validRows++;

      // ==================================
      // FIND EXISTING VOTER
      // ==================================

      const existing =
        await prisma.voter.findUnique({
          where: {
            assemblyId_epic: {
              assemblyId: effectiveAssemblyId,
              epic,
            },
          },
        });

      // ==================================
      // OFFICIAL VOTER DATA
      // ==================================
      //
      // These fields CAN be updated from
      // Excel during re-import.
      //
      // Field-team data is intentionally
      // excluded:
      //
      // mobile
      // classification
      // verification
      // voteStatus
      // ==================================

      const officialData = {
        name,

        nameHindi:
          cleanString(
            row.epicName1
          ),

        fatherName:
          cleanString(
            row.fathersOrGuardian
          ),

        fatherNameHindi:
          cleanString(
            row.fathersOrGuardianHindi
          ),

        motherName:
          cleanString(
            row.mothersName
          ),

        husbandName:
          cleanString(
            row.spouseName
          ),

        houseNumber:
          cleanString(
            row.houseNo
          ),

        gender:
          cleanString(
            row.Gender
          ),

        age:
          cleanNumber(
            row.Age
          ),

        dateOfBirth:
          cleanString(
            row.enrollDob
          ),

        assemblyNumber:
          cleanString(
            row.acNo
          ),

        partNumber:
          cleanString(
            row.partNo
          ),

        partSerial:
          cleanString(
            row.partSerial
          ),

        pollingStationName:
          cleanString(
            row.pollingStation
          ),

        assemblyId: effectiveAssemblyId,

        boothId:
          booth.id,
      };

      // ==================================
      // EXISTING VOTER
      // ==================================

      if (existing) {
        await prisma.voter.update({
          where: {
            id: existing.id,
          },

          data: officialData,
        });
      }

      // ==================================
      // NEW VOTER
      // ==================================

      else {
        await prisma.voter.create({
          data: {
            epic,

            ...officialData,

            // Excel mobile is used ONLY
            // when creating a new voter.
            mobile:
              cleanMobile(
                row.mobileNo
              ),

            verification:
              "UNVERIFIED",

            voteStatus:
              "PENDING",
          },
        });
      }

      importedRows++;
    } catch (error) {
      errorRows++;

      // ==================================
      // SAVE IMPORT ERROR
      // ==================================
      //
      // IMPORTANT:
      // Sanitize raw Excel data before
      // inserting into PostgreSQL JSONB.
      // ==================================

      await prisma.importError.create({
        data: {
          batchId:
            batch.id,

          rowNumber,

          rawData:
            toPrismaJson(row),

          errorMessage:
            error instanceof Error
              ? error.message
              : "Unknown import error",
        },
      });
    }
  }

  // ======================================
  // MARK IMPORT COMPLETED
  // ======================================

  const completedBatch =
    await prisma.importBatch.update({
      where: {
        id: batch.id,
      },

      data: {
        status: "COMMITTED",

        totalRows,

        validRows,

        duplicateRows,

        errorRows,

        importedRows,

        completedAt:
          new Date(),
      },
    });

  // ======================================
  // AUDIT LOG
  // ======================================

  await prisma.auditLog.create({
    data: {
      action:
        "VOTER_IMPORT_COMPLETED",

      entity:
        "IMPORT_BATCH",

      entityId:
        batch.id,

      userId:
        uploadedById,

      details: {
        fileName,

        assemblyId: effectiveAssemblyId,

        totalRows,

        validRows,

        duplicateRows,

        errorRows,

        importedRows,
      },
    },
  });

  // ======================================
  // RETURN RESULT
  // ======================================

  return completedBatch;
}