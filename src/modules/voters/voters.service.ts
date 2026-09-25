import { prisma } from "../../config/prisma";
import { getSingleActiveAssembly } from "../../utils/single-assembly.js";

import {
  UpdateVoterInput,
  VoterListQueryInput,
} from "./voters.validation";

/**
 * Get voters
 *
 * Admin only.
 *
 * Supports:
 * - pagination
 * - search
 * - assembly filter
 * - booth filter
 * - classification
 * - verification
 * - vote status
 * - gender
 */
export async function getVoters(
  input: VoterListQueryInput
) {
  const {
    page,
    limit,
    search,
    assemblyId,
    boothId,
    classification,
    verification,
    voteStatus,
    gender,
  } = input;

  const activeAssembly = await getSingleActiveAssembly();
  const effectiveAssemblyId = assemblyId || activeAssembly.id;
  const skip = (page - 1) * limit;

  const where = {
    assemblyId: effectiveAssemblyId,

    ...(boothId && {
      boothId,
    }),

    ...(classification && {
      classification,
    }),

    ...(verification && {
      verification,
    }),

    ...(voteStatus && {
      voteStatus,
    }),

    ...(gender && {
      gender: {
        equals: gender,
        mode: "insensitive" as const,
      },
    }),

    ...(search && {
      OR: [
        {
          epic: {
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
          mobile: {
            contains: search,
          },
        },

        {
          houseNumber: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [voters, total] =
    await Promise.all([
      prisma.voter.findMany({
        where,
        skip,
        take: limit,

        orderBy: {
          name: "asc",
        },

        include: {
          assembly: {
            select: {
              id: true,
              number: true,
              name: true,
              district: true,
            },
          },

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
        Math.ceil(total / limit),
    },
  };
}

/**
 * Get one voter
 */
export async function getVoterById(
  id: string
) {
  const activeAssembly = await getSingleActiveAssembly();

  const voter =
    await prisma.voter.findUnique({
      where: {
        id,
      },

      include: {
        assembly: {
          select: {
            id: true,
            number: true,
            name: true,
            district: true,
            electionYear: true,
          },
        },

        booth: {
          select: {
            id: true,
            boothNumber: true,
            name: true,
            village: true,
          },
        },

        classificationHistory: {
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

  if (!voter || voter.assemblyId !== activeAssembly.id) {
    throw new Error(
      "Voter not found in active assembly"
    );
  }

  return voter;
}

/**
 * Update voter
 *
 * Admin manual update.
 */
export async function updateVoter(
  id: string,
  input: UpdateVoterInput,
  adminUserId: string
) {
  const activeAssembly = await getSingleActiveAssembly();

  const existing =
    await prisma.voter.findUnique({
      where: {
        id,
      },
    });

  if (!existing || existing.assemblyId !== activeAssembly.id) {
    throw new Error(
      "Voter not found in active assembly"
    );
  }

  const updatedVoter =
    await prisma.voter.update({
      where: {
        id,
      },

      data: input,
    });

  /**
   * Classification history
   */
  if (
    input.classification !==
      undefined &&
    input.classification !==
      existing.classification
  ) {
    if (
      input.classification !==
      null
    ) {
      await prisma.classificationHistory.create(
        {
          data: {
            voterId: id,

            oldValue:
              existing.classification,

            newValue:
              input.classification,

            changedByUserId: adminUserId,
          },
        }
      );
    }
  }

  /**
   * Audit log
   */
  await prisma.auditLog.create({
    data: {
      action: "VOTER_UPDATED",

      entity: "VOTER",

      entityId: id,

      voterId: id,

      userId: adminUserId,

      details: JSON.parse(
        JSON.stringify(input)
      ),
    },
  });

  return updatedVoter;
}