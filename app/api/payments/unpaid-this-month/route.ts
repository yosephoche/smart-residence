import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnpaidHousesThisMonth } from "@/services/payment.service";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unpaidHouses = await getUnpaidHousesThisMonth();
  return NextResponse.json(unpaidHouses);
});
