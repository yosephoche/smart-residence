import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/admin/dashboard-summary - Aggregate endpoint for admin dashboard
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [totalUsers, totalHouses, occupiedHouses, recentPendingPayments, recentUsers] =
      await Promise.all([
        prisma.user.count({ where: { role: "USER" } }),
        prisma.house.count(),
        prisma.house.count({ where: { userId: { not: null } } }),
        prisma.payment.findMany({
          where: { status: "PENDING" },
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            userId: true,
            houseId: true,
            amountMonths: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            user: { select: { name: true } },
            house: { select: { houseNumber: true, block: true } },
          },
        }),
        prisma.user.findMany({
          where: { role: "USER" },
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            houses: { select: { houseNumber: true } },
          },
        }),
      ]);

    return NextResponse.json(
      serializePrismaJson({
        totalUsers,
        totalHouses,
        occupiedHouses,
        recentPendingPayments,
        recentUsers,
      })
    );
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard summary" },
      { status: 500 }
    );
  }
});
