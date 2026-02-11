import { prisma } from "@/lib/prisma";
import { houseFormSchema } from "@/lib/validations/house.schema";
import type { House } from "@prisma/client";

export async function getAllHouses(userId?: string) {
  return prisma.house.findMany({
    where: userId ? { userId } : undefined,
    include: { houseType: true },
    orderBy: { houseNumber: "asc" },
  });
}

export async function getAvailableHouses() {
  return prisma.house.findMany({
    where: { userId: null }, // Only vacant houses
    include: { houseType: true },
    orderBy: [
      { block: "asc" },
      { houseNumber: "asc" }
    ],
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
  userId?: string,
  isRented?: boolean,
  renterName?: string
) {
  return prisma.house.create({
    data: {
      houseNumber,
      block,
      houseTypeId,
      userId: userId || null,
      isRented: isRented ?? false,
      renterName: renterName || null,
    },
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
    isRented?: boolean;
    renterName?: string | null;
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

export async function bulkImportHouses(
  rows: Array<{
    houseNumber: string;
    block: string;
    houseTypeId: string;
    userId?: string;
    isRented?: boolean;
    renterName?: string;
  }>
): Promise<{
  created: House[];
  errors: Array<{ row: number; houseNumber: string; errors: string[] }>;
}> {
  const created: House[] = [];
  const errors: Array<{ row: number; houseNumber: string; errors: string[] }> =
    [];

  // Pre-validation: Fetch all valid IDs upfront
  const [validHouseTypes, validUsers, existingHouses] = await Promise.all([
    prisma.houseType.findMany({ select: { id: true } }),
    prisma.user.findMany({ select: { id: true } }),
    prisma.house.findMany({ select: { houseNumber: true } }),
  ]);

  const validHouseTypeIds = new Set(validHouseTypes.map((ht) => ht.id));
  const validUserIds = new Set(validUsers.map((u) => u.id));
  const existingHouseNumbers = new Set(
    existingHouses.map((h) => h.houseNumber)
  );

  // Track house numbers within this CSV to detect duplicates
  const csvHouseNumbers = new Map<string, number>(); // houseNumber -> first row index

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1; // 1-indexed for user display (excluding header)
    const row = rows[i];
    const rowErrors: string[] = [];

    // Validate with Zod schema
    const validation = houseFormSchema.safeParse(row);
    if (!validation.success) {
      validation.error.errors.forEach((err) => {
        rowErrors.push(err.message);
      });
    } else {
      // Additional business logic validation
      const { houseNumber, block, houseTypeId, userId } = row;

      // Check if houseTypeId exists
      if (!validHouseTypeIds.has(houseTypeId)) {
        rowErrors.push("Invalid house type ID (not found)");
      }

      // Check if userId exists (if provided)
      if (userId && !validUserIds.has(userId)) {
        rowErrors.push(`User ID '${userId}' does not exist`);
      }

      // Check for duplicate in database
      if (existingHouseNumbers.has(houseNumber)) {
        rowErrors.push("House number already exists in database");
      }

      // Check for duplicate within CSV
      const firstOccurrence = csvHouseNumbers.get(houseNumber);
      if (firstOccurrence !== undefined) {
        rowErrors.push(
          `Duplicate house number in CSV (also appears in row ${firstOccurrence})`
        );
      } else {
        csvHouseNumbers.set(houseNumber, rowNumber);
      }
    }

    // If validation passed, try to create the house
    if (rowErrors.length === 0) {
      try {
        const newHouse = await prisma.house.create({
          data: {
            houseNumber: row.houseNumber,
            block: row.block,
            houseTypeId: row.houseTypeId,
            userId: row.userId || null,
            isRented: row.isRented ?? false,
            renterName: row.renterName || null,
          },
          include: { houseType: true },
        });
        created.push(newHouse);
        // Add to existing house numbers to prevent duplicates in subsequent rows
        existingHouseNumbers.add(row.houseNumber);
      } catch (error) {
        // Database error during creation
        rowErrors.push(
          error instanceof Error ? error.message : "Failed to create house"
        );
      }
    }

    // If there were any errors, record them
    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        houseNumber: row.houseNumber || "(empty)",
        errors: rowErrors,
      });
    }
  }

  return { created, errors };
}
