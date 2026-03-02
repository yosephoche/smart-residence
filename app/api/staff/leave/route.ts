import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeavesByStaff, createLeaveRequest } from "@/services/leaveRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { createLeaveRequestSchema } from "@/lib/validations/leaveRequest.schema";
import { LeaveStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status = statusParam ? (statusParam as LeaveStatus) : undefined;

    const leaves = await getLeavesByStaff(session.user.id, { status });
    return NextResponse.json({ leaves: serializePrismaJson(leaves) });
  } catch (error: any) {
    console.error("[Staff Leave GET]", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createLeaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const leave = await createLeaveRequest(
      session.user.id,
      new Date(parsed.data.startDate),
      new Date(parsed.data.endDate),
      parsed.data.reason
    );

    return NextResponse.json(
      { message: "Pengajuan cuti berhasil dikirim", leave: serializePrismaJson(leave) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Staff Leave POST]", error);

    // Service validation errors → 400
    const validationErrors = [
      "minimal",
      "sebelum",
      "Maksimum",
      "sudah memiliki",
      "Semua staf",
    ];
    const isValidationError = validationErrors.some((msg) =>
      error.message?.includes(msg)
    );

    return NextResponse.json(
      { error: error.message || "Failed to create leave request" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
