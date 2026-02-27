import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExcludedIncomePeriodsConfig, setConfig } from "@/services/systemConfig.service";
import { invalidateExcludedIncomePeriodsCache } from "@/lib/cache/excluded-income-periods";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getExcludedIncomePeriodsConfig();
  return NextResponse.json(config);
});

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = req.auth.user.id;
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (!Array.isArray(body.periods)) {
    return NextResponse.json({ error: "periods must be an array" }, { status: 400 });
  }

  // Validate each period
  for (const p of body.periods) {
    if (
      typeof p.year !== "number" || typeof p.month !== "number" ||
      p.month < 1 || p.month > 12 ||
      p.year < 2000 || p.year > 2100
    ) {
      return NextResponse.json(
        { error: "Each period must have a valid year (2000-2100) and month (1-12)" },
        { status: 400 }
      );
    }
  }

  // Remove duplicate periods
  const seen = new Set<string>();
  const uniquePeriods = body.periods.filter((p: { year: number; month: number }) => {
    const key = `${p.year}-${p.month}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await setConfig("excluded_income_periods", { periods: uniquePeriods }, adminId);
  invalidateExcludedIncomePeriodsCache();

  return NextResponse.json({ periods: uniquePeriods });
});
