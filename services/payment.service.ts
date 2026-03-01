import { prisma } from "@/lib/prisma";
import { computeNextStartMonth, computeCoveredMonths, formatPaymentMonth } from "@/lib/calculations";
import { getCachedExcludedIncomePeriods } from "@/lib/cache/excluded-income-periods";

const paymentMonthsInclude = {
  orderBy: [{ year: "asc" as const }, { month: "asc" as const }],
};

export async function getPayments({
  status,
  userId,
  date,
}: {
  status?: string;
  userId?: string;
  date?: string;
} = {}) {
  let dateFilter: Record<string, unknown> = {};
  if (date) {
    const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;
    const [y, m, d] = date.split("-").map(Number);
    const witaDayStartMs = Date.UTC(y, m - 1, d, 0, 0, 0);
    const startUtc = new Date(witaDayStartMs - WITA_OFFSET_MS);
    const endUtc   = new Date(witaDayStartMs - WITA_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);
    dateFilter = { createdAt: { gte: startUtc, lte: endUtc } };
  }
  return prisma.payment.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
      ...(userId ? { userId } : {}),
      ...dateFilter,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      house: { include: { houseType: true } },
      paymentMonths: paymentMonthsInclude,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      house: { include: { houseType: true } },
      paymentMonths: paymentMonthsInclude,
    },
  });
}

export async function createPayment(
  userId: string,
  houseId: string,
  amountMonths: number,
  proofImagePath: string
) {
  return prisma.$transaction(async (tx) => {
    // Server-side price calculation — never trusts client
    const house = await tx.house.findUnique({
      where: { id: houseId },
      include: { houseType: true },
    });

    if (!house?.houseType) {
      throw new Error("House or house type not found");
    }

    const totalAmount = Number(house.houseType.price) * amountMonths;

    const occupiedMonths = await tx.paymentMonth.findMany({
      where: {
        payment: {
          houseId,
          status: { in: ["PENDING", "APPROVED"] },
        },
      },
      select: { year: true, month: true },
    });
    const startMonth = computeNextStartMonth(occupiedMonths);
    const coveredMonths = computeCoveredMonths(startMonth, amountMonths);

    // Check for conflicts: any target month already has a PENDING or APPROVED payment for this house
    const conflicts = await tx.paymentMonth.findMany({
      where: {
        payment: {
          houseId,
          status: { in: ["PENDING", "APPROVED"] },
        },
        OR: coveredMonths.map(({ year, month }) => ({ year, month })),
      },
      select: { year: true, month: true },
    });

    if (conflicts.length > 0) {
      // Deduplicate in case multiple payments cover the same month
      const seen = new Set<string>();
      const unique = conflicts.filter(({ year, month }) => {
        const key = `${year}-${month}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const monthLabels = unique.map((m) => formatPaymentMonth(m)).join(", ");
      throw new Error(
        `Bulan berikut sudah memiliki pembayaran yang sedang diproses atau telah disetujui: ${monthLabels}`
      );
    }

    const payment = await tx.payment.create({
      data: {
        userId,
        houseId,
        amountMonths,
        totalAmount,
        proofImagePath,
        status: "PENDING",
      },
    });

    await tx.paymentMonth.createMany({
      data: coveredMonths.map(({ year, month }) => ({
        paymentId: payment.id,
        year,
        month,
      })),
    });

    return tx.payment.findUnique({
      where: { id: payment.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        house: { include: { houseType: true } },
        paymentMonths: paymentMonthsInclude,
      },
    });
  });
}

export async function getOccupiedMonthsForHouse(houseId: string) {
  const rows = await prisma.paymentMonth.findMany({
    where: {
      payment: {
        houseId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    },
    select: { year: true, month: true },
  });
  return rows;
}

export async function approvePayment(paymentId: string, approvedBy: string) {
  const admin = await prisma.user.findUnique({ where: { id: approvedBy } });
  if (!admin) {
    throw new Error("Approver not found. Please log in again.");
  }

  // Fetch excluded periods outside transaction (cache layer)
  const excludedPeriods = await getCachedExcludedIncomePeriods();

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // 1. Approve the payment
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        approvedBy,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { name: true } },
        house: { select: { houseNumber: true, block: true } },
        paymentMonths: { select: { year: true, month: true } },
      },
    });

    // 2. Check if income already exists (idempotency)
    const existingIncome = await tx.income.findUnique({
      where: { paymentId: payment.id },
    });

    if (!existingIncome) {
      // 3. Filter out excluded months
      const nonExcludedMonths = payment.paymentMonths.filter(
        (pm) => !excludedPeriods.some((ep) => ep.year === pm.year && ep.month === pm.month)
      );

      if (nonExcludedMonths.length > 0) {
        // Prorate income for non-excluded months only
        const pricePerMonth = Number(payment.totalAmount) / payment.amountMonths;
        const incomeAmount = pricePerMonth * nonExcludedMonths.length;
        const description = `IPL Payment - ${payment.user.name} - ${payment.house.block} ${payment.house.houseNumber} - ${payment.amountMonths} bulan`;

        await tx.income.create({
          data: {
            date: payment.approvedAt!,
            category: "MONTHLY_FEES",
            amount: incomeAmount,
            description,
            notes: `Auto-generated from payment #${payment.id}`,
            createdBy: approvedBy,
            paymentId: payment.id,
          },
        });
      }
      // If all months excluded, skip income creation entirely
    }

    return payment;
  });
}

export async function bulkApprovePayments(
  paymentIds: string[],
  approvedBy: string
) {
  // Validate approver exists
  const admin = await prisma.user.findUnique({ where: { id: approvedBy } });
  if (!admin) {
    throw new Error("Approver not found. Please log in again.");
  }

  // Fetch excluded periods outside transaction (cache layer)
  const excludedPeriods = await getCachedExcludedIncomePeriods();

  const succeeded: any[] = [];
  const failed: { id: string; reason: string }[] = [];

  // Use transaction for atomicity with extended timeout for bulk operations
  await prisma.$transaction(
    async (tx) => {
      // 1. Fetch all payments at once
      const payments = await tx.payment.findMany({
        where: { id: { in: paymentIds } },
        include: {
          user: { select: { name: true, email: true } },
          house: { select: { houseNumber: true, block: true } },
          paymentMonths: { select: { year: true, month: true } },
        },
      });

      // 2. Validate in-memory: split into valid (PENDING) vs failed
      const foundIds = new Set(payments.map(p => p.id));
      for (const id of paymentIds) {
        if (!foundIds.has(id)) {
          failed.push({ id, reason: "Payment not found" });
        }
      }
      const validPayments = payments.filter(p => p.status === "PENDING");
      const invalidPayments = payments.filter(p => p.status !== "PENDING");
      for (const p of invalidPayments) {
        failed.push({ id: p.id, reason: `Payment already ${p.status.toLowerCase()}` });
      }

      if (validPayments.length === 0) return;

      const validIds = validPayments.map(p => p.id);
      const approvedAt = new Date();

      // 3. Check existing incomes in batch
      const existingIncomes = await tx.income.findMany({
        where: { paymentId: { in: validIds } },
        select: { paymentId: true },
      });
      const existingIncomePaymentIds = new Set(existingIncomes.map(i => i.paymentId));

      // 4. Batch update all valid payments
      await tx.payment.updateMany({
        where: { id: { in: validIds } },
        data: { status: "APPROVED", approvedBy, approvedAt },
      });

      // 5. Batch create income records (prorated for excluded periods)
      const incomeRecords = validPayments
        .filter(p => !existingIncomePaymentIds.has(p.id))
        .map(p => {
          const nonExcludedMonths = p.paymentMonths.filter(
            (pm) => !excludedPeriods.some((ep) => ep.year === pm.year && ep.month === pm.month)
          );
          if (nonExcludedMonths.length === 0) return null; // All months excluded — skip

          const pricePerMonth = Number(p.totalAmount) / p.amountMonths;
          const incomeAmount = pricePerMonth * nonExcludedMonths.length;

          return {
            date: approvedAt,
            category: "MONTHLY_FEES" as const,
            amount: incomeAmount,
            description: `IPL Payment - ${p.user.name} - ${p.house.block} ${p.house.houseNumber} - ${p.amountMonths} bulan`,
            notes: `Auto-generated from payment #${p.id}`,
            createdBy: approvedBy,
            paymentId: p.id,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (incomeRecords.length > 0) {
        await tx.income.createMany({ data: incomeRecords });
      }

      // Build succeeded list using in-memory payment data
      for (const p of validPayments) {
        succeeded.push({ ...p, status: "APPROVED", approvedBy, approvedAt });
      }
    },
    {
      timeout: 30000, // 30 seconds - allows bulk processing of 100+ payments
      maxWait: 5000,  // Wait up to 5 seconds to acquire a transaction slot
    }
  );

  return { succeeded, failed };
}

export async function rejectPayment(paymentId: string, rejectionNote: string) {
  // Fetch payment first to check status
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.status === "APPROVED") {
    throw new Error("Cannot reject approved payment. Payment is already approved and income has been recorded.");
  }

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "REJECTED",
      rejectionNote,
    },
  });
}

export async function getUnpaidHousesThisMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // Collect house IDs that already have a PENDING or APPROVED payment covering this month
  const paidRows = await prisma.paymentMonth.findMany({
    where: {
      year: currentYear,
      month: currentMonth,
      payment: {
        status: { in: ["PENDING", "APPROVED"] },
      },
    },
    select: { payment: { select: { houseId: true } } },
  });
  const paidHouseIds = new Set(paidRows.map((r) => r.payment.houseId));

  // All occupied houses (assigned to a user)
  const occupiedHouses = await prisma.house.findMany({
    where: { userId: { not: null } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      houseType: true,
    },
    orderBy: { houseNumber: "asc" },
  });

  // Filter out houses that already have payment this month
  return occupiedHouses.filter((h) => !paidHouseIds.has(h.id));
}

export async function bulkCreatePayments(
  houseIds: string[],
  months: { year: number; month: number }[],
  createdBy: string
): Promise<{ succeeded: any[]; failed: { houseId: string; reason: string }[] }> {
  const succeeded: any[] = [];
  const failed: { houseId: string; reason: string }[] = [];

  // Use one short-lived transaction per house to avoid Supabase pgbouncer
  // "transaction not found" errors that occur with a single long-running
  // interactive transaction spanning many async round-trips.
  for (const houseId of houseIds) {
    try {
      const payment = await prisma.$transaction(async (tx) => {
        // Fetch house + house type + resident
        const house = await tx.house.findUnique({
          where: { id: houseId },
          include: { houseType: true },
        });

        if (!house?.houseType) {
          throw new Error("Rumah atau tipe rumah tidak ditemukan");
        }

        if (!house.userId) {
          throw new Error("Rumah belum ditempati oleh penghuni");
        }

        const totalAmount = Number(house.houseType.price) * months.length;

        // Check for conflicts: any selected month already has PENDING/APPROVED payment
        const conflicts = await tx.paymentMonth.findMany({
          where: {
            payment: {
              houseId,
              status: { in: ["PENDING", "APPROVED"] },
            },
            OR: months.map(({ year, month }) => ({ year, month })),
          },
          select: { year: true, month: true },
        });

        if (conflicts.length > 0) {
          const seen = new Set<string>();
          const unique = conflicts.filter(({ year, month }) => {
            const key = `${year}-${month}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const monthLabels = unique.map((m) => formatPaymentMonth(m)).join(", ");
          throw new Error(`Sudah ada pembayaran untuk bulan: ${monthLabels}`);
        }

        // Create payment directly as APPROVED (no proof image, no income creation)
        const created = await tx.payment.create({
          data: {
            userId: house.userId,
            houseId,
            amountMonths: months.length,
            totalAmount,
            proofImagePath: null,
            status: "APPROVED",
            approvedBy: createdBy,
            approvedAt: new Date(),
          },
        });

        // Create PaymentMonth records
        await tx.paymentMonth.createMany({
          data: months.map(({ year, month }) => ({
            paymentId: created.id,
            year,
            month,
          })),
        });

        return created;
      });

      succeeded.push(payment);
    } catch (err: any) {
      failed.push({ houseId, reason: err.message || "Terjadi kesalahan" });
    }
  }

  return { succeeded, failed };
}

export async function getHousePaymentStatusForMonth(year: number, month: number) {
  // 1. Find which houses have a PENDING or APPROVED payment covering this month.
  //    If a house has both (shouldn't happen, but safe), prefer APPROVED.
  const paidRows = await prisma.paymentMonth.findMany({
    where: {
      year,
      month,
      payment: { status: { in: ["PENDING", "APPROVED"] } },
    },
    select: { payment: { select: { houseId: true, status: true } } },
  });

  const statusMap = new Map<string, string>();
  for (const row of paidRows) {
    const existing = statusMap.get(row.payment.houseId);
    if (existing !== "APPROVED") {
      statusMap.set(row.payment.houseId, row.payment.status);
    }
  }

  // 2. All occupied houses
  const occupiedHouses = await prisma.house.findMany({
    where: { userId: { not: null } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      houseType: true,
    },
    orderBy: { houseNumber: "asc" },
  });

  // 3. Annotate each house with its payment status for the given month
  return occupiedHouses.map((h) => ({
    ...h,
    paymentStatus: (statusMap.get(h.id) ?? null) as "PENDING" | "APPROVED" | null,
  }));
}

export async function getPaymentStats() {
  const [total, pending, approved, rejected, revenueResult] =
    await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "APPROVED" } }),
      prisma.payment.count({ where: { status: "REJECTED" } }),
      prisma.payment.aggregate({
        _sum: { totalAmount: true },
        where: { status: "APPROVED" },
      }),
    ]);

  return {
    total,
    pending,
    approved,
    rejected,
    totalRevenue: Number(revenueResult._sum.totalAmount ?? 0),
  };
}
