import { prisma } from "@/lib/prisma";

export async function getAllHouses(userId?: string) {
  return prisma.house.findMany({
    where: userId ? { userId } : undefined,
    include: { houseType: true },
    orderBy: { houseNumber: "asc" },
  });
}

export async function getHouseById(id: string) {
  return prisma.house.findUnique({
    where: { id },
    include: { houseType: true },
  });
}

export async function createHouse(
  houseNumber: string,
  block: string,
  houseTypeId: string,
  userId?: string
) {
  return prisma.house.create({
    data: { houseNumber, block, houseTypeId, userId: userId || null },
    include: { houseType: true },
  });
}

export async function updateHouse(
  id: string,
  updates: {
    houseNumber?: string;
    block?: string;
    houseTypeId?: string;
    userId?: string | null;
  }
) {
  return prisma.house.update({
    where: { id },
    data: updates,
    include: { houseType: true },
  });
}

export async function deleteHouse(id: string) {
  // Delete associated payments first to satisfy foreign key constraint
  await prisma.payment.deleteMany({ where: { houseId: id } });
  await prisma.house.delete({ where: { id } });
  return true;
}
