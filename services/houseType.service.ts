import { prisma } from "@/lib/prisma";

export async function getAllHouseTypes() {
  return prisma.houseType.findMany({
    orderBy: { typeName: "asc" },
  });
}

export async function getHouseTypeById(id: string) {
  return prisma.houseType.findUnique({ where: { id } });
}

export async function createHouseType(
  typeName: string,
  price: number,
  description?: string
) {
  return prisma.houseType.create({
    data: { typeName, price, description },
  });
}

export async function updateHouseType(
  id: string,
  updates: Partial<{ typeName: string; price: number; description: string }>
) {
  return prisma.houseType.update({ where: { id }, data: updates });
}

export async function deleteHouseType(id: string) {
  // Check FK constraint — houses referencing this type
  const count = await prisma.house.count({
    where: { houseTypeId: id },
  });
  if (count > 0) {
    return { error: `Cannot delete: ${count} house(s) are using this type.` };
  }

  await prisma.houseType.delete({ where: { id } });
  return { success: true };
}
