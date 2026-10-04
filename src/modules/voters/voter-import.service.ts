import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { getCurrentAssembly } from "../../utils/single-assembly.js";

// ========================================
// EXCEL ROW STRUCTURE
// ========================================
//
// Source Excel columns → Voter model mapping:
//
//   epicNo             → epic
//   epicName           → name
//   epicName1          → nameHindi
//   Gender             → gender
//   mobileNo           → mobile  (new voters only)
//   enrollDob          → dateOfBirth
//   Age                → age
//   fathersOrGuardian  → fatherName
//   fathersOrGuardianHindi → fatherNameHindi
//   mothersName        → motherName
//   spouseName         → husbandName
//   houseNo            → houseNumber
//   acNo               → assemblyNumber
//   partNo             → partNumber  AND  Booth.boothNumber
//   partSerial         → partSerial
//   pollingStation     → pollingStationName AND Booth.name (if new)
//
// BOOTH NUMBER: partNo  (NOT pollingStation)
// pollingStation is used as Booth.name when creating a missing booth.
//

export interface RawExcelVoter {
  epicNo?: unknown;
  epic?: unknown;
  EPIC?: unknown;
  epicName?: unknown;
  name?: unknown;
  epicName1?: unknown;
  epicNameL1?: unknown;
  epicNameHindi?: unknown;
  Gender?: unknown;
  gender?: unknown;
  mobileNo?: unknown;
  mobile?: unknown;
  enrollDob?: unknown;
  erollDob?: unknown;
  dob?: unknown;
  Age?: unknown;
  age?: unknown;
  fathersOrGuardian?: unknown;
  fatherName?: unknown;
  fathersOrGuardianHindi?: unknown;
  fathersOrGuardianL1?: unknown;
  fatherNameHindi?: unknown;
  mothersName?: unknown;
  motherName?: unknown;
  spouseName?: unknown;
  spouseNa?: unknown;
  husbandName?: unknown;
  houseNo?: unknown;
  houseNumber?: unknown;
  acNo?: unknown;
  assemblyNumber?: unknown;
  partNo?: unknown;
  partNumber?: unknown;
  partSerial?: unknown;
  serialNo?: unknown;
  pollingStation?: unknown;
  pollingStationName?: unknown;
  [key: string]: unknown;
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
// ROW VALUE EXTRACTOR (Flexible Aliases)
// ========================================

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\.\:\(\)\/\'\"\\#\[\],?]/g, "");
}

function getRowValue(row: Record<string, unknown>, aliases: string[]): unknown {
  // 1. Direct lookup
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== "") {
      return row[alias];
    }
  }

  // 2. Canonical lookup (ignores case, spaces, underscores, hyphens, punctuation while preserving Hindi/Unicode)
  const normalizedAliases = new Set(aliases.map(normalizeKey));

  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === "") continue;
    const cleanKey = normalizeKey(key);
    if (normalizedAliases.has(cleanKey)) {
      return val;
    }
  }

  return null;
}

