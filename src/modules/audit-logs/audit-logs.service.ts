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

  return {
    data: auditLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
