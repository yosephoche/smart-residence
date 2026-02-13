import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomeStats } from "@/services/income.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/income/stats?startDate=2026-01-01&endDate=2026-12-31 (authenticated users)
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const stats = await getIncomeStats({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  return NextResponse.json(serializePrismaJson(stats));
});
