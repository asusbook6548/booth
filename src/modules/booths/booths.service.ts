import { prisma } from "../../config/prisma";
import { getSingleActiveAssembly } from "../../utils/single-assembly.js";
import {
  CreateBoothInput,
  UpdateBoothInput,
} from "./booths.validation";

export async function createBooth(
  input: CreateBoothInput,
  adminUserId?: string
) {
  const activeAssembly = await getSingleActiveAssembly();

  if (input.assemblyId && input.assemblyId !== activeAssembly.id) {
    throw new Error(
      "Specified assembly is not the active assembly. V3.1.1 supports only one active assembly"
    );
  }

  const effectiveAssemblyId = activeAssembly.id;

  // Check duplicate booth number inside assembly
  const existingBooth = await prisma.booth.findUnique({
    where: {
      assemblyId_boothNumber: {
        assemblyId: effectiveAssemblyId,
        boothNumber: input.boothNumber,
      },
    },
  });

  if (existingBooth) {
    throw new Error(
      "Booth with this number already exists in this assembly"
    );
  }

  const createdBooth = await prisma.booth.create({
    data: {
      boothNumber: input.boothNumber,
      name: input.name,
      village: input.village,
      assemblyId: effectiveAssemblyId,
    },
    include: {
      assembly: true,
      _count: {
        select: {
          voters: true,
        },
      },
    },
  });

  if (adminUserId) {
    await prisma.auditLog.create({
      data: {
        action: "BOOTH_CREATED",
        entity: "BOOTH",
        entityId: createdBooth.id,
        userId: adminUserId,
        details: {
          boothNumber: createdBooth.boothNumber,
          name: createdBooth.name,
          assemblyId: createdBooth.assemblyId,
        },
      },
    });
  }

  return createdBooth;
}

export async function getBooths(assemblyId?: string) {
  const activeAssembly = await getSingleActiveAssembly();
  const effectiveAssemblyId = assemblyId || activeAssembly.id;

  return prisma.booth.findMany({
    where: {
      assemblyId: effectiveAssemblyId,
    },

    orderBy: {
      boothNumber: "asc",
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
}

export async function getBoothById(id: string) {
  const activeAssembly = await getSingleActiveAssembly();

  const booth = await prisma.booth.findUnique({
    where: {
      id,
    },

    include: {
      assembly: true,

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

  if (!booth || booth.assemblyId !== activeAssembly.id) {
    throw new Error("Booth not found in active assembly");
  }

  return booth;
}

export async function updateBooth(
  id: string,
  input: UpdateBoothInput,
  adminUserId?: string
) {
  const activeAssembly = await getSingleActiveAssembly();

  const existingBooth = await prisma.booth.findUnique({
    where: {
      id,
    },
  });

  if (!existingBooth || existingBooth.assemblyId !== activeAssembly.id) {
    throw new Error("Booth not found in active assembly");
  }

  // If booth number is being changed,
  // make sure it doesn't conflict.
  if (input.boothNumber) {
    const duplicate = await prisma.booth.findFirst({
      where: {
        assemblyId: existingBooth.assemblyId,
        boothNumber: input.boothNumber,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      throw new Error(
        "Booth with this number already exists in this assembly"
      );
    }
  }

  const updatedBooth = await prisma.booth.update({
    where: {
      id,
    },

    data: input,

    include: {
      assembly: true,

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

  if (adminUserId) {
    await prisma.auditLog.create({
      data: {
        action: "BOOTH_UPDATED",
        entity: "BOOTH",
        entityId: id,
        userId: adminUserId,
        details: JSON.parse(JSON.stringify(input)),
      },
    });
  }

  return updatedBooth;
}