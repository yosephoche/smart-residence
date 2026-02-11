import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllHouseTypes, createHouseType } from "@/services/houseType.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async () => {
  const types = await getAllHouseTypes();
  return NextResponse.json(serializePrismaJson(types));
});

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { typeName, price, description } = await req.json();

  if (!typeName || price === undefined) {
    return NextResponse.json(
      { error: "typeName and price are required" },
      { status: 400 }
    );
  }

  try {
    const type = await createHouseType(typeName, price, description);
    return NextResponse.json(serializePrismaJson(type), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create house type" },
      { status: 400 }
    );
  }
});
