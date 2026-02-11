import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHouseById, updateHouse, deleteHouse } from "@/services/house.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async (_req, { params }) => {
  const { id } = await params;
  const house = await getHouseById(id);

  if (!house) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  return NextResponse.json(serializePrismaJson(house));
});

export const PUT = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { houseNumber, block, houseTypeId, userId, isRented, renterName } = await req.json();

  try {
    const house = await updateHouse(id, {
      houseNumber,
      block,
      houseTypeId,
      userId: userId || null,
      isRented,
      renterName: renterName || null,
    });
    return NextResponse.json(serializePrismaJson(house));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update house" },
      { status: 400 }
    );
  }
});

export const DELETE = auth(async (_req, { params }) => {
  if (_req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteHouse(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete house" },
      { status: 400 }
    );
  }
});
