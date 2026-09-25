import { prisma } from "../../config/prisma.js";
import {
  getSingleActiveAssembly,
} from "../../utils/single-assembly.js";

import {
  AnalyticsBoothFilterInput,
} from "./analytics.validation.js";

// ========================================
// HELPER
// ========================================

function percentage(
  value: number,
  total: number
): number {
  if (total === 0) {
    return 0;
  }

  return Number(
    ((value / total) * 100).toFixed(2)
  );
}

// ========================================
// GET SYSTEM SETTINGS
// ========================================

async function getAnalyticsSettings() {
  const settings =
    await prisma.systemSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

  if (!settings) {
    // Use the application's default
    // thresholds if settings have not
    // been created yet.
    return {
      strongGreenPercent: 55,
      moderateGreenPercent: 40,

      highOpportunityYellow: 15,
      mediumOpportunityYellow: 8,

      highVerification: 80,
      mediumVerification: 50,
    };
  }

  return settings;
}

// ========================================
// 1. OVERVIEW
// ========================================

export async function getAnalyticsOverview() {
  const assembly =
    await getSingleActiveAssembly();

  const settings =
    await getAnalyticsSettings();

  const [
    totalVoters,
    green,
    yellow,
    red,
    black,
    unclassified,
    verified,
    unverified,
    totalBooths,
    assignedBooths,
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

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        verification: "VERIFIED",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        verification: "UNVERIFIED",
      },
    }),

    prisma.booth.count({
      where: {
        assemblyId: assembly.id,
      },
    }),

    prisma.booth.count({
      where: {
        assemblyId: assembly.id,
        volunteerId: {
          not: null,
        },
      },
    }),
  ]);

  const activeBooths = await prisma.booth.findMany({
    where: { assemblyId: assembly.id },
    select: {
      id: true,
      _count: {
        select: { voters: true },
      },
    },
  });

  const boothIds = activeBooths.map((b) => b.id);

  const [boothClassificationCounts, boothVerificationCounts] = await Promise.all([
    prisma.voter.groupBy({
      by: ["boothId", "classification"],
      where: { boothId: { in: boothIds } },
      _count: { _all: true },
    }),
    prisma.voter.groupBy({
      by: ["boothId", "verification"],
      where: { boothId: { in: boothIds } },
      _count: { _all: true },
    }),
  ]);

  let strongBooths = 0;
  let moderateBooths = 0;
  let weakBooths = 0;
  let highOpportunityBooths = 0;
  let highConfidenceBooths = 0;

  for (const b of activeBooths) {
    const totalBoothVoters = b._count.voters;
    if (totalBoothVoters === 0) {
      weakBooths++;
      continue;
    }

    const bGreen =
      boothClassificationCounts.find(
        (c) => c.boothId === b.id && c.classification === "GREEN"
      )?._count._all || 0;

    const bYellow =
      boothClassificationCounts.find(
        (c) => c.boothId === b.id && c.classification === "YELLOW"
      )?._count._all || 0;

    const bVerified =
      boothVerificationCounts.find(
        (c) => c.boothId === b.id && c.verification === "VERIFIED"
      )?._count._all || 0;

    const greenPct = (bGreen / totalBoothVoters) * 100;
    const yellowPct = (bYellow / totalBoothVoters) * 100;
    const verPct = (bVerified / totalBoothVoters) * 100;

    if (greenPct >= settings.strongGreenPercent) {
      strongBooths++;
    } else if (greenPct >= settings.moderateGreenPercent) {
      moderateBooths++;
    } else {
      weakBooths++;
    }

    if (yellowPct >= settings.highOpportunityYellow) {
      highOpportunityBooths++;
    }

    if (verPct >= settings.highVerification) {
      highConfidenceBooths++;
    }
  }

  const classified =
    green +
    yellow +
    red +
    black;

  const greenPercentage =
    percentage(
      green,
      totalVoters
    );

  const yellowPercentage =
    percentage(
      yellow,
      totalVoters
    );

  const verificationPercentage =
    percentage(
      verified,
      totalVoters
    );

  let confidenceLevel:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  if (
    verificationPercentage >=
    settings.highVerification
  ) {
    confidenceLevel = "HIGH";
  } else if (
    verificationPercentage >=
    settings.mediumVerification
  ) {
    confidenceLevel = "MEDIUM";
  } else {
    confidenceLevel = "LOW";
  }

  let greenStrength:
    | "STRONG"
    | "MODERATE"
    | "WEAK";

  if (
    greenPercentage >=
    settings.strongGreenPercent
  ) {
    greenStrength = "STRONG";
  } else if (
    greenPercentage >=
    settings.moderateGreenPercent
  ) {
    greenStrength = "MODERATE";
  } else {
    greenStrength = "WEAK";
  }

  let yellowOpportunity:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  if (
    yellowPercentage >=
    settings.highOpportunityYellow
  ) {
    yellowOpportunity = "HIGH";
  } else if (
    yellowPercentage >=
    settings.mediumOpportunityYellow
  ) {
    yellowOpportunity = "MEDIUM";
  } else {
    yellowOpportunity = "LOW";
  }

  return {
    assembly,

    voters: {
      total: totalVoters,

      classified,

      unclassified,

      classificationPercentage:
        percentage(
          classified,
          totalVoters
        ),
    },

    classification: {
      green,
      yellow,
      red,
      black,

      percentages: {
        green:
          percentage(
            green,
            totalVoters
          ),

        yellow:
          percentage(
            yellow,
            totalVoters
          ),

        red:
          percentage(
            red,
            totalVoters
          ),

        black:
          percentage(
            black,
            totalVoters
          ),
      },
    },

    verification: {
      verified,
      unverified,

      verifiedPercentage:
        verificationPercentage,

      level: confidenceLevel,
    },

    booths: {
      total: totalBooths,

      assigned:
        assignedBooths,

      unassigned:
        totalBooths -
        assignedBooths,

      assignmentPercentage:
        percentage(
          assignedBooths,
          totalBooths
        ),

      strong: strongBooths,
      moderate: moderateBooths,
      weak: weakBooths,
      opportunity: highOpportunityBooths,
      highConfidence: highConfidenceBooths,
    },

    analysis: {
      greenStrength,

      yellowOpportunity,

      dataConfidence:
        confidenceLevel,
    },

    thresholds: {
      strongGreenPercent:
        settings.strongGreenPercent,

      moderateGreenPercent:
        settings.moderateGreenPercent,

      highOpportunityYellow:
        settings.highOpportunityYellow,

      mediumOpportunityYellow:
        settings.mediumOpportunityYellow,

      highVerification:
        settings.highVerification,

      mediumVerification:
        settings.mediumVerification,
    },
  };
}