function cleanPartSerial(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  let str = String(value).trim();
  if (str.endsWith(".0")) {
    str = str.slice(0, -2);
  }
  return str.length > 0 ? str : null;
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
    XLSX.utils.sheet_to_json<Record<string, unknown>>(
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
          getRowValue(row, ["epicNo", "epicNumber", "epic", "EPIC", "voterId", "epic_no"])
        ),

      epicName:
        cleanString(
          getRowValue(row, ["epicName", "name", "Name", "voterName", "voter_name", "epic_name"])
        ),

      epicName1:
        cleanString(
          getRowValue(row, ["epicNameL1", "epicName1", "nameHindi", "epicNameHindi", "nameL1", "epic_name_l1"])
        ),

      Gender:
        cleanString(
          getRowValue(row, ["Gender", "gender", "sex"])
        ),

      mobileNo:
        cleanMobile(
          getRowValue(row, ["mobileNo", "mobile", "Mobile", "phone", "contactNo", "mobile_no"])
        ),

      enrollDob:
        cleanString(
          getRowValue(row, ["enrollDob", "erollDob", "dob", "DOB", "dateOfBirth", "enroll_dob", "eroll_dob"])
        ),

      Age:
        cleanNumber(
          getRowValue(row, ["Age", "age"])
        ),

      fathersOrGuardian:
        cleanString(
          getRowValue(row, [
            "fathersOrGuardianName",
            "fathersOrGuardian",
            "fatherName",
            "father_name",
            "fathersName",
            "guardianName",
            "father",
            "guardian",
            "rln_name",
            "relative_name",
            "relativeName",
            "fatherHusbandName",
            "father_husband_name",
            "पिता का नाम",
            "पिता/पति का नाम",
            "संबंधी का नाम",
          ])
        ),

      fathersOrGuardianHindi:
        cleanString(
          getRowValue(row, [
            "fathersOrGuardianNameL1",
            "fathersOrGuardianL1",
            "fathersOrGuardianHindi",
            "fatherNameHindi",
            "fatherNameL1",
            "father_name_hindi",
            "rln_name_l1",
            "rln_name_hindi",
            "relativeNameHindi",
            "relative_name_hindi",
            "fatherHindi",
            "पिता का नाम हिन्दी",
            "पिता का नाम (हिन्दी)",
          ])
        ),

      mothersName:
        cleanString(
          getRowValue(row, ["mothersName", "motherName", "mother", "mother_name", "mothers_name", "माता का नाम"])
        ),

      spouseName:
        cleanString(
          getRowValue(row, ["spouseName", "spouseNa", "husbandName", "husband", "spouse", "spouse_name", "पति का नाम"])
        ),

      houseNo:
        cleanString(
          getRowValue(row, ["houseNo", "houseNumber", "house", "house_no", "मकान संख्या"])
        ),

      acNo:
        cleanString(
          getRowValue(row, ["acNo", "acNumber", "assemblyNumber", "assemblyNo", "ac_no"])
        ),

      partNo:
        cleanString(
          getRowValue(row, ["partNo", "partNumber", "boothNumber", "part", "part_no", "boothNo", "भाग संख्या"])
        ),

      partSerial:
        cleanPartSerial(
          getRowValue(row, [
            "partSerial",
            "partSerialNo",
            "serialNo",
            "part_serial",
            "serial",
            "partSerialNum",
            "part_serial_no",
            "slNo",
            "slno",
            "serialNumber",
            "serial_number",
            "srNo",
            "sr_no",
            "slNoInPart",
            "sl_no_in_part",
            "serial_no_in_part",
            "sNo",
            "s_no",
            "क्रम संख्या",
            "क्रमांक",
          ])
        ),

      pollingStation:
        cleanString(
          getRowValue(row, [
            "Polling Station No - Name",
            "Polling Station No-Name",
            "pollingStation",
            "pollingStationName",
            "boothName",
            "polling_station",
          ])
        ),
    })
  );
}

// ========================================
// IMPORT VOTER FILE
// ========================================
//
// The assembly is determined AUTOMATICALLY
// from the server configuration.
//
// Caller must NOT pass assemblyId.
//
// Flow:
//   1. getCurrentAssembly()
//   2. Parse file (xlsx / xls / csv)
//   3. For each row:
//      a. Validate required fields
//      b. Upsert Booth (auto-create if missing)
//      c. Smart merge Voter (create/update)
//   4. Save ImportBatch result
//   5. AuditLog
//

export async function importVoterFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  uploadedById: string
) {
  // ======================================
  // GET CURRENT ASSEMBLY (server-side)
  // ======================================
  //
  // Never trust client-provided assemblyId.
  //

  const assembly = await getCurrentAssembly();
  const assemblyId = assembly.id;

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
  let newBoothsCreated = 0;

  // ======================================
  // TRACK EPICS (duplicate detection)
  // ======================================

  const seenEpics =
    new Set<string>();

  // ======================================
  // BOOTH CACHE
  // ======================================
  //
  // Cache boothNumber → boothId so that
  // multiple voters in the same booth do
  // NOT trigger repeated DB upserts.
  //
  // Also prevents race conditions:
  // 100 voters from Booth 25 → 1 Booth record.
  //

  const boothCache =
    new Map<string, string>();

  // ======================================
  // PROCESS ROWS
  // ======================================

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {
    const row =
      rows[index]!;

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
      //
      // partNo is the Booth Number.
      // pollingStation is the Booth Name.
      //

      const boothNumber =
        cleanString(
          row.partNo
        );

      const pollingStationName =
        cleanString(
          row.pollingStation
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
          "Part/Booth number (partNo) is missing"
        );
      }

      // ==================================
      // DUPLICATE EPIC IN CURRENT FILE
      // ==================================

      if (seenEpics.has(epic)) {
        duplicateRows++;
        continue;
      }

      seenEpics.add(epic);

      // ==================================
      // FIND OR CREATE BOOTH
      // ==================================
      //
      // Unique key: assemblyId + boothNumber
      //
      // Uses in-memory cache first to avoid
      // repeated DB round-trips and prevent
      // duplicate booth creation for voters
      // in the same part/booth.
      //

      let boothId = boothCache.get(boothNumber);

      if (!boothId) {
        const booth = await prisma.booth.upsert({
          where: {
            assemblyId_boothNumber: {
              assemblyId,
              boothNumber,
            },
          },
          update: {},
          create: {
            assemblyId,
            boothNumber,
            name: pollingStationName || `Booth ${boothNumber}`,
          },
        });

        // Track whether this was a new booth
        const wasExisting = await prisma.booth.findFirst({
          where: {
            assemblyId,
            boothNumber,
          },
          select: { createdAt: true, updatedAt: true },
        });

        // We can't tell upsert created vs found easily,
        // so we track using the cache: first time we see
        // a boothNumber = potentially new.
        boothId = booth.id;
        boothCache.set(boothNumber, boothId);

        // Check if booth was just created:
        // upsert.create path means updatedAt ≈ createdAt
        const isNew =
          Math.abs(
            booth.createdAt.getTime() - booth.updatedAt.getTime()
          ) < 2000;

        if (isNew) {
          newBoothsCreated++;

          // Audit log for automatic booth creation
          await prisma.auditLog.create({
            data: {
              action: "BOOTH_AUTO_CREATED",
              entity: "BOOTH",
              entityId: booth.id,
              userId: uploadedById,
              details: {
                boothNumber,
                boothName: booth.name,
                assemblyId,
                importFileName: fileName,
              },
            },
          });
        }
      }

      validRows++;

      // ==================================
      // OFFICIAL VOTER DATA
      // ==================================
      //
      // These fields CAN be updated from
      // Excel during re-import.
      //
      // Field-team data is intentionally
      // excluded from update:
      //
      //   mobile
      //   classification
      //   verification
      //   voteStatus
      //

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

        pollingStationName,

        // Always from server — NEVER from client/Excel
        assemblyId,
        boothId,
      };

      // ==================================
      // FIND EXISTING VOTER
      // ==================================

      const existing =
        await prisma.voter.findUnique({
          where: {
            assemblyId_epic: {
              assemblyId,
              epic,
            },
          },
        });

      // ==================================
      // EXISTING VOTER → SMART UPDATE
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
      // NEW VOTER → CREATE
      // ==================================

      else {
        await prisma.voter.create({
          data: {
            epic,

            ...officialData,

            // Excel mobile is used ONLY
            // when creating a new voter.
            // Never overwritten on update.
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
      // Sanitize raw Excel data before
      // inserting into PostgreSQL JSONB.
      //

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

        assemblyId,
        assemblyNumber: assembly.number,
        assemblyName: assembly.name,

        totalRows,

        validRows,

        duplicateRows,

        errorRows,

        importedRows,

        newBoothsCreated,
      },
    },
  });

  // ======================================
  // RETURN RESULT
  // ======================================

  return {
    ...completedBatch,
    newBoothsCreated,
  };
}