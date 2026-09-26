import { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma.js";

import {
  getSingleActiveAssembly,
} from "../../utils/single-assembly.js";

import {
  BulkClassificationInput,
  ClassificationFilterInput,
  UpdateClassificationInput,
} from "./classification.validation.js";

// ========================================
// SUMMARY
// ========================================

export async function getClassificationSummary() {
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
    count: number
  ) =>
    total === 0
      ? 0
      : Number(
          ((count / total) * 100).toFixed(2)
        );

  return {
    assembly,

    total,

    green,

    yellow,

    red,

    black,

    unclassified,

    percentages: {
      green: percentage(green),
      yellow: percentage(yellow),
      red: percentage(red),
      black: percentage(black),
      unclassified:
        percentage(unclassified),
    },
  };
}

// ========================================
// VOTER LIST
// ========================================

export async function getClassificationVoters(
  input: ClassificationFilterInput
) {
  const assembly =
    await getSingleActiveAssembly();

  const {
    page,
    limit,
    search,
    classification,
    verification,
    voteStatus,
    boothId,
  } = input;

  const skip =
    (page - 1) * limit;

  const where: Prisma.VoterWhereInput = {
    assemblyId: assembly.id,

    ...(classification && {
      classification,
    }),

    ...(verification && {
      verification,
    }),

    ...(voteStatus && {
      voteStatus,
    }),

    ...(boothId && {
      boothId,
    }),

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          epic: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          mobile: {
            contains: search,
          },
        },

        {
          houseNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),
  };

  const [
    voters,
    total,
  ] = await Promise.all([
    prisma.voter.findMany({
      where,

      skip,

      take: limit,

      orderBy: [
        {
          booth: {
            boothNumber: "asc",
          },
        },
        {
          name: "asc",
        },
      ],

      select: {
        id: true,

        epic: true,

        name: true,

        nameHindi: true,

        fatherName: true,

        fatherNameHindi: true,

        motherName: true,

        husbandName: true,

        houseNumber: true,

        village: true,

        gender: true,

        age: true,

        dateOfBirth: true,

        mobile: true,

        assemblyNumber: true,

        partNumber: true,

        partSerial: true,

        pollingStationName: true,

        classification: true,

        verification: true,

        voteStatus: true,

        booth: {
          select: {
            id: true,
            boothNumber: true,
            name: true,
            village: true,
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.voter.count({
      where,
    }),
  ]);

  return {
    voters,

    pagination: {
      page,
      limit,
      total,

      totalPages:
        Math.ceil(
          total / limit
        ),
    },
  };
}

// ========================================
// UPDATE SINGLE VOTER CLASSIFICATION
// ========================================

export async function updateClassification(
  voterId: string,
  input: UpdateClassificationInput,
  adminUserId: string
) {
  const assembly =
    await getSingleActiveAssembly();

  const voter =
    await prisma.voter.findFirst({
      where: {
        id: voterId,

        assemblyId:
          assembly.id,
      },
    });

  if (!voter) {
    throw new Error(
      "Voter not found in the active assembly"
    );
  }

  const classificationChanged =
    input.classification !== undefined &&
    input.classification !==
      voter.classification;

  const updatedVoter =
    await prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.voter.update({
            where: {
              id: voter.id,
            },

            data: {
              ...(input.classification !==
                undefined && {
                classification:
                  input.classification,
              }),

              ...(input.verification !==
                undefined && {
                verification:
                  input.verification,
              }),

              ...(input.voteStatus !==
                undefined && {
                voteStatus:
                  input.voteStatus,
              }),
            },

            select: {
              id: true,
              epic: true,
              name: true,
              classification: true,
              verification: true,
              voteStatus: true,
              booth: {
                select: {
                  id: true,
                  boothNumber: true,
                  name: true,
                },
              },
            },
          });

        // Classification history
        if (classificationChanged) {
          await tx.classificationHistory.create(
            {
              data: {
                voterId: voter.id,

                oldValue:
                  voter.classification,

                newValue:
                  input.classification!,

                // Admin changed it
                changedByUserId:
                  adminUserId,
              },
            }
          );
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            action:
              "CLASSIFICATION_UPDATED",

            entity: "VOTER",

            entityId: voter.id,

            voterId: voter.id,

            userId: adminUserId,

            details: {
              oldClassification:
                voter.classification,

              newClassification:
                input.classification ??
                voter.classification,

              verification:
                input.verification,

              voteStatus:
                input.voteStatus,
            } as Prisma.InputJsonValue,
          },
        });

        return updated;
      }
    );

  return updatedVoter;
}

// ========================================
// BULK CLASSIFICATION
// ========================================

export async function bulkUpdateClassification(
  input: BulkClassificationInput,
  adminUserId: string
) {
  const assembly =
    await getSingleActiveAssembly();

  const uniqueVoterIds =
    [...new Set(input.voterIds)];

  const voters =
    await prisma.voter.findMany({
      where: {
        id: {
          in: uniqueVoterIds,
        },

        assemblyId:
          assembly.id,
      },

      select: {
        id: true,
        classification: true,
      },
    });

  if (
    voters.length !==
    uniqueVoterIds.length
  ) {
    throw new Error(
      "One or more voters were not found in the active assembly"
    );
  }

  const changedVoters =
    voters.filter(
      (voter) =>
        voter.classification !==
        input.classification
    );

  if (changedVoters.length === 0) {
    return {
      requested: uniqueVoterIds.length,
      changed: 0,
      classification:
        input.classification,
    };
  }

  await prisma.$transaction(
    async (tx) => {
      for (const voter of changedVoters) {
        await tx.voter.update({
          where: {
            id: voter.id,
          },

          data: {
            classification:
              input.classification,
          },
        });

        await tx.classificationHistory.create(
          {
            data: {
              voterId: voter.id,

              oldValue:
                voter.classification,

              newValue:
                input.classification,

              changedByUserId:
                adminUserId,
            },
          }
        );
      }

      await tx.auditLog.create({
        data: {
          action:
            "CLASSIFICATION_BULK_UPDATED",

          entity: "VOTER",

          userId: adminUserId,

          details: {
            requested:
              uniqueVoterIds.length,

            changed:
              changedVoters.length,

            classification:
              input.classification,

            voterIds:
              changedVoters.map(
                (voter) =>
                  voter.id
              ),
          } as Prisma.InputJsonValue,
        },
      });
    }
  );

  return {
    requested:
      uniqueVoterIds.length,

    changed:
      changedVoters.length,

    classification:
      input.classification,
  };
}