import { prisma } from "../../config/prisma";
import { CreateAssemblyInput } from "./assembly.validation";

// ========================================
// CREATE ASSEMBLY (one-time setup)
// ========================================
//
// Business rule: ONE deployment = ONE Assembly.
// - If any assembly already exists → throw 409
// - Always sets isActive = true
// - Creates AuditLog
//

export async function createAssembly(
  input: CreateAssemblyInput,
  adminUserId?: string
) {
  const existingCount = await prisma.assembly.count();

  if (existingCount > 0) {
    const err: Error & { status?: number } = new Error(
      "Assembly already configured. V3.1.1 supports only one assembly per deployment"
    );
    err.status = 409;
    throw err;
  }

  const createdAssembly = await prisma.assembly.create({
    data: {
      number: input.number,
      name: input.name,
      district: input.district,
      electionYear: input.electionYear,
      isActive: true,
    },
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

// ========================================
// GET CURRENT ASSEMBLY
// ========================================
//
// Returns the single configured assembly.
// Returns 404 if no assembly exists.
//

export async function getCurrentAssembly() {
  const assembly = await prisma.assembly.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      district: true,
      electionYear: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!assembly) {
    const err: Error & { status?: number } = new Error(
      "No assembly configured. Please set up the assembly first"
    );
    err.status = 404;
    throw err;
  }

  return assembly;
}