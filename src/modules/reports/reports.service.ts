import * as XLSX from "xlsx";
import { prisma } from "../../config/prisma.js";
import { getSingleActiveAssembly } from "../../utils/single-assembly.js";
import type { ReportFilterInput } from "./reports.validation.js";

function buildVoterWhere(
  assemblyId: string,
  input: ReportFilterInput
) {
  const where: any = {
    assemblyId,
  };

  if (input.boothId) {
    where.boothId = input.boothId;
  }

  if (input.classification) {
    where.classification = input.classification;
  }

  if (input.verification) {
    where.verification = input.verification;
  }

  if (input.voteStatus) {
    where.voteStatus = input.voteStatus;
  }

  if (input.gender) {
    where.gender = {
      equals: input.gender,
      mode: "insensitive",
    };
  }

  if (
    input.ageFrom !== undefined ||
    input.ageTo !== undefined
  ) {
    where.age = {};

    if (input.ageFrom !== undefined) {
      where.age.gte = input.ageFrom;
    }

    if (input.ageTo !== undefined) {
      where.age.lte = input.ageTo;
    }
  }

  if (input.search) {
    where.OR = [
      {
        epic: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        mobile: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        houseNumber: {
          contains: input.search,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

/**
 * Voter report
 */
export async function getVoterReport(
  input: ReportFilterInput
) {
  const assembly =
    await getSingleActiveAssembly();

  const where = buildVoterWhere(
    assembly.id,
    input
  );

  const skip =
    (input.page - 1) * input.limit;

  const [total, voters] =
    await prisma.$transaction([
      prisma.voter.count({
        where,
      }),

      prisma.voter.findMany({
        where,
        skip,
        take: input.limit,

        orderBy: {
          epic: "asc",
        },

        include: {
          booth: {
            select: {
              id: true,
              boothNumber: true,
              name: true,
              village: true,
            },
          },
        },
      }),
    ]);

  return {
    assembly,
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(
      total / input.limit
    ),
    data: voters,
  };
}

/**
 * Complete voter data for export
 */
export async function getVotersForExport(
  input: ReportFilterInput
) {
  const assembly =
    await getSingleActiveAssembly();

  const where = buildVoterWhere(
    assembly.id,
    input
  );

  const voters =
    await prisma.voter.findMany({
      where,

      orderBy: {
        epic: "asc",
      },

      include: {
        booth: {
          select: {
            boothNumber: true,
            name: true,
            village: true,
          },
        },
      },
    });

  return {
    assembly,
    voters,
  };
}

/**
 * Booth report
 */
export async function getBoothReport() {
  const assembly =
    await getSingleActiveAssembly();

  const booths =
    await prisma.booth.findMany({
      where: {
        assemblyId: assembly.id,
      },

      orderBy: {
        boothNumber: "asc",
      },

      include: {
        volunteer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            status: true,
          },
        },

        _count: {
          select: {
            voters: true,
          },
        },
      },
    });

  const data = await Promise.all(
    booths.map(async (booth) => {
      const [
        green,
        yellow,
        red,
        black,
        unclassified,
        verified,
        unverified,
      ] = await Promise.all([
        prisma.voter.count({
          where: {
            boothId: booth.id,
            classification: "GREEN",
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            classification: "YELLOW",
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            classification: "RED",
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            classification: "BLACK",
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            classification: null,
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            verification: "VERIFIED",
          },
        }),

        prisma.voter.count({
          where: {
            boothId: booth.id,
            verification: "UNVERIFIED",
          },
        }),
      ]);

      const total =
        booth._count.voters;

      const percentage = (
        value: number
      ) =>
        total === 0
          ? 0
          : Number(
              ((value / total) * 100).toFixed(2)
            );

      return {
        boothId: booth.id,
        boothNumber: booth.boothNumber,
        boothName: booth.name,
        village: booth.village,

        volunteerName:
          booth.volunteer?.name ?? null,

        volunteerMobile:
          booth.volunteer?.mobile ?? null,

        volunteerStatus:
          booth.volunteer?.status ?? null,

        totalVoters: total,

        green,
        yellow,
        red,
        black,
        unclassified,

        verified,
        unverified,

        greenPercentage:
          percentage(green),

        yellowPercentage:
          percentage(yellow),

        redPercentage:
          percentage(red),

        blackPercentage:
          percentage(black),

        verificationPercentage:
          percentage(verified),
      };
    })
  );

  return {
    assembly,
    total: data.length,
    data,
  };
}

/**
 * Volunteer report
 */
export async function getVolunteerReport() {
  const assembly =
    await getSingleActiveAssembly();

  const volunteers =
    await prisma.volunteer.findMany({
      where: {
        booth: {
          assemblyId: assembly.id,
        },
      },

      orderBy: {
        name: "asc",
      },

      include: {
        booth: {
          select: {
            id: true,
            boothNumber: true,
            name: true,
            village: true,
          },
        },
      },
    });

  return {
    assembly,
    total: volunteers.length,
    data: volunteers.map(
      (volunteer) => ({
        id: volunteer.id,
        name: volunteer.name,
        mobile: volunteer.mobile,
        status: volunteer.status,

        boothId:
          volunteer.booth?.id ?? null,

        boothNumber:
          volunteer.booth?.boothNumber ??
          null,

        boothName:
          volunteer.booth?.name ?? null,

        village:
          volunteer.booth?.village ??
          null,

        createdAt:
          volunteer.createdAt,
      })
    ),
  };
}

/**
 * Classification report
 */
export async function getClassificationReport() {
  const assembly =
    await getSingleActiveAssembly();

  const [
    total,
    green,
    yellow,
    red,
    black,
    unclassified,
  ] = await Promise.all([
    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        classification: "GREEN",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        classification: "YELLOW",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        classification: "RED",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        classification: "BLACK",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        classification: null,
      },
    }),
  ]);

  const percentage = (
    value: number
  ) =>
    total === 0
      ? 0
      : Number(
          ((value / total) * 100).toFixed(2)
        );

  return {
    assembly,

    total,

    green: {
      count: green,
      percentage: percentage(green),
    },

    yellow: {
      count: yellow,
      percentage: percentage(yellow),
    },

    red: {
      count: red,
      percentage: percentage(red),
    },

    black: {
      count: black,
      percentage: percentage(black),
    },

    unclassified: {
      count: unclassified,
      percentage:
        percentage(unclassified),
    },
  };
}

/**
 * Convert voter records into flat export rows
 */
export function mapVotersForExport(
  voters: any[]
) {
  return voters.map((voter) => ({
    EPIC: voter.epic,

    Name: voter.name,

    "Name Hindi":
      voter.nameHindi ?? "",

    "Father Name":
      voter.fatherName ?? "",

    "Father Name Hindi":
      voter.fatherNameHindi ?? "",

    "Mother Name":
      voter.motherName ?? "",

    "Husband Name":
      voter.husbandName ?? "",

    Gender:
      voter.gender ?? "",

    Age:
      voter.age ?? "",

    "Date of Birth":
      voter.dateOfBirth ?? "",

    "House Number":
      voter.houseNumber ?? "",

    Mobile:
      voter.mobile ?? "",

    "Assembly Number":
      voter.assemblyNumber ?? "",

    "Part Number":
      voter.partNumber ?? "",

    "Part Serial":
      voter.partSerial ?? "",

    "Polling Station":
      voter.pollingStationName ?? "",

    Village:
      voter.booth?.village ?? "",

    Booth:
      voter.booth?.boothNumber ?? "",

    "Booth Name":
      voter.booth?.name ?? "",

    Classification:
      voter.classification ?? "",

    Verification:
      voter.verification,

    "Vote Status":
      voter.voteStatus,

    "Created At":
      voter.createdAt,

    "Updated At":
      voter.updatedAt,
  }));
}

/**
 * Create XLSX buffer
 */
export function createExcelBuffer(
  rows: Record<string, unknown>[],
  sheetName: string
): Buffer {
  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

/**
 * Create CSV buffer
 */
export function createCsvBuffer(
  rows: Record<string, unknown>[]
): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet =
    XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Sheet1"
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "csv",
  });
}

/**
 * Audit export
 */
export async function createExportAudit(
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      action,
      entity: "REPORT",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: details as any,
      userId,
    },
  });
}