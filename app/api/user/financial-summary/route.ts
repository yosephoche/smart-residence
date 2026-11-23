import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyTotalsInRange as getMonthlyIncomeTotalsInRange } from "@/services/income.service";
import { getMonthlyTotalsInRange as getMonthlyExpenseTotalsInRange } from "@/services/expense.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/user/financial-summary - Get last 6 months income/expense data for chart
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Indonesian month abbreviations
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];

    // Build targets for last 6 months
    const targets: Array<{ year: number; month: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonth - i;
      let targetYear = currentYear;
      while (targetMonth <= 0) { targetMonth += 12; targetYear -= 1; }
      targets.push({ year: targetYear, month: targetMonth });
    }

    // Range spans the 6 target months; one bucketed query per table instead of 12 aggregates
    const rangeStart = new Date(targets[0].year, targets[0].month - 1, 1);
    const rangeEnd = new Date(targets[5].year, targets[5].month, 0, 23, 59, 59);

    const [incomeTotals, expenseTotals] = await Promise.all([
      getMonthlyIncomeTotalsInRange(rangeStart, rangeEnd),
      getMonthlyExpenseTotalsInRange(rangeStart, rangeEnd),
    ]);

    const monthsData = targets.map(({ year, month }) => {
      const key = `${year}-${month}`;
      return {
        month: monthNames[month - 1],
        income: incomeTotals.get(key) ?? 0,
        expense: expenseTotals.get(key) ?? 0,
      };
    });

    return NextResponse.json(serializePrismaJson(monthsData));
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 }
    );
  }
});
