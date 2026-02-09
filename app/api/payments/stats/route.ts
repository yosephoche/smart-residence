import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentStats } from "@/services/payment.service";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await getPaymentStats();
  return NextResponse.json(stats);
});
