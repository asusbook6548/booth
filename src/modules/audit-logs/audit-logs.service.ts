import { prisma } from "../../config/prisma.js";
import type { Prisma } from "@prisma/client";
import type { AuditLogFilterInput } from "./audit-logs.validation.js";

/**
 * Get paginated and filtered audit logs
 */
export async function getAuditLogs(filters: AuditLogFilterInput) {
  const {
    page,
    limit,
    search,
    action,
    entity,
    userId,
    volunteerId,
    voterId,
    dateFrom,
    dateTo,
  } = filters;

  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (action && action.trim().length > 0) {
    where.action = {
      equals: action.trim(),
      mode: "insensitive",
    };
  }

  if (entity && entity.trim().length > 0) {
    where.entity = {
      equals: entity.trim(),
      mode: "insensitive",
    };
  }

  if (userId) {
    where.userId = userId;
  }

  if (volunteerId) {
    where.volunteerId = volunteerId;
  }

  if (voterId) {
    where.voterId = voterId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  if (search && search.trim().length > 0) {
    const term = search.trim();
    where.OR = [
      {
        action: {
          contains: term,
          mode: "insensitive",
        },
      },
      {
        entity: {
          contains: term,
          mode: "insensitive",
        },
      },
      {
        user: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        user: {
          email: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        volunteer: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        volunteer: {
          mobile: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        voter: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        voter: {
          epic: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  const [total, auditLogs] = await prisma.$transaction([
    prisma.auditLog.count({
      where,
    }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        details: true,
        userId: true,
        volunteerId: true,
        voterId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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
        voter: {
          select: {
            id: true,
            epic: true,
            name: true,
          },
        },
      },
    }),
  ]);

  // Collect entity IDs by entity type to resolve target records
  const targetUserIds = new Set<string>();
  const targetVolunteerIds = new Set<string>();
  const targetVoterIds = new Set<string>();
  const targetBoothIds = new Set<string>();
  const targetAssemblyIds = new Set<string>();

  for (const log of auditLogs) {
    if (!log.entityId) continue;
    if (log.entity === "USER") {
      targetUserIds.add(log.entityId);
    } else if (log.entity === "VOLUNTEER" && !log.volunteer) {
      targetVolunteerIds.add(log.entityId);
    } else if (log.entity === "VOTER" && !log.voter) {
      targetVoterIds.add(log.entityId);
    } else if (log.entity === "BOOTH") {
      targetBoothIds.add(log.entityId);
    } else if (log.entity === "ASSEMBLY") {
      targetAssemblyIds.add(log.entityId);
    }
  }

  const [targetUsers, targetVolunteers, targetVoters, targetBooths, targetAssemblies] = await Promise.all([
    targetUserIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: Array.from(targetUserIds) } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [],
    targetVolunteerIds.size > 0
      ? prisma.volunteer.findMany({
          where: { id: { in: Array.from(targetVolunteerIds) } },
          select: { id: true, name: true, mobile: true, status: true },
        })
      : [],
    targetVoterIds.size > 0
      ? prisma.voter.findMany({
          where: { id: { in: Array.from(targetVoterIds) } },
          select: { id: true, epic: true, name: true },
        })
      : [],
    targetBoothIds.size > 0
      ? prisma.booth.findMany({
          where: { id: { in: Array.from(targetBoothIds) } },
          select: { id: true, boothNumber: true, name: true },
        })
      : [],
    targetAssemblyIds.size > 0
      ? prisma.assembly.findMany({
          where: { id: { in: Array.from(targetAssemblyIds) } },
          select: { id: true, name: true, code: true },
        })
      : [],
  ]);

  const targetUserMap = new Map(targetUsers.map((u) => [u.id, u]));
  const targetVolunteerMap = new Map(targetVolunteers.map((v) => [v.id, v]));
  const targetVoterMap = new Map(targetVoters.map((v) => [v.id, v]));
  const targetBoothMap = new Map(targetBooths.map((b) => [b.id, b]));
  const targetAssemblyMap = new Map(targetAssemblies.map((a) => [a.id, a]));

  const enrichedLogs = auditLogs.map((log) => {
    const rawDetails = (log.details as Record<string, unknown> | null) || {};
    let enrichedDetails = { ...rawDetails };
    let targetUser = null;
    let volunteer = log.volunteer;
    let voter = log.voter;
    let targetBooth = null;
    let targetAssembly = null;

    if (log.entity === "USER" && log.entityId && targetUserMap.has(log.entityId)) {
      targetUser = targetUserMap.get(log.entityId)!;
      enrichedDetails = {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        ...enrichedDetails,
      };
    }

    if (log.entity === "VOLUNTEER" && log.entityId && !volunteer && targetVolunteerMap.has(log.entityId)) {
      volunteer = targetVolunteerMap.get(log.entityId)!;
    }

    if (log.entity === "VOTER" && log.entityId && !voter && targetVoterMap.has(log.entityId)) {
      voter = targetVoterMap.get(log.entityId)!;
    }

    if (log.entity === "BOOTH" && log.entityId && targetBoothMap.has(log.entityId)) {
      targetBooth = targetBoothMap.get(log.entityId)!;
      if (!enrichedDetails.boothNumber) {
        enrichedDetails.boothNumber = targetBooth.boothNumber;
      }
      if (!enrichedDetails.name && targetBooth.name) {
        enrichedDetails.name = targetBooth.name;
      }
    }

    if (log.entity === "ASSEMBLY" && log.entityId && targetAssemblyMap.has(log.entityId)) {
      targetAssembly = targetAssemblyMap.get(log.entityId)!;
      if (!enrichedDetails.name) {
        enrichedDetails.name = targetAssembly.name;
      }
    }

    return {
      ...log,
      details: enrichedDetails,
      volunteer,
      voter,
      targetUser,
      targetBooth,
      targetAssembly,
    };
  });

  return {
    data: enrichedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
