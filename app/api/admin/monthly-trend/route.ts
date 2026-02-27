import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyBreakdownByYear as getExpenseMonthly } from "@/services/expense.service";
import { getMonthlyBreakdownByYear as getIncomeMonthly } from "@/services/income.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// GET /api/admin/monthly-trend?year=2026 (admin only)
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const [incomeMonthly, expenseMonthly] = await Promise.all([
    getIncomeMonthly(year),
    getExpenseMonthly(year),
  ]);

  const trend = incomeMonthly.map((inc, i) => ({
    month: inc.month,
    label: MONTH_LABELS[i],
    income: inc.total,
    expense: expenseMonthly[i].total,
  }));

  return NextResponse.json(serializePrismaJson(trend));
});
