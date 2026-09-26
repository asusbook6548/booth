import { prisma } from "../../config/prisma.js";
import {
  hashPassword,
} from "../../utils/password.js";

import type {
  CreateUserInput,
  UserListInput,
  UpdateUserInput,
  UpdateStatusInput,
} from "./users.validation.js";

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Create a new user
 */
export async function createUser(
  input: CreateUserInput,
  createdByUserId?: string
) {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existing) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await hashPassword(input.password);

  const newUser = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: input.role || "ADMIN",
      status: input.status || "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (createdByUserId) {
    await prisma.auditLog.create({
      data: {
        action: "USER_CREATED",
        entity: "USER",
        entityId: newUser.id,
        userId: createdByUserId,
        details: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
        },
      },
    });
  }

  return newUser;
}

/**
 * Get paginated users
 */
export async function getUsers(
  input: UserListInput
) {
  const skip =
    (input.page - 1) * input.limit;

  const where: any = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.search) {
    where.OR = [
      {
        name: {
          contains: input.search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: input.search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [total, users] =
    await prisma.$transaction([
      prisma.user.count({
        where,
      }),

      prisma.user.findMany({
        where,

        skip,

        take: input.limit,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(
      total / input.limit
    ),
    data: users,
  };
}

/**
 * Get single user
 */
export async function getUserById(
  userId: string
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Update name/email
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  changedByUserId: string
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!existing) {
    throw new Error("User not found");
  }

  if (input.email) {
    const emailOwner =
      await prisma.user.findFirst({
        where: {
          email: input.email,

          NOT: {
            id: userId,
          },
        },
      });

    if (emailOwner) {
      throw new Error(
        "Email is already in use"
      );
    }
  }

  const updated =
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),

        ...(input.email !== undefined && {
          email: input.email,
        }),
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  await prisma.auditLog.create({
    data: {
      action: "USER_UPDATED",
      entity: "USER",
      entityId: userId,

      userId: changedByUserId,

      details: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        changedFields: Object.keys(input),
      },
    },
  });

  return updated;
}

/**
 * Check whether this is the last active admin
 */
async function isLastActiveAdmin(
  userId: string
) {
  const activeAdminCount =
    await prisma.user.count({
      where: {
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

  const targetUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        role: true,
        status: true,
      },
    });

  if (!targetUser) {
    throw new Error("User not found");
  }

  return (
    targetUser.role === "ADMIN" &&
    targetUser.status === "ACTIVE" &&
    activeAdminCount <= 1
  );
}

/**
 * Activate / deactivate user
 */
export async function updateUserStatus(
  userId: string,
  input: UpdateStatusInput,
  changedByUserId: string
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!existing) {
    throw new Error("User not found");
  }

  /**
   * Never allow the last active admin
   * to be deactivated.
   */
  if (
    input.status === "INACTIVE" &&
    existing.status === "ACTIVE"
  ) {
    const lastActive =
      await isLastActiveAdmin(
        userId
      );

    if (lastActive) {
      throw new Error(
        "Cannot deactivate the last active admin"
      );
    }
  }

  const updated =
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        status: input.status,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  await prisma.auditLog.create({
    data: {
      action:
        input.status === "ACTIVE"
          ? "USER_ACTIVATED"
          : "USER_DEACTIVATED",

      entity: "USER",

      entityId: userId,

      userId: changedByUserId,

      details: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        oldStatus: existing.status,
        newStatus: input.status,
      },
    },
  });

  return updated;
}

/**
 * Change password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string,
  changedByUserId: string
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

  if (!existing) {
    throw new Error("User not found");
  }

  const hashedPassword =
    await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      password: hashedPassword,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_PASSWORD_CHANGED",

      entity: "USER",

      entityId: userId,

      userId: changedByUserId,

      details: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
        changedBy:
          changedByUserId === userId
            ? "SELF"
            : "ADMIN",
      },
    },
  });

  return {
    message:
      "Password updated successfully",
  };
}