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

function getPollingStationValue(
  row: Record<string, unknown>,
  aliases: string[]
): string | null {
  // 1. Direct and canonical alias lookup
  const direct = cleanString(getRowValue(row, aliases));
  if (direct) return direct;

  // 2. Fuzzy column header fallback
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === "") continue;
    const lowerKey = key.toLowerCase();

    // Skip numeric ID / serial / mobile columns
    if (
      lowerKey.includes("partno") ||
      lowerKey.includes("part_no") ||
      lowerKey.includes("partnumber") ||
      lowerKey.includes("boothno") ||
      lowerKey.includes("booth_no") ||
      lowerKey.includes("serial") ||
      lowerKey.includes("srno") ||
      lowerKey.includes("slno") ||
      lowerKey.includes("acno") ||
      lowerKey.includes("epic") ||
      lowerKey.includes("mobile") ||
      lowerKey.includes("phone")
    ) {
      continue;
    }

    if (
      lowerKey.includes("polling") ||
      lowerKey.includes("station") ||
      lowerKey.includes("kendra") ||
      lowerKey.includes("kendr") ||
      lowerKey.includes("sthal") ||
      lowerKey.includes("मतदान") ||
      lowerKey.includes("ps_name") ||
      lowerKey.includes("psname") ||
      lowerKey.includes("booth") ||
      lowerKey.includes("part_name") ||
      lowerKey.includes("partname") ||
      lowerKey.includes("section")
    ) {
      const cleanVal = cleanString(val);
      if (cleanVal) return cleanVal;
    }
  }

  // 3. Value-based pattern fallback (e.g. PRA.VI., VIDYALAYA, SCHOOL, BHAWAN)
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === "string") {
      const upper = val.toUpperCase();
      if (
        upper.includes("PRA.VI.") ||
        upper.includes("PRA. VI.") ||
        upper.includes("VIDYALAYA") ||
        upper.includes("SCHOOL") ||
        upper.includes("COLLEGE") ||
        upper.includes("PRATHAMIK") ||
        upper.includes("MADHYAMIK") ||
        upper.includes("KENDRA") ||
        upper.includes("BHAWAN") ||
        upper.includes("MAHAVIDYALAYA")
      ) {
        const cleanVal = cleanString(val);
        if (cleanVal) return cleanVal;
      }
    }
  }

  return null;
}

// ========================================
// READ EXCEL / XLS / CSV
// ========================================

// ========================================
// PRE-COMPUTED FIELD SPECS FOR HEADER MAPPING
// ========================================
//
// Change C: resolve the header → field mapping ONCE from Object.keys(rows[0])
// instead of calling normalizeKey on every key of every row.
//

type FieldSpec = {
  field: keyof RawExcelVoter;
  aliases: string[];
};

const FIELD_SPECS: FieldSpec[] = [
  { field: "epicNo",                 aliases: ["epicNo", "epicNumber", "epic", "EPIC", "voterId", "epic_no"] },
  { field: "epicName",               aliases: ["epicName", "name", "Name", "voterName", "voter_name", "epic_name"] },
  { field: "epicName1",              aliases: ["epicNameL1", "epicName1", "nameHindi", "epicNameHindi", "nameL1", "epic_name_l1"] },
  { field: "Gender",                 aliases: ["Gender", "gender", "sex"] },
  { field: "mobileNo",               aliases: ["mobileNo", "mobile", "Mobile", "phone", "contactNo", "mobile_no"] },
  { field: "enrollDob",              aliases: ["enrollDob", "erollDob", "dob", "DOB", "dateOfBirth", "enroll_dob", "eroll_dob"] },
  { field: "Age",                    aliases: ["Age", "age"] },
  { field: "fathersOrGuardian",      aliases: ["fathersOrGuardianName", "fathersOrGuardian", "fatherName", "father_name", "fathersName", "guardianName", "father", "guardian", "rln_name", "relative_name", "relativeName", "fatherHusbandName", "father_husband_name", "पिता का नाम", "पिता/पति का नाम", "संबंधी का नाम"] },
  { field: "fathersOrGuardianHindi", aliases: ["fathersOrGuardianNameL1", "fathersOrGuardianL1", "fathersOrGuardianHindi", "fatherNameHindi", "fatherNameL1", "father_name_hindi", "rln_name_l1", "rln_name_hindi", "relativeNameHindi", "relative_name_hindi", "fatherHindi", "पिता का नाम हिन्दी", "पिता का नाम (हिन्दी)"] },
  { field: "mothersName",            aliases: ["mothersName", "motherName", "mother", "mother_name", "mothers_name", "माता का नाम"] },
  { field: "spouseName",             aliases: ["spouseName", "spouseNa", "husbandName", "husband", "spouse", "spouse_name", "पति का नाम"] },
  { field: "houseNo",                aliases: ["houseNo", "houseNumber", "house", "house_no", "मकान संख्या"] },
  { field: "acNo",                   aliases: ["acNo", "acNumber", "assemblyNumber", "assemblyNo", "ac_no"] },
  { field: "partNo",                 aliases: ["partNo", "partNumber", "boothNumber", "part", "part_no", "boothNo", "भाग संख्या"] },
  { field: "partSerial",             aliases: ["partSerial", "partSerialNo", "serialNo", "part_serial", "serial", "partSerialNum", "part_serial_no", "slNo", "slno", "serialNumber", "serial_number", "srNo", "sr_no", "slNoInPart", "sl_no_in_part", "serial_no_in_part", "sNo", "s_no", "क्रम संख्या", "क्रमांक"] },
];

const POLLING_STATION_ALIASES = [
  "Polling Station No - Name",
  "Polling Station No-Name",
  "Polling Station No & Name",
  "Polling Station No and Name",
  "pollingStation",
  "pollingStationName",
  "polling_station_name",
  "polling_station",
  "pollingStationNoName",
  "polling_station_no_name",
  "pollingStationNoAndName",
  "polling_station_no_and_name",
  "Polling Station",
  "Part No - Name",
  "Part No-Name",
  "Part No & Name",
  "Part No and Name",
  "part_no_name",
  "part_no_and_name",
  "partNoName",
  "partName",
  "part_name",
  "part_name_en",
  "Part Name",
  "Part Details",
  "part_details",
  "Section No - Name",
  "Section No-Name",
  "Section No & Name",
  "Section No and Name",
  "section_no_name",
  "section_no_and_name",
  "sectionName",
  "section_name",
  "Section Name",
  "ps_name",
  "psName",
  "PS Name",
  "PS_NAME",
  "ps_name_en",
  "ps_name_v1",
  "ps_name_hindi",
  "ps_no_name",
  "ps_num_name",
  "ps_detail",
  "ps_details",
  "PS Details",
  "ps_building_name",
  "ps_building",
  "psBuilding",
  "ps_address",
  "psAddress",
  "ps",
  "boothName",
  "booth_name",
  "booth",
  "stationName",
  "station_name",
  "station",
  "centreName",
  "centerName",
  "centre_name",
  "center_name",
  "location",
  "schoolName",
  "school_name",
  "buildingName",
  "building_name",
  "मतदान केंद्र का नाम",
  "मतदान केंद्र का नाम व पता",
  "मतदान केंद्र का नाम एवं पता",
  "मतदान केन्द्र का नाम",
  "मतदान केन्द्र का नाम व पता",
  "मतदान केंद्र",
  "मतदान केन्द्र",
  "मतदान स्थल",
  "मतदान स्थल का नाम",
  "मतदान केंद्र भवन",
  "मतदान केंद्र भवन का नाम",
  "भाग का नाम",
  "अनुभाग का नाम",
  "बूथ का नाम",
  "बूथ नाम",
];

// ========================================
// READ EXCEL / XLS / CSV
// ========================================

export function parseVoterExcel(
  fileBuffer: Buffer
): RawExcelVoter[] {
  // Change A: Add memory-saving parse options.
  // cellStyles/cellFormula/cellHTML/cellNF:false avoids allocating style/formula/HTML/format objects per cell.
  // dense:true stores cells in a 2-D array instead of a sparse {r:N,c:M} key map, which is more GC-friendly.
  let workbook: XLSX.WorkBook | null =
    XLSX.read(
      fileBuffer,
      {
        type: "buffer",
        cellDates: false,
        cellStyles: false,
        cellFormula: false,
        cellHTML: false,
        cellNF: false,
        dense: true,
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

  // raw:false keeps the same string coercion as before.
  const rows =
    XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        defval: null,
        raw: false,
      }
    );

  // Change A (cont): Release workbook immediately after sheet_to_json so the
  // XLSX cell objects (which held the raw parse tree) become eligible for GC.
  workbook = null;

  if (rows.length === 0) {
    return [];
  }

  const firstRowKeys = Object.keys(rows[0]!);
  console.log("Excel columns detected:", firstRowKeys);

  // Change C: Resolve the header → field mapping ONCE from firstRowKeys.
  // For each field spec, find which actual column key in the header matches
  // (direct alias first, then normalizeKey fallback).
  // Per-row cost drops from O(aliases * keys) to O(1) map lookup.
  const colForField = new Map<keyof RawExcelVoter, string>();

  for (const spec of FIELD_SPECS) {
    // 1. Direct match
    let matched = false;
    for (const alias of spec.aliases) {
      if (firstRowKeys.includes(alias)) {
        colForField.set(spec.field, alias);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // 2. Normalised match
      const normalizedAliases = new Set(spec.aliases.map(normalizeKey));
      for (const colKey of firstRowKeys) {
        if ([...colForField.values()].includes(colKey)) continue; // already claimed
        if (normalizedAliases.has(normalizeKey(colKey))) {
          colForField.set(spec.field, colKey);
          break;
        }
      }
    }
  }

  // Change C (polling station): Find which actual column holds the polling station once.
  // For rows where that column is empty, fall back to the full fuzzy+value-based scan.
  let psDirectKey: string | null = null;
  {
    const normalizedPsAliases = new Set(POLLING_STATION_ALIASES.map(normalizeKey));
    for (const alias of POLLING_STATION_ALIASES) {
      if (firstRowKeys.includes(alias)) {
        psDirectKey = alias;
        break;
      }
    }
    if (!psDirectKey) {
      for (const colKey of firstRowKeys) {
        if (normalizedPsAliases.has(normalizeKey(colKey))) {
          psDirectKey = colKey;
          break;
        }
      }
    }
  }

  // Fast per-row value getter: O(1) map lookup instead of iterating all aliases each row.
  // Falls back to getRowValue only if the column was not found in the header scan.
  function fastGet(row: Record<string, unknown>, field: keyof RawExcelVoter, aliases: string[]): unknown {
    const colKey = colForField.get(field);
    if (colKey !== undefined) {
      const v = row[colKey];
      if (v !== undefined && v !== null && v !== "") return v;
      return null;
    }
    return getRowValue(row, aliases);
  }

  // Change D: Map rows → RawExcelVoter[]. The original `rows` array (raw sheet
  // data) and the result array are never both retained after this function returns;
  // callers receive only `result`, so `rows` can be GC'd.
  const result: RawExcelVoter[] = rows.map((row) => {
    // Polling station: direct key first (O(1)), fuzzy scan only when empty.
    let pollingStation: string | null = null;
    if (psDirectKey !== null) {
      const v = row[psDirectKey];
      if (v !== undefined && v !== null && v !== "") {
        pollingStation = cleanString(v);
      }
    }
    if (!pollingStation) {
      pollingStation = getPollingStationValue(row, POLLING_STATION_ALIASES);
    }

    return {
      epicNo:                 cleanString(fastGet(row, "epicNo",                 ["epicNo", "epicNumber", "epic", "EPIC", "voterId", "epic_no"])),
      epicName:               cleanString(fastGet(row, "epicName",               ["epicName", "name", "Name", "voterName", "voter_name", "epic_name"])),
      epicName1:              cleanString(fastGet(row, "epicName1",              ["epicNameL1", "epicName1", "nameHindi", "epicNameHindi", "nameL1", "epic_name_l1"])),
      Gender:                 cleanString(fastGet(row, "Gender",                 ["Gender", "gender", "sex"])),
      mobileNo:               cleanMobile(fastGet(row, "mobileNo",               ["mobileNo", "mobile", "Mobile", "phone", "contactNo", "mobile_no"])),
      enrollDob:              cleanString(fastGet(row, "enrollDob",              ["enrollDob", "erollDob", "dob", "DOB", "dateOfBirth", "enroll_dob", "eroll_dob"])),
      Age:                    cleanNumber(fastGet(row, "Age",                    ["Age", "age"])),
      fathersOrGuardian:      cleanString(fastGet(row, "fathersOrGuardian",      ["fathersOrGuardianName", "fathersOrGuardian", "fatherName", "father_name", "fathersName", "guardianName", "father", "guardian", "rln_name", "relative_name", "relativeName", "fatherHusbandName", "father_husband_name", "पिता का नाम", "पिता/पति का नाम", "संबंधी का नाम"])),
      fathersOrGuardianHindi: cleanString(fastGet(row, "fathersOrGuardianHindi", ["fathersOrGuardianNameL1", "fathersOrGuardianL1", "fathersOrGuardianHindi", "fatherNameHindi", "fatherNameL1", "father_name_hindi", "rln_name_l1", "rln_name_hindi", "relativeNameHindi", "relative_name_hindi", "fatherHindi", "पिता का नाम हिन्दी", "पिता का नाम (हिन्दी)"])),
      mothersName:            cleanString(fastGet(row, "mothersName",            ["mothersName", "motherName", "mother", "mother_name", "mothers_name", "माता का नाम"])),
      spouseName:             cleanString(fastGet(row, "spouseName",             ["spouseName", "spouseNa", "husbandName", "husband", "spouse", "spouse_name", "पति का नाम"])),
      houseNo:                cleanString(fastGet(row, "houseNo",                ["houseNo", "houseNumber", "house", "house_no", "मकान संख्या"])),
      acNo:                   cleanString(fastGet(row, "acNo",                   ["acNo", "acNumber", "assemblyNumber", "assemblyNo", "ac_no"])),
      partNo:                 cleanString(fastGet(row, "partNo",                 ["partNo", "partNumber", "boothNumber", "part", "part_no", "boothNo", "भाग संख्या"])),
      partSerial:             cleanPartSerial(fastGet(row, "partSerial",         ["partSerial", "partSerialNo", "serialNo", "part_serial", "serial", "partSerialNum", "part_serial_no", "slNo", "slno", "serialNumber", "serial_number", "srNo", "sr_no", "slNoInPart", "sl_no_in_part", "serial_no_in_part", "sNo", "s_no", "क्रम संख्या", "क्रमांक"])),
      pollingStation,
    };
  });

  return result;
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
// Flow (optimized, same behavior as before):
//   1. getCurrentAssembly()
//   2. Parse file (xlsx / xls / csv)
//   3. Validate all rows in memory (booth names simulated)
//   4. Save booths once each (auto-create if missing)
//   5. Save voters in batches (createMany / parallel updates)
//   6. Save ImportError rows in bulk
//   7. Save ImportBatch result
//

export async function importVoterFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  uploadedById: string
) {
  // ======================================
  // MEMORY CHECKPOINT: before parse
  // ======================================

  const mem0 = process.memoryUsage();
  console.log(
    `[Memory] Before parse — rss: ${(mem0.rss / 1024 / 1024).toFixed(1)} MB, heapUsed: ${(mem0.heapUsed / 1024 / 1024).toFixed(1)} MB`
  );

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

  const batch = await prisma.importBatch.create({
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
    rows = parseVoterExcel(fileBuffer);
  } catch (error) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "FAILED" },
    });

    throw new Error(
      error instanceof Error ? error.message : "Unable to read voter file"
    );
  }

  // Change G: Drop the fileBuffer reference immediately so the underlying
  // Buffer is eligible for GC without waiting for the caller to release it.
  // TypeScript doesn't allow null assignment on a const-typed param, so we
  // cast through unknown. This is safe: the variable is not read again.
  (fileBuffer as unknown as null);

  // ======================================
  // MEMORY CHECKPOINT: after parse
  // ======================================

  const mem1 = process.memoryUsage();
  console.log(
    `[Memory] After parse — rss: ${(mem1.rss / 1024 / 1024).toFixed(1)} MB, heapUsed: ${(mem1.heapUsed / 1024 / 1024).toFixed(1)} MB`
  );

  // ======================================
  // COUNTERS
  // ======================================

  const totalRows = rows.length;

  let validRows = 0;
  let duplicateRows = 0;
  let errorRows = 0;
  let importedRows = 0;
  let newBoothsCreated = 0;

  const seenEpics = new Set<string>();

  // ======================================
  // ERROR COLLECTION (written in bulk later)
  // ======================================

  // Change B: PendingError stores only rowNumber (not rawRow).
  // Raw row is re-read from rows[rowNumber - 2] when saving ImportErrors,
  // so we don't keep a second copy of every error row's data in memory.
  interface PendingError {
    rowNumber: number;
    message: string;
  }

  const pendingErrors: PendingError[] = [];

  // ======================================
  // BOOTH STATE (simulated in memory)
  // ======================================
  //
  // Same rules as before, but no DB call per row:
  //  - new booth  -> name = pollingStation || "Booth N"
  //  - later row with a different pollingStation -> name changes
  //    (last non-empty name wins, exactly like the old per-row update)
  // DB writes happen once per booth after the validation pass.
  //

  interface BoothState {
    id: string | null;
    name: string;
    isNew: boolean;
    dirty: boolean;
  }

  const booths = new Map<string, BoothState>();

  const existingBooths = await prisma.booth.findMany({
    where: { assemblyId },
    select: { id: true, boothNumber: true, name: true },
  });

  for (const b of existingBooths) {
    booths.set(b.boothNumber, {
      id: b.id,
      name: b.name,
      isNew: false,
      dirty: false,
    });
  }

  // ======================================
  // PASS 1: VALIDATE ALL ROWS IN MEMORY
  // ======================================

  // Change B: PreparedVoter no longer holds rawRow, eliminating a full duplicate
  // of every valid row's parsed data. Errors re-read rows[] by index on demand.
  interface PreparedVoter {
    rowNumber: number;
    epic: string;
    boothNumber: string;
    mobile: string | null;
    data: {
      name: string;
      nameHindi: string | null;
      fatherName: string | null;
      fatherNameHindi: string | null;
      motherName: string | null;
      husbandName: string | null;
      houseNumber: string | null;
      gender: string | null;
      age: number | null;
      dateOfBirth: string | null;
      assemblyNumber: string | null;
      partNumber: string | null;
      partSerial: string | null;
      pollingStationName: string;
      assemblyId: string;
    };
  }

  const prepared: PreparedVoter[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const rowNumber = index + 2;

    const epicValue = cleanString(row.epicNo);
    const epic = epicValue?.toUpperCase();
    const name = cleanString(row.epicName);
    const boothNumber = cleanString(row.partNo);
    const pollingStationName = cleanString(row.pollingStation);

    // ---- required validation (same messages as before) ----

    let message: string | null = null;

    if (!epic) message = "EPIC number is missing";
    else if (!name) message = "Voter name is missing";
    else if (!boothNumber)
      message = "Part/Booth number (partNo) is missing";

    if (message) {
      errorRows++;
      // Change B: push only rowNumber; rawRow fetched from rows[] at save time
      pendingErrors.push({ rowNumber, message });
      continue;
    }

    // ---- duplicate EPIC in current file ----

    if (seenEpics.has(epic!)) {
      duplicateRows++;
      continue;
    }
    seenEpics.add(epic!);

    // ---- booth state ----

    let state = booths.get(boothNumber!);

    if (!state) {
      state = {
        id: null,
        name: pollingStationName || `Booth ${boothNumber}`,
        isNew: true,
        dirty: false,
      };
      booths.set(boothNumber!, state);
    } else if (pollingStationName && state.name !== pollingStationName) {
      state.name = pollingStationName;
      state.dirty = true;
    }

    const resolvedPollingStationName =
      pollingStationName || state.name || `Booth ${boothNumber}`;

    validRows++;

    // Change B: no rawRow stored here
    prepared.push({
      rowNumber,
      epic: epic!,
      boothNumber: boothNumber!,
      mobile: cleanMobile(row.mobileNo),
      data: {
        name: name!,
        nameHindi: cleanString(row.epicName1),
        fatherName: cleanString(row.fathersOrGuardian),
        fatherNameHindi: cleanString(row.fathersOrGuardianHindi),
        motherName: cleanString(row.mothersName),
        husbandName: cleanString(row.spouseName),
        houseNumber: cleanString(row.houseNo),
        gender: cleanString(row.Gender),
        age: cleanNumber(row.Age),
        dateOfBirth: cleanString(row.enrollDob),
        assemblyNumber: cleanString(row.acNo),
        partNumber: cleanString(row.partNo),
        partSerial: cleanString(row.partSerial),
        pollingStationName: resolvedPollingStationName,
        assemblyId,
      },
    });
  }

  // ======================================
  // MEMORY CHECKPOINT: after pass 1
  // ======================================

  const mem2 = process.memoryUsage();
  console.log(
    `[Memory] After pass 1 — rss: ${(mem2.rss / 1024 / 1024).toFixed(1)} MB, heapUsed: ${(mem2.heapUsed / 1024 / 1024).toFixed(1)} MB`
  );

  // ======================================
  // SAVE BOOTHS (once per booth, not per row)
  // ======================================

  const failedBooths = new Map<string, string>();

  for (const [boothNumber, state] of booths) {
    try {
      if (state.isNew) {
        const booth = await prisma.booth.create({
          data: {
            assemblyId,
            boothNumber,
            name: state.name,
          },
        });

        state.id = booth.id;
        newBoothsCreated++;
      } else if (state.dirty && state.id) {
        await prisma.booth.update({
          where: { id: state.id },
          data: { name: state.name },
        });
      }
    } catch (error) {
      failedBooths.set(
        boothNumber,
        error instanceof Error ? error.message : "Unknown import error"
      );
    }
  }

  // ======================================
  // PASS 2: SAVE VOTERS IN BATCHES
  // ======================================

  const CHUNK_SIZE = 1000;
  const UPDATE_CONCURRENCY = 25;
  const startTime = Date.now();

  // Change B: recordFailure no longer copies rawRow; just stores rowNumber
  const recordFailure = (v: PreparedVoter, reason: unknown) => {
    errorRows++;
    pendingErrors.push({
      rowNumber: v.rowNumber,
      message: reason instanceof Error ? reason.message : "Unknown import error",
    });
  };

  // Change F: Build savable from prepared, then immediately drop the prepared
  // reference so both arrays are never alive at the same time.
  // Voters whose booth could not be saved -> error (same as old per-row failure)
  const savable: (PreparedVoter | undefined)[] = [];

  for (const v of prepared) {
    const boothError = failedBooths.get(v.boothNumber);
    if (boothError) {
      validRows--;
      recordFailure(v, new Error(boothError));
    } else {
      savable.push(v);
    }
  }

  // Change F: Drop prepared now that savable is built.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prepared as any).length = 0;

  console.log(`[Import] Saving ${savable.length} valid voter records...`);

  for (let i = 0; i < savable.length; i += CHUNK_SIZE) {
    // Change E: filter out slots already cleared; cast to drop undefined
    const chunk = (savable.slice(i, i + CHUNK_SIZE) as PreparedVoter[]).filter(Boolean);

    // One query to find which voters already exist (instead of one per row)
    const existingRows = await prisma.voter.findMany({
      where: {
        assemblyId,
        epic: { in: chunk.map((v) => v.epic) },
      },
      select: { id: true, epic: true },
    });

    const existingMap = new Map<string, string>();
    for (const r of existingRows) existingMap.set(r.epic, r.id);

    const toCreate = chunk.filter((v) => !existingMap.has(v.epic));
    const toUpdate = chunk.filter((v) => existingMap.has(v.epic));

    // ---- NEW VOTERS: one createMany per chunk ----
    // Excel mobile is used ONLY when creating a new voter.

    const buildCreate = (v: PreparedVoter) => ({
      epic: v.epic,
      ...v.data,
      boothId: booths.get(v.boothNumber)!.id!,
      mobile: v.mobile,
      verification: "UNVERIFIED" as const,
      voteStatus: "PENDING" as const,
    });

    if (toCreate.length > 0) {
      try {
        await prisma.voter.createMany({
          data: toCreate.map(buildCreate),
        });
        importedRows += toCreate.length;
      } catch (bulkError) {
        console.warn(
          `[Import] createMany failed near row ${toCreate[0]?.rowNumber}, retrying row by row:`,
          bulkError
        );

        for (const v of toCreate) {
          try {
            await prisma.voter.create({ data: buildCreate(v) });
            importedRows++;
          } catch (singleError) {
            recordFailure(v, singleError);
          }
        }
      }
    }

    // ---- EXISTING VOTERS: smart update, small parallel groups ----
    // mobile / verification / voteStatus are NOT touched.

    for (let j = 0; j < toUpdate.length; j += UPDATE_CONCURRENCY) {
      const group = toUpdate.slice(j, j + UPDATE_CONCURRENCY);

      const results = await Promise.allSettled(
        group.map((v) =>
          prisma.voter.update({
            where: { id: existingMap.get(v.epic)! },
            data: {
              ...v.data,
              boothId: booths.get(v.boothNumber)!.id!,
            },
          })
        )
      );

      results.forEach((result, k) => {
        if (result.status === "fulfilled") {
          importedRows++;
        } else {
          recordFailure(group[k]!, result.reason);
        }
      });
    }

    // Change E: Release each chunk's entries from savable so the GC can reclaim
    // their memory as the loop advances instead of holding the peak until the end.
    for (let k = i; k < Math.min(i + CHUNK_SIZE, savable.length); k++) {
      savable[k] = undefined;
    }

    const done = Math.min(i + CHUNK_SIZE, savable.length);
    if (done % 10000 < CHUNK_SIZE || done >= savable.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[Import] Progress: ${done.toLocaleString()} / ${savable.length.toLocaleString()} (${elapsed}s)`
      );
    }
  }

  // ======================================
  // SAVE IMPORT ERRORS (in bulk)
  // ======================================
  //
  // Sanitize raw Excel data before
  // inserting into PostgreSQL JSONB.
  //

  const ERROR_CHUNK = 500;

  for (let i = 0; i < pendingErrors.length; i += ERROR_CHUNK) {
    const slice = pendingErrors.slice(i, i + ERROR_CHUNK);

    try {
      await prisma.importError.createMany({
        data: slice.map((e) => ({
          batchId: batch.id,
          rowNumber: e.rowNumber,
          // Change B: raw row looked up from rows[] by 0-based index (rowNumber - 2)
          rawData: toPrismaJson(rows[e.rowNumber - 2] ?? {}),
          errorMessage: e.message,
        })),
      });
    } catch {
      for (const e of slice) {
        try {
          await prisma.importError.create({
            data: {
              batchId: batch.id,
              rowNumber: e.rowNumber,
              rawData: toPrismaJson(rows[e.rowNumber - 2] ?? {}),
              errorMessage: e.message,
            },
          });
        } catch (err) {
          console.warn(`[Import] Could not save error for row ${e.rowNumber}:`, err);
        }
      }
    }
  }

  // ======================================
  // MARK IMPORT COMPLETED
  // ======================================

  const completedBatch = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "COMMITTED",
      totalRows,
      validRows,
      duplicateRows,
      errorRows,
      importedRows,
      completedAt: new Date(),
    },
  });

  // ======================================
  // MEMORY CHECKPOINT: end of import
  // ======================================

  const mem3 = process.memoryUsage();
  console.log(
    `[Memory] End of import — rss: ${(mem3.rss / 1024 / 1024).toFixed(1)} MB, heapUsed: ${(mem3.heapUsed / 1024 / 1024).toFixed(1)} MB`
  );

  // ======================================
  // POST-IMPORT MAINTENANCE
  // ======================================
  //
  // VACUUM ANALYZE reclaims dead tuples left by upsert retries and
  // refreshes column statistics so the query planner stays accurate.
  //
  // Fired without await so it runs in the background and does NOT
  // delay the HTTP response.  Errors are only logged, never thrown.
  //
  prisma.$executeRawUnsafe(`VACUUM ANALYZE "Voter"`)
    .then(() => console.log("[Import] VACUUM ANALYZE Voter completed"))
    .catch((err: unknown) =>
      console.warn("[Import] VACUUM ANALYZE failed (non-fatal):", err)
    );

  // ======================================
  // RETURN RESULT
  // ======================================

  return {
    ...completedBatch,
    newBoothsCreated,
  };
}
