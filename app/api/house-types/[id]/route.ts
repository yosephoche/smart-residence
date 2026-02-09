import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getHouseTypeById,
  updateHouseType,
  deleteHouseType,
} from "@/services/houseType.service";

export const GET = auth(async (_req, { params }) => {
  const { id } = await params;
  const type = await getHouseTypeById(id);

  if (!type) {
    return NextResponse.json({ error: "House type not found" }, { status: 404 });
  }

  return NextResponse.json(type);
});

export const PUT = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const updates = await req.json();

  try {
    const type = await updateHouseType(id, updates);
    return NextResponse.json(type);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update house type" },
      { status: 400 }
    );
  }
});

export const DELETE = auth(async (_req, { params }) => {
  if (_req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteHouseType(id);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
