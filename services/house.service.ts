import { prisma } from "@/lib/prisma";
import { houseFormSchema } from "@/lib/validations/house.schema";
import type { House } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getCachedDefaultPasswordConfig } from "@/lib/cache/default-password";
import { createHouseType } from "./houseType.service";
import { validateEmail } from "@/lib/utils/import";

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
    houseTypeId?: string;
    userId?: string;
    isRented?: boolean;
    renterName?: string;
    name?: string;
    email?: string;
    type?: string;
    price?: number;
  }>
): Promise<{
  created: House[];
  errors: Array<{ row: number; houseNumber: string; errors: string[] }>;
  usersCreated: number;
  usersLinked: number;
  userErrors: Array<{ row: number; email: string; errors: string[] }>;
  houseTypesCreated: number;
  houseTypesLinked: number;
  houseTypeErrors: Array<{ row: number; typeName: string; errors: string[] }>;
}> {
  const created: House[] = [];
  const errors: Array<{ row: number; houseNumber: string; errors: string[] }> =
    [];

  // Initialize tracking variables
  let usersCreated = 0;
  let usersLinked = 0;
  let houseTypesCreated = 0;
  let houseTypesLinked = 0;
  const userErrors: Array<{ row: number; email: string; errors: string[] }> = [];
  const houseTypeErrors: Array<{ row: number; typeName: string; errors: string[] }> = [];

  // Pre-fetch existing users by email
  const emailsInCsv = rows.map(r => r.email?.toLowerCase()).filter((e): e is string => !!e);
  const existingUsersByEmail = await prisma.user.findMany({
    where: { email: { in: emailsInCsv } },
    select: { id: true, email: true },
  });
  const emailToUserIdMap = new Map(
    existingUsersByEmail.map(u => [u.email.toLowerCase(), u.id])
  );

  // Pre-fetch existing house types by typeName
  const typeNamesInCsv = rows.map(r => r.type?.trim()).filter((t): t is string => !!t);
  const existingHouseTypes = await prisma.houseType.findMany({
    where: { typeName: { in: typeNamesInCsv } },
    select: { id: true, typeName: true },
  });
  const typeNameToHouseTypeIdMap = new Map(
    existingHouseTypes.map(ht => [ht.typeName, ht.id])
  );

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

  // Track house numbers and emails within this CSV to detect duplicates
  const csvHouseNumbers = new Map<string, number>(); // houseNumber -> first row index
  const csvEmails = new Map<string, number>(); // email -> first row index

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
      const { houseNumber, block, userId } = row;

      // Validate email if provided
      if (row.email) {
        if (!validateEmail(row.email)) {
          rowErrors.push(`Invalid email format: ${row.email}`);
        }

        // Check for duplicate email within CSV
        const normalizedEmail = row.email.toLowerCase();
        const firstEmailOccurrence = csvEmails.get(normalizedEmail);
        if (firstEmailOccurrence !== undefined) {
          rowErrors.push(
            `Duplicate email in CSV (also appears in row ${firstEmailOccurrence})`
          );
        } else {
          csvEmails.set(normalizedEmail, rowNumber);
        }
      }

      // Check for duplicate house number in database
      if (existingHouseNumbers.has(houseNumber)) {
        rowErrors.push("House number already exists in database");
      }

      // Check for duplicate house number within CSV
      const firstHouseOccurrence = csvHouseNumbers.get(houseNumber);
      if (firstHouseOccurrence !== undefined) {
        rowErrors.push(
          `Duplicate house number in CSV (also appears in row ${firstHouseOccurrence})`
        );
      } else {
        csvHouseNumbers.set(houseNumber, rowNumber);
      }

      // Check if explicit userId exists (if provided)
      if (userId && !validUserIds.has(userId)) {
        rowErrors.push(`User ID '${userId}' does not exist`);
      }
    }

    // Auto-create house type if needed (before user creation)
    let finalHouseTypeId = row.houseTypeId;

    if (!finalHouseTypeId && row.type && row.price !== undefined && rowErrors.length === 0) {
      const typeName = row.type;

      if (typeNameToHouseTypeIdMap.has(typeName)) {
        // House type exists - reuse
        finalHouseTypeId = typeNameToHouseTypeIdMap.get(typeName)!;
        houseTypesLinked++;
      } else {
        // Create new house type
        try {
          const newHouseType = await createHouseType(typeName, row.price);
          finalHouseTypeId = newHouseType.id;
          typeNameToHouseTypeIdMap.set(typeName, newHouseType.id);
          validHouseTypeIds.add(newHouseType.id); // Add to valid set
          houseTypesCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to create house type";
          houseTypeErrors.push({
            row: rowNumber,
            typeName,
            errors: [errorMessage],
          });
          rowErrors.push(`House type creation failed: ${errorMessage}`);
        }
      }
    }

    // Validate houseTypeId is present (either from CSV or auto-created)
    if (!finalHouseTypeId) {
      rowErrors.push("houseTypeId is required (provide houseTypeId OR type+price)");
    } else if (!validHouseTypeIds.has(finalHouseTypeId)) {
      rowErrors.push("Invalid house type ID (not found)");
    }

    // Auto-create user if needed (before house creation, after house type logic)
    let finalUserId = row.userId;

    if (!finalUserId && row.name && row.email && rowErrors.length === 0) {
      const normalizedEmail = row.email.toLowerCase();

      if (emailToUserIdMap.has(normalizedEmail)) {
        // User exists - reuse
        finalUserId = emailToUserIdMap.get(normalizedEmail)!;
        usersLinked++;
      } else {
        // Create new user
        try {
          const defaultPassword = await getCachedDefaultPasswordConfig().then(c => c.defaultPassword);
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          const newUser = await prisma.user.create({
            data: {
              name: row.name,
              email: normalizedEmail,
              password: hashedPassword,
              role: "USER",
              isFirstLogin: true,
            },
            select: { id: true, email: true },
          });

          finalUserId = newUser.id;
          emailToUserIdMap.set(normalizedEmail, newUser.id);
          validUserIds.add(newUser.id); // Add to valid set
          usersCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Failed to create user";
          userErrors.push({
            row: rowNumber,
            email: row.email,
            errors: [errorMessage],
          });
          // Do NOT add to rowErrors - house can still be created without user
        }
      }
    }

    // If validation passed, try to create the house
    if (rowErrors.length === 0) {
      try {
        const newHouse = await prisma.house.create({
          data: {
            houseNumber: row.houseNumber,
            block: row.block,
            houseTypeId: finalHouseTypeId!, // Non-null assertion: validated above (line 239-243)
            userId: finalUserId || null,    // Use finalUserId
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

  return {
    created,
    errors,
    usersCreated,
    usersLinked,
    userErrors,
    houseTypesCreated,
    houseTypesLinked,
    houseTypeErrors,
  };
}
