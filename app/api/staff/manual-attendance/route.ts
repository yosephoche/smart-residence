import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getRequestsByStaff,
  createManualAttendanceRequest,
} from "@/services/manualAttendanceRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { createManualAttendanceRequestSchema } from "@/lib/validations/manualAttendanceRequest.schema";
import { ManualAttendanceStatus } from "@prisma/client";
import { notifyManualAttendanceRequestCreated } from "@/lib/telegram/handlers";

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
    const status = statusParam ? (statusParam as ManualAttendanceStatus) : undefined;

    const requests = await getRequestsByStaff(session.user.id, { status });
    return NextResponse.json({ requests: serializePrismaJson(requests) });
  } catch (error: any) {
    console.error("[Staff Manual Attendance GET]", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
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
    const parsed = createManualAttendanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const request = await createManualAttendanceRequest(
      session.user.id,
      new Date(parsed.data.date),
      new Date(parsed.data.clockInAt),
      new Date(parsed.data.clockOutAt),
      parsed.data.reason
    );

    await notifyManualAttendanceRequestCreated(request.id);

    return NextResponse.json(
      { message: "Pengajuan absen manual berhasil dikirim", request: serializePrismaJson(request) },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Staff Manual Attendance POST]", error);

    const validationErrors = [
      "masa lalu",
      "Maksimum",
      "Tidak ada jadwal",
      "sudah tercatat",
      "sudah memiliki",
    ];
    const isValidationError = validationErrors.some((msg) =>
      error.message?.includes(msg)
    );

    return NextResponse.json(
      { error: error.message || "Failed to create manual attendance request" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
