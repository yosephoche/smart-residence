import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCachedDefaultPasswordConfig } from "@/lib/cache/default-password";

export async function getAllUsers(filters?: { role?: "ADMIN" | "USER" | "STAFF" }) {
  const where: any = {};

  if (filters?.role) {
    where.role = filters.role;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffJobType: true,
      phone: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return users;
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffJobType: true,
      phone: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function createUser(
  name: string,
  email: string,
  role: "ADMIN" | "USER" | "STAFF",
  password?: string, // Optional - fetch from config if not provided
  houseId?: string, // Optional house assignment
  staffJobType?: "SECURITY" | "CLEANING" | "GARDENING" | "MAINTENANCE" | "OTHER", // Required for STAFF role
  phone?: string
) {
  // Validate role and staffJobType combination
  if (role === "STAFF" && !staffJobType) {
    throw new Error("STAFF role requires a job type");
  }
  if (role !== "STAFF" && staffJobType) {
    throw new Error("Only STAFF role can have a job type");
  }

  // Fetch default from config if no password provided
  let finalPassword = password;
  if (!finalPassword) {
    const config = await getCachedDefaultPasswordConfig();
    finalPassword = config.defaultPassword;
  }

  const hashedPassword = await bcrypt.hash(finalPassword, 10);

  // If houseId provided, verify it's vacant
  if (houseId) {
    const house = await prisma.house.findUnique({
      where: { id: houseId },
      select: { userId: true },
    });

    if (!house) {
      throw new Error("House not found");
    }
    if (house.userId) {
      throw new Error("House is already occupied");
    }
  }

  // Use transaction for atomicity
  return await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        staffJobType,
        phone: phone || null,
        isFirstLogin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffJobType: true,
        phone: true,
        isFirstLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If houseId provided, assign house to user
    if (houseId) {
      await tx.house.update({
        where: { id: houseId },
        data: { userId: user.id },
      });
    }

    return user;
  });
}

export async function updateUser(
  id: string,
  updates: Partial<{
    name: string;
    email: string;
    role: "ADMIN" | "USER" | "STAFF";
    staffJobType: "SECURITY" | "CLEANING" | "GARDENING" | "MAINTENANCE" | "OTHER" | null;
    phone: string | null;
  }>
) {
  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffJobType: true,
      phone: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function deleteUser(id: string) {
  // First, fetch user with all relations to check what's blocking deletion
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      houses: { select: { id: true, houseNumber: true, block: true } },
      _count: {
        select: {
          payments: true,
          approvedPayments: true,
          expenses: true,
          incomes: true,
          systemConfigUpdates: true,
          attendances: true,
          shiftReports: true,
          staffSchedules: true,
          createdSchedules: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Build list of blocking relations
  const blockingRelations: string[] = [];

  if (user._count.payments > 0) {
    blockingRelations.push(`${user._count.payments} payment(s)`);
  }
  if (user._count.approvedPayments > 0) {
    blockingRelations.push(`${user._count.approvedPayments} approved payment(s)`);
  }
  if (user._count.expenses > 0) {
    blockingRelations.push(`${user._count.expenses} expense(s)`);
  }
  if (user._count.incomes > 0) {
    blockingRelations.push(`${user._count.incomes} income record(s)`);
  }
  if (user._count.systemConfigUpdates > 0) {
    blockingRelations.push(`${user._count.systemConfigUpdates} system config update(s)`);
  }
  if (user._count.attendances > 0) {
    blockingRelations.push(`${user._count.attendances} attendance record(s)`);
  }
  if (user._count.shiftReports > 0) {
    blockingRelations.push(`${user._count.shiftReports} shift report(s)`);
  }
  if (user._count.staffSchedules > 0) {
    blockingRelations.push(`${user._count.staffSchedules} staff schedule(s)`);
  }
  if (user._count.createdSchedules > 0) {
    blockingRelations.push(`${user._count.createdSchedules} schedule(s) they created`);
  }

  // If any blocking relations exist, throw detailed error
  if (blockingRelations.length > 0) {
    const relationsText = blockingRelations.join(", ");
    throw new Error(
      `Cannot delete user "${user.name}" because they have associated records: ${relationsText}. ` +
      `Please reassign or remove these records before deleting the user.`
    );
  }

  // Use transaction to safely unassign houses and delete user
  await prisma.$transaction(async (tx) => {
    // Unassign any houses (safe - houses can exist without users)
    if (user.houses.length > 0) {
      await tx.house.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
    }

    // Now safe to delete user
    await tx.user.delete({ where: { id } });
  });

  return true;
}
