import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bulkCreatePayments } from "@/services/payment.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = req.auth.user.id;
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { houseIds, months } = body;

  if (!Array.isArray(houseIds) || houseIds.length === 0) {
    return NextResponse.json(
      { error: "houseIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!Array.isArray(months) || months.length === 0) {
    return NextResponse.json(
      { error: "months must be a non-empty array" },
      { status: 400 }
    );
  }

  // Validate each month entry
  for (const m of months) {
    if (
      typeof m.year !== "number" || typeof m.month !== "number" ||
      m.month < 1 || m.month > 12 ||
      m.year < 2000 || m.year > 2100
    ) {
      return NextResponse.json(
        { error: "Each month entry must have a valid year (2000-2100) and month (1-12)" },
        { status: 400 }
      );
    }
  }

  try {
    const result = await bulkCreatePayments(houseIds, months, adminId);
    return NextResponse.json(serializePrismaJson(result), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to bulk create payments" },
      { status: 500 }
    );
  }
});
