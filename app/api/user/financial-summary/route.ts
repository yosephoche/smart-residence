import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyIncomes } from "@/services/income.service";
import { getMonthlyExpenses } from "@/services/expense.service";
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

    // All 12 queries in parallel (not 6 sequential pairs)
    const results = await Promise.all(
      targets.map(({ year, month }) =>
        Promise.all([getMonthlyIncomes(year, month), getMonthlyExpenses(year, month)])
      )
    );

    const monthsData = targets.map(({ month }, index) => ({
      month: monthNames[month - 1],
      income: Number(results[index][0]) || 0,
      expense: Number(results[index][1]) || 0,
    }));

    return NextResponse.json(serializePrismaJson(monthsData));
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 }
    );
  }
});