// ========================================
// 2. CLASSIFICATION ANALYTICS
// ========================================

export async function getClassificationAnalytics() {
  const assembly =
    await getSingleActiveAssembly();

  const total =
    await prisma.voter.count({
      where: {
        assemblyId: assembly.id,
      },
    });

  const [
    green,
    yellow,
    red,
    black,
    unclassified,
  ] = await Promise.all([
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

  return {
    assembly,

    total,

    data: [
      {
        classification: "GREEN",
        count: green,
        percentage:
          percentage(green, total),
      },

      {
        classification: "YELLOW",
        count: yellow,
        percentage:
          percentage(yellow, total),
      },

      {
        classification: "RED",
        count: red,
        percentage:
          percentage(red, total),
      },

      {
        classification: "BLACK",
        count: black,
        percentage:
          percentage(black, total),
      },

      {
        classification: "UNCLASSIFIED",
        count: unclassified,
        percentage:
          percentage(
            unclassified,
            total
          ),
      },
    ],
  };
}

// ========================================
// 3. VERIFICATION ANALYTICS
// ========================================

export async function getVerificationAnalytics() {
  const assembly =
    await getSingleActiveAssembly();

  const total =
    await prisma.voter.count({
      where: {
        assemblyId: assembly.id,
      },
    });

  const [
    verified,
    unverified,
  ] = await Promise.all([
    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        verification: "VERIFIED",
      },
    }),

    prisma.voter.count({
      where: {
        assemblyId: assembly.id,
        verification: "UNVERIFIED",
      },
    }),
  ]);

  const settings =
    await getAnalyticsSettings();

  const verifiedPercentage =
    percentage(
      verified,
      total
    );

  let level:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  if (
    verifiedPercentage >=
    settings.highVerification
  ) {
    level = "HIGH";
  } else if (
    verifiedPercentage >=
    settings.mediumVerification
  ) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  return {
    assembly,

    total,

    verified,

    unverified,

    verifiedPercentage,

    level,

    thresholds: {
      high:
        settings.highVerification,

      medium:
        settings.mediumVerification,
    },
  };
}

