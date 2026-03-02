import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveLeave, rejectLeave } from "@/services/leaveRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { reviewLeaveRequestSchema } from "@/lib/validations/leaveRequest.schema";

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
    const parsed = reviewLeaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { action, rejectionNote } = parsed.data;
    let result;

    if (action === "approve") {
      result = await approveLeave(id, session.user.id);
    } else {
      result = await rejectLeave(id, session.user.id, rejectionNote);
    }

    return NextResponse.json({
      message: action === "approve" ? "Cuti disetujui" : "Cuti ditolak",
      leave: serializePrismaJson(result),
    });
  } catch (error: any) {
    console.error("[Admin Leave PATCH]", error);

    const validationErrors = ["tidak ditemukan", "PENDING", "Semua staf"];
    const isValidationError = validationErrors.some((msg) =>
      error.message?.includes(msg)
    );

    return NextResponse.json(
      { error: error.message || "Failed to review leave request" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
