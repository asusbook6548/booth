import { prisma } from "../../config/prisma";
import {
  UpdateVoterInput,
  VoterFilterInput,
} from "./volunteer-voters.validation";

export async function getMyBoothVoters(
  volunteerId: string,
  input: VoterFilterInput
) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    select: {
      id: true,
      booth: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!volunteer) {
    const error = new Error("Volunteer not found");
    (error as { statusCode?: number }).statusCode = 401;
    throw error;
  }

  if (!volunteer.booth) {
    const error = new Error("No booth is assigned to this volunteer");
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const { page, limit, search, classification, verification, voteStatus } =
    input;

  const skip = (page - 1) * limit;

  const where = {
    boothId: volunteer.booth.id,

    ...(classification && {
      classification,
    }),

    ...(verification && {
      verification,
    }),

    ...(voteStatus && {
      voteStatus,
    }),

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          epic: {
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

  const [voters, total] = await Promise.all([
    prisma.voter.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        name: "asc",
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
      totalPages: Math.ceil(total / limit),
    },
  };
}
export async function updateMyBoothVoter(
  volunteerId: string,
  voterId: string,
  input: UpdateVoterInput
) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    select: {
      id: true,
      booth: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!volunteer) {
    const error = new Error("Volunteer not found");
    (error as { statusCode?: number }).statusCode = 401;
    throw error;
  }

  if (!volunteer.booth) {
    const error = new Error("No booth is assigned to this volunteer");
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const anyVoter = await prisma.voter.findUnique({
    where: { id: voterId },
    select: {
      id: true,
      boothId: true,
      classification: true,
      verification: true,
      voteStatus: true,
    },
  });

  if (!anyVoter) {
    const error = new Error("Voter not found");
    (error as { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (anyVoter.boothId !== volunteer.booth.id) {
    const error = new Error(
      "Access denied: Voter does not belong to your assigned booth"
    );
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const updatedVoter = await prisma.voter.update({
    where: {
      id: voterId,
    },
    data: input,
  });

  if (
    input.classification !== undefined &&
    input.classification !== anyVoter.classification
  ) {
    await prisma.classificationHistory.create({
      data: {
        voterId,
        oldValue: anyVoter.classification,
        newValue: input.classification,
        changedById: volunteerId,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "VOLUNTEER_VOTER_UPDATED",
      entity: "VOTER",
      entityId: voterId,
      volunteerId,
      voterId,
      details: {
        previous: {
          classification: anyVoter.classification,
          verification: anyVoter.verification,
          voteStatus: anyVoter.voteStatus,
        },
        updated: input,
      },
    },
  });

  return updatedVoter;
}

export async function getMyBoothVoterById(
  volunteerId: string,
  voterId: string
) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { id: volunteerId },
    select: {
      id: true,
      booth: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!volunteer) {
    const error = new Error("Volunteer not found");
    (error as { statusCode?: number }).statusCode = 401;
    throw error;
  }

  if (!volunteer.booth) {
    const error = new Error("No booth is assigned to this volunteer");
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }

  const voter = await prisma.voter.findUnique({
    where: { id: voterId },
    include: {
      booth: {
        select: {
          id: true,
          boothNumber: true,
          name: true,
          village: true,
        },
      },
      assembly: {
        select: {
          id: true,
          number: true,
          name: true,
          district: true,
        },
      },
    },
  });

  if (!voter) {
    const error = new Error("Voter not found");
    (error as { statusCode?: number }).statusCode = 404;
    throw error;
  }

  if (voter.boothId !== volunteer.booth.id) {
    const error = new Error(
      "Access denied: Voter does not belong to your assigned booth"
    );
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }

  return voter;
}