import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHousePaymentStatusForMonth } from "@/services/payment.service";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year  = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "year and month (1-12) are required" }, { status: 400 });
  }

  const houses = await getHousePaymentStatusForMonth(year, month);
  return NextResponse.json(houses);
});
