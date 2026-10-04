import { prisma } from "../config/prisma.js";

// ========================================
// GET CURRENT ASSEMBLY
// ========================================
//
// Business Rule: ONE deployment = ONE Assembly.
//
// 0 assemblies → 404 / configuration error
// 1 assembly   → return it
// 2+ assemblies → data integrity error / 500
//

export async function getCurrentAssembly() {
  const assemblies = await prisma.assembly.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      number: true,
      name: true,
      district: true,
      electionYear: true,
      isActive: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (assemblies.length === 0) {
    const err: Error & { status?: number } = new Error(
      "No assembly is configured. Please set up the assembly first"
    );
    err.status = 404;
    throw err;
  }

  if (assemblies.length > 1) {
    const err: Error & { status?: number } = new Error(
      "Data integrity error: multiple assemblies found. V3.1.1 supports only one assembly"
    );
    err.status = 500;
    throw err;
  }

  return assemblies[0]!;
}

// ========================================
// BACKWARD-COMPAT ALIAS
// ========================================

export { getCurrentAssembly as getSingleActiveAssembly };