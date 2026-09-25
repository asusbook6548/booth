import { prisma } from "../../config/prisma";
import {
  CreateAssemblyInput,
  UpdateAssemblyInput,
} from "./assembly.validation";

export async function createAssembly(
  input: CreateAssemblyInput,
  adminUserId?: string
) {
  const existing = await prisma.assembly.findFirst({
    where: {
      number: input.number,
      electionYear: input.electionYear,
    },
  });

  if (existing) {
    throw new Error(
      "Assembly with this number already exists for this election year"
    );
  }

  // If input.isActive is true (or defaults to true), ensure no other active assembly exists
  if (input.isActive) {
    const activeCount = await prisma.assembly.count({
      where: { isActive: true },
    });
    if (activeCount > 0) {
      throw new Error(
        "Another active assembly already exists. V3.1.1 supports only one active assembly. Deactivate the existing active assembly first"
      );
    }
  }

  const createdAssembly = await prisma.assembly.create({
    data: input,
  });

  if (adminUserId) {
    await prisma.auditLog.create({
      data: {
        action: "ASSEMBLY_CREATED",
        entity: "ASSEMBLY",
        entityId: createdAssembly.id,
        userId: adminUserId,
        details: {
          number: createdAssembly.number,
          name: createdAssembly.name,
          district: createdAssembly.district,
          electionYear: createdAssembly.electionYear,
          isActive: createdAssembly.isActive,
        },
      },
    });
  }

  return createdAssembly;
}

export async function getAssemblies() {
  return prisma.assembly.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          booths: true,
          voters: true,
        },
      },
    },
  });
}

export async function getAssemblyById(id: string) {
  const assembly = await prisma.assembly.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          booths: true,
          voters: true,
        },
      },
    },
  });

  if (!assembly) {
    throw new Error("Assembly not found");
  }

  return assembly;
}

export async function updateAssembly(
  id: string,
  input: UpdateAssemblyInput,
  adminUserId?: string
) {
  const existing = await prisma.assembly.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Assembly not found");
  }

  if (input.isActive === true && !existing.isActive) {
    const activeCount = await prisma.assembly.count({
      where: { isActive: true, NOT: { id } },
    });
    if (activeCount > 0) {
      throw new Error(
        "Another active assembly already exists. V3.1.1 supports only one active assembly. Deactivate the other active assembly first"
      );
    }
  }

  const updatedAssembly = await prisma.assembly.update({
    where: { id },
    data: input,
  });

  if (adminUserId) {
    await prisma.auditLog.create({
      data: {
        action: "ASSEMBLY_UPDATED",
        entity: "ASSEMBLY",
        entityId: id,
        userId: adminUserId,
        details: JSON.parse(JSON.stringify(input)),
      },
    });
  }

  return updatedAssembly;
}