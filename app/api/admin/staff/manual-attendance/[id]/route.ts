import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  approveManualAttendanceRequest,
  rejectManualAttendanceRequest,
} from "@/services/manualAttendanceRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { reviewManualAttendanceRequestSchema } from "@/lib/validations/manualAttendanceRequest.schema";
import { syncManualAttendanceDecision } from "@/lib/telegram/handlers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reviewManualAttendanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { action, rejectionNote } = parsed.data;
    let result;

    if (action === "approve") {
      result = await approveManualAttendanceRequest(id, session.user.id);
    } else {
      result = await rejectManualAttendanceRequest(id, session.user.id, rejectionNote);
    }

    await syncManualAttendanceDecision(
      id,
      session.user.name ?? "Admin",
      action === "approve" ? "APPROVED" : "REJECTED",
      rejectionNote
    );

    return NextResponse.json({
      message: action === "approve" ? "Absen manual disetujui" : "Absen manual ditolak",
      request: serializePrismaJson(result),
    });
  } catch (error: any) {
    console.error("[Admin Manual Attendance PATCH]", error);

    const validationErrors = ["tidak ditemukan", "PENDING", "sudah tercatat"];
    const isValidationError = validationErrors.some((msg) =>
      error.message?.includes(msg)
    );

    return NextResponse.json(
      { error: error.message || "Failed to review manual attendance request" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
