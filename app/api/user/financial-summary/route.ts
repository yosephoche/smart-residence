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

    // Calculate last 6 months
    const monthsData = [];

    // Indonesian month abbreviations
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];

    for (let i = 5; i >= 0; i--) {
      let targetMonth = currentMonth - i;
      let targetYear = currentYear;

      // Handle year wrap-around
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      // Fetch income and expense for this month
      const [income, expense] = await Promise.all([
        getMonthlyIncomes(targetYear, targetMonth),
        getMonthlyExpenses(targetYear, targetMonth),
      ]);

      monthsData.push({
        month: monthNames[targetMonth - 1],
        income: Number(income) || 0,
        expense: Number(expense) || 0,
      });
    }

    return NextResponse.json(serializePrismaJson(monthsData));
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 }
    );
  }
});
