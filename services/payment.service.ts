import { prisma } from "@/lib/prisma";
import { computeNextStartMonth, computeCoveredMonths, formatPaymentMonth } from "@/lib/calculations";

const paymentMonthsInclude = {
  orderBy: [{ year: "asc" as const }, { month: "asc" as const }],
};

export async function getPayments({
  status,
  userId,
}: {
  status?: string;
  userId?: string;
} = {}) {
  return prisma.payment.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
      ...(userId ? { userId } : {}),
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

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "APPROVED",
      approvedBy,
      approvedAt: new Date(),
    },
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

  const succeeded: any[] = [];
  const failed: { id: string; reason: string }[] = [];

  // Use transaction for atomicity with extended timeout for bulk operations
  await prisma.$transaction(
    async (tx) => {
      for (const paymentId of paymentIds) {
        try {
          // Fetch payment to validate status
          const payment = await tx.payment.findUnique({ where: { id: paymentId } });

          if (!payment) {
            failed.push({ id: paymentId, reason: "Payment not found" });
            continue;
          }

          if (payment.status !== "PENDING") {
            failed.push({ id: paymentId, reason: `Payment already ${payment.status.toLowerCase()}` });
            continue;
          }

          // Approve payment
          const updated = await tx.payment.update({
            where: { id: paymentId },
            data: {
              status: "APPROVED",
              approvedBy,
              approvedAt: new Date(),
            },
            include: {
              user: { select: { name: true, email: true } },
              house: { select: { houseNumber: true, block: true } },
            },
          });

          succeeded.push(updated);
        } catch (error) {
          failed.push({ id: paymentId, reason: "Update failed" });
        }
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
