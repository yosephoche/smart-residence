import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableHouses } from "@/services/house.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const houses = await getAvailableHouses();
  return NextResponse.json(serializePrismaJson(houses));
});
