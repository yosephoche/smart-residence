import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllHouses, createHouse } from "@/services/house.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async (req) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const includeUser = url.searchParams.get("includeUser") === "true";
  const houses = await getAllHouses(userId, includeUser);
  return NextResponse.json(serializePrismaJson(houses));
});

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { houseNumber, block, houseTypeId, userId, isRented, renterName } = await req.json();

  if (!houseNumber || !block || !houseTypeId) {
    return NextResponse.json(
      { error: "houseNumber, block, and houseTypeId are required" },
      { status: 400 }
    );
  }

  try {
    const house = await createHouse(
      houseNumber,
      block,
      houseTypeId,
      userId || undefined,
      isRented,
      renterName
    );
    return NextResponse.json(serializePrismaJson(house), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create house" },
      { status: 400 }
    );
  }
});