// ========================================
// 4. BOOTH ANALYTICS
// ========================================

export async function getBoothAnalytics(
  input: AnalyticsBoothFilterInput
) {
  const assembly =
    await getSingleActiveAssembly();

  const settings =
    await getAnalyticsSettings();

  const {
    page,
    limit,
    search,
  } = input;

  const skip =
    (page - 1) * limit;

  const where = {
    assemblyId: assembly.id,

    ...(search
      ? {
          OR: [
            {
              boothNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },

            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },

            {
              village: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [
    booths,
    total,
  ] = await Promise.all([
    prisma.booth.findMany({
      where,

      skip,

      take: limit,

      orderBy: {
        boothNumber: "asc",
      },

      select: {
        id: true,

        boothNumber: true,

        name: true,

        village: true,

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
    }),

    prisma.booth.count({
      where,
    }),
  ]);

  const boothIds = booths.map((b) => b.id);

  const [classificationGroups, verificationGroups] = await Promise.all([
    prisma.voter.groupBy({
      by: ["boothId", "classification"],
      where: {
        boothId: { in: boothIds },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.voter.groupBy({
      by: ["boothId", "verification"],
      where: {
        boothId: { in: boothIds },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const statsByBooth = new Map<
    string,
    {
      green: number;
      yellow: number;
      red: number;
      black: number;
      unclassified: number;
      verified: number;
    }
  >();

  for (const id of boothIds) {
    statsByBooth.set(id, {
      green: 0,
      yellow: 0,
      red: 0,
      black: 0,
      unclassified: 0,
      verified: 0,
    });
  }

  for (const group of classificationGroups) {
    const stats = statsByBooth.get(group.boothId);
    if (!stats) continue;
    const count = group._count._all;
    if (group.classification === "GREEN") stats.green = count;
    else if (group.classification === "YELLOW") stats.yellow = count;
    else if (group.classification === "RED") stats.red = count;
    else if (group.classification === "BLACK") stats.black = count;
    else if (group.classification === null) stats.unclassified = count;
  }

  for (const group of verificationGroups) {
    const stats = statsByBooth.get(group.boothId);
    if (!stats) continue;
    if (group.verification === "VERIFIED") {
      stats.verified = group._count._all;
    }
  }

  const boothAnalytics = booths.map((booth) => {
    const stats = statsByBooth.get(booth.id) || {
      green: 0,
      yellow: 0,
      red: 0,
      black: 0,
      unclassified: 0,
      verified: 0,
    };
    const { green, yellow, red, black, unclassified, verified } = stats;

          const totalVoters =
            booth._count.voters;

          const greenPercentage =
            percentage(
              green,
              totalVoters
            );

          const yellowPercentage =
            percentage(
              yellow,
              totalVoters
            );

          const verificationPercentage =
            percentage(
              verified,
              totalVoters
            );

          let greenStrength:
            | "STRONG"
            | "MODERATE"
            | "WEAK";

          if (
            greenPercentage >=
            settings.strongGreenPercent
          ) {
            greenStrength = "STRONG";
          } else if (
            greenPercentage >=
            settings.moderateGreenPercent
          ) {
            greenStrength = "MODERATE";
          } else {
            greenStrength = "WEAK";
          }

          let yellowOpportunity:
            | "HIGH"
            | "MEDIUM"
            | "LOW";

          if (
            yellowPercentage >=
            settings.highOpportunityYellow
          ) {
            yellowOpportunity = "HIGH";
          } else if (
            yellowPercentage >=
            settings.mediumOpportunityYellow
          ) {
            yellowOpportunity = "MEDIUM";
          } else {
            yellowOpportunity = "LOW";
          }

          let dataConfidence:
            | "HIGH"
            | "MEDIUM"
            | "LOW";

          if (
            verificationPercentage >=
            settings.highVerification
          ) {
            dataConfidence = "HIGH";
          } else if (
            verificationPercentage >=
            settings.mediumVerification
          ) {
            dataConfidence = "MEDIUM";
          } else {
            dataConfidence = "LOW";
          }

          return {
            booth: {
              id: booth.id,

              boothNumber:
                booth.boothNumber,

              name: booth.name,

              village:
                booth.village,

              volunteer:
                booth.volunteer,
            },

            voters: {
              total: totalVoters,

              green,
              yellow,
              red,
              black,
              unclassified,

              verified,
            },

            percentages: {
              green:
                greenPercentage,

              yellow:
                yellowPercentage,

              red:
                percentage(
                  red,
                  totalVoters
                ),

              black:
                percentage(
                  black,
                  totalVoters
                ),

              unclassified:
                percentage(
                  unclassified,
                  totalVoters
                ),

              verified:
                verificationPercentage,
            },

            analysis: {
              greenStrength,

              yellowOpportunity,

              dataConfidence,
            },
          };
        }
      );

  return {
    assembly,

    booths:
      boothAnalytics,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(
          total / limit
        ),
    },

    thresholds: {
      strongGreenPercent:
        settings.strongGreenPercent,

      moderateGreenPercent:
        settings.moderateGreenPercent,

      highOpportunityYellow:
        settings.highOpportunityYellow,

      mediumOpportunityYellow:
        settings.mediumOpportunityYellow,

      highVerification:
        settings.highVerification,

      mediumVerification:
        settings.mediumVerification,
    },
  };
}

// ========================================
// 5. SINGLE BOOTH ANALYTICS
// ========================================

export async function getSingleBoothAnalytics(
  boothId: string
) {
  const assembly =
    await getSingleActiveAssembly();

  const settings =
    await getAnalyticsSettings();

  const booth =
    await prisma.booth.findFirst({
      where: {
        id: boothId,

        assemblyId:
          assembly.id,
      },

      select: {
        id: true,

        boothNumber: true,

        name: true,

        village: true,

        volunteer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            status: true,
          },
        },
      },
    });

  if (!booth) {
    throw new Error(
      "Booth not found in the active assembly"
    );
  }

  const total =
    await prisma.voter.count({
      where: {
        boothId: booth.id,
      },
    });

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

  const greenPercentage =
    percentage(
      green,
      total
    );

  const yellowPercentage =
    percentage(
      yellow,
      total
    );

  const verificationPercentage =
    percentage(
      verified,
      total
    );

  let greenStrength:
    | "STRONG"
    | "MODERATE"
    | "WEAK";

  if (
    greenPercentage >=
    settings.strongGreenPercent
  ) {
    greenStrength = "STRONG";
  } else if (
    greenPercentage >=
    settings.moderateGreenPercent
  ) {
    greenStrength = "MODERATE";
  } else {
    greenStrength = "WEAK";
  }

  let yellowOpportunity:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  if (
    yellowPercentage >=
    settings.highOpportunityYellow
  ) {
    yellowOpportunity = "HIGH";
  } else if (
    yellowPercentage >=
    settings.mediumOpportunityYellow
  ) {
    yellowOpportunity = "MEDIUM";
  } else {
    yellowOpportunity = "LOW";
  }

  let dataConfidence:
    | "HIGH"
    | "MEDIUM"
    | "LOW";

  if (
    verificationPercentage >=
    settings.highVerification
  ) {
    dataConfidence = "HIGH";
  } else if (
    verificationPercentage >=
    settings.mediumVerification
  ) {
    dataConfidence = "MEDIUM";
  } else {
    dataConfidence = "LOW";
  }

  return {
    assembly,

    booth: {
      ...booth,
      voters: {
        total,

        green,
        yellow,
        red,
        black,

        unclassified,

        verified,
        unverified,
      },

      percentages: {
        green:
          greenPercentage,

        yellow:
          yellowPercentage,

        red:
          percentage(
            red,
            total
          ),

        black:
          percentage(
            black,
            total
          ),

        unclassified:
          percentage(
            unclassified,
            total
          ),

        verified:
          verificationPercentage,

        unverified:
          percentage(
            unverified,
            total
          ),
      },

      analysis: {
        greenStrength,

        yellowOpportunity,

        dataConfidence,
      },
    },

    thresholds: {
      strongGreenPercent:
        settings.strongGreenPercent,

      moderateGreenPercent:
        settings.moderateGreenPercent,

      highOpportunityYellow:
        settings.highOpportunityYellow,

      mediumOpportunityYellow:
        settings.mediumOpportunityYellow,

      highVerification:
        settings.highVerification,

      mediumVerification:
        settings.mediumVerification,
    },
  };
}