import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function getAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
  role: "ADMIN" | "USER",
  password: string = "IPL2026"
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      isFirstLogin: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isFirstLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function updateUser(
  id: string,
  updates: Partial<{ name: string; email: string; role: "ADMIN" | "USER" }>
) {
  const user = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
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
