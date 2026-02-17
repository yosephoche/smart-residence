import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeNextStartMonth, formatPaymentMonth } from "@/lib/calculations";

// GET /api/payments/available-months - Get available months user can pay for
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Get user's house
    const house = await prisma.house.findFirst({
      where: { userId },
      include: { houseType: true },
    });

    if (!house) {
      return NextResponse.json(
        { error: "User has no house assigned" },
        { status: 400 }
      );
    }

    // Get all occupied payment months for this house (all statuses)
    const payments = await prisma.payment.findMany({
      where: { houseId: house.id },
      include: { paymentMonths: true },
    });

    const occupiedMonths = payments.flatMap((p) =>
      p.paymentMonths.map((pm) => ({ year: pm.year, month: pm.month }))
    );

    // Find the next available month
    const nextMonth = computeNextStartMonth(occupiedMonths);

    // Generate 12 available months options starting from next available month
    const availableMonths = [];
    let currentYear = nextMonth.year;
    let currentMonth = nextMonth.month;

    for (let i = 0; i < 12; i++) {
      const isOccupied = occupiedMonths.some(
        (om) => om.year === currentYear && om.month === currentMonth
      );

      if (!isOccupied) {
        availableMonths.push({
          label: formatPaymentMonth({ year: currentYear, month: currentMonth }),
          value: { year: currentYear, month: currentMonth },
        });
      }

      // Move to next month
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }

      // Stop if we have 12 available months
      if (availableMonths.length >= 12) {
        break;
      }
    }

    return NextResponse.json(availableMonths);
  } catch (error) {
    console.error("Error fetching available months:", error);
    return NextResponse.json(
      { error: "Failed to fetch available months" },
      { status: 500 }
    );
  }
});
