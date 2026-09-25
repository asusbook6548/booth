import { prisma } from "../../config/prisma";
import { hashPassword } from "../../utils/password";
import { getSingleActiveAssembly } from "../../utils/single-assembly.js";

import {
  CreateVolunteerInput,
  UpdateVolunteerInput,
} from "./volunteer.validation";

/**
 * Common booth response select
 */
const boothSelect = {
  id: true,
  boothNumber: true,
  name: true,
  village: true,
  assemblyId: true,
};

/**
 * Strip password from a volunteer object before returning to client
 */
function stripPassword<
  T extends { password?: string }
>(volunteer: T): Omit<T, "password"> {
  const { password: _password, ...safe } = volunteer;
  return safe;
}

/**
 * Create volunteer
 */
export async function createVolunteer(
  input: CreateVolunteerInput,
  adminUserId: string
) {
  /**
   * Check duplicate mobile
   */
  const existing = await prisma.volunteer.findUnique({
    where: {
      mobile: input.mobile,
    },
  });

  if (existing) {
    throw new Error(
      "Volunteer with this mobile already exists"
    );
  }

  /**
   * Hash password before storing
   */
  const hashedPassword = await hashPassword(
    input.password
  );

  const volunteer =
    await prisma.volunteer.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        password: hashedPassword,
      },

      include: {
        booth: {
          select: boothSelect,
        },
      },
    });

  /**
   * Audit log
   */
  await prisma.auditLog.create({
    data: {
      action: "VOLUNTEER_CREATED",

      entity: "VOLUNTEER",

      entityId: volunteer.id,

      userId: adminUserId,

      volunteerId: volunteer.id,

      details: {
        name: volunteer.name,
        mobile: volunteer.mobile,
      },
    },
  });

  return stripPassword(volunteer);
}

/**
 * Get all volunteers — password never returned
 */
export async function getVolunteers() {
  const volunteers = await prisma.volunteer.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      booth: {
        select: boothSelect,
      },
    },
  });

  return volunteers.map(stripPassword);
}

/**
 * Get volunteer by ID — password never returned
 */
export async function getVolunteerById(
  id: string
) {
  const volunteer =
    await prisma.volunteer.findUnique({
      where: {
        id,
      },

      include: {
        booth: {
          select: boothSelect,
        },
      },
    });

  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  return stripPassword(volunteer);
}

/**
 * Update volunteer
 * If password is provided, it is hashed before storing.
 * Password is never returned.
 */
export async function updateVolunteer(
  id: string,
  input: UpdateVolunteerInput,
  adminUserId: string
) {
  /**
   * Check volunteer exists
   */
  const existing =
    await prisma.volunteer.findUnique({
      where: {
        id,
      },
    });

  if (!existing) {
    throw new Error("Volunteer not found");
  }

  /**
   * Check duplicate mobile
   */
  if (input.mobile) {
    const mobileExists =
      await prisma.volunteer.findFirst({
        where: {
          mobile: input.mobile,

          NOT: {
            id,
          },
        },
      });

    if (mobileExists) {
      throw new Error(
        "Volunteer with this mobile already exists"
      );
    }
  }

  /**
   * Build update data — hash password if provided
   */
  const updateData: {
    name?: string;
    mobile?: string;
    password?: string;
    status?: "ACTIVE" | "INACTIVE";
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.mobile !== undefined) {
    updateData.mobile = input.mobile;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (input.password !== undefined) {
    updateData.password = await hashPassword(
      input.password
    );
  }

  const updatedVolunteer =
    await prisma.volunteer.update({
      where: {
        id,
      },

      data: updateData,

      include: {
        booth: {
          select: boothSelect,
        },
      },
    });

  /**
   * Audit log — password change noted but hash never logged
   */
  await prisma.auditLog.create({
    data: {
      action: "VOLUNTEER_UPDATED",

      entity: "VOLUNTEER",

      entityId: id,

      userId: adminUserId,

      volunteerId: id,

      details: {
        name: input.name,
        mobile: input.mobile,
        status: input.status,
        passwordChanged: input.password !== undefined,
      },
    },
  });

  return stripPassword(updatedVolunteer);
}

/**
 * Assign booth to volunteer
 *
 * Rules:
 *
 * 1 volunteer = maximum 1 booth
 *
 * 1 booth = maximum 1 volunteer
 */
export async function assignBooth(
  volunteerId: string,
  boothId: string,
  adminUserId: string
) {
  /**
   * Check volunteer
   */
  const volunteer =
    await prisma.volunteer.findUnique({
      where: {
        id: volunteerId,
      },

      include: {
        booth: true,
      },
    });

  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  /**
   * Check booth
   */
  const booth =
    await prisma.booth.findUnique({
      where: {
        id: boothId,
      },

      include: {
        volunteer: true,
        assembly: true,
      },
    });

  if (!booth) {
    throw new Error("Booth not found");
  }

  const activeAssembly = await getSingleActiveAssembly();
  if (booth.assemblyId !== activeAssembly.id) {
    throw new Error("Booth does not belong to the active assembly");
  }

  /**
   * Booth already assigned to another volunteer
   */
  if (
    booth.volunteerId &&
    booth.volunteerId !== volunteerId
  ) {
    throw new Error(
      "This booth is already assigned to another volunteer"
    );
  }

  /**
   * Volunteer already has another booth
   */
  if (
    volunteer.booth &&
    volunteer.booth.id !== boothId
  ) {
    throw new Error(
      `This volunteer is already assigned to booth ${volunteer.booth.boothNumber}`
    );
  }

  /**
   * Already assigned — idempotent
   */
  if (volunteer.booth?.id === boothId) {
    return booth;
  }

  /**
   * Assign booth
   */
  const updatedBooth =
    await prisma.booth.update({
      where: {
        id: boothId,
      },

      data: {
        volunteerId,
      },

      include: {
        volunteer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            status: true,
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

  /**
   * Audit log
   */
  await prisma.auditLog.create({
    data: {
      action: "VOLUNTEER_BOOTH_ASSIGNED",

      entity: "BOOTH",

      entityId: boothId,

      userId: adminUserId,

      volunteerId,

      details: {
        boothId,
        boothNumber: booth.boothNumber,
        volunteerId,
        volunteerName: volunteer.name,
      },
    },
  });

  return updatedBooth;
}

/**
 * Remove volunteer from booth
 */
export async function unassignBooth(
  volunteerId: string,
  adminUserId: string
) {
  const volunteer =
    await prisma.volunteer.findUnique({
      where: {
        id: volunteerId,
      },

      include: {
        booth: true,
      },
    });

  if (!volunteer) {
    throw new Error("Volunteer not found");
  }

  if (!volunteer.booth) {
    throw new Error(
      "Volunteer has no assigned booth"
    );
  }

  const boothId = volunteer.booth.id;

  const updatedBooth =
    await prisma.booth.update({
      where: {
        id: boothId,
      },

      data: {
        volunteerId: null,
      },

      include: {
        volunteer: true,
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

  /**
   * Audit log
   */
  await prisma.auditLog.create({
    data: {
      action: "VOLUNTEER_BOOTH_UNASSIGNED",

      entity: "BOOTH",

      entityId: boothId,

      userId: adminUserId,

      volunteerId,

      details: {
        boothId,
        boothNumber: volunteer.booth.boothNumber,
      },
    },
  });

  return updatedBooth;
}