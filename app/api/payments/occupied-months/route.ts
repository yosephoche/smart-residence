import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOccupiedMonthsForHouse } from "@/services/payment.service";

export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user || !["USER", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const houseId = url.searchParams.get("houseId");
  if (!houseId) {
    return NextResponse.json({ error: "houseId is required" }, { status: 400 });
  }

  // Users can only query their own house; admins can query any house
  const { prisma } = await import("@/lib/prisma");
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }
  if (session.user.role === "USER" && house.userId !== session.user.id) {
    return NextResponse.json({ error: "House does not belong to you" }, { status: 403 });
  }

  const occupiedMonths = await getOccupiedMonthsForHouse(houseId);
  return NextResponse.json(occupiedMonths);
});
