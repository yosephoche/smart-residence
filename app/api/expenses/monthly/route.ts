import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyExpenses } from "@/services/expense.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/expenses/monthly?year=2026&month=2
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid year and month (1-12) required" },
      { status: 400 }
    );
  }

  const total = await getMonthlyExpenses(year, month);
  return NextResponse.json(serializePrismaJson({ total, year, month }));
});
