import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCachedDefaultPasswordConfig } from "@/lib/cache/default-password";

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      staffJobType: true,
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
  staffJobType?: "SECURITY" | "CLEANING" | "GARDENING" | "MAINTENANCE" | "OTHER" // Required for STAFF role
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
        isFirstLogin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffJobType: true,
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
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
  return true;
}
