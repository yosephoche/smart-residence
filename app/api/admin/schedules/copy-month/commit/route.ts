import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";
import { copyScheduleMonthCommitSchema } from "@/lib/validations/schedule.schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user?.id) {
      return NextResponse.json(
        { error: "Invalid session: user ID not found" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const validation = copyScheduleMonthCommitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = await scheduleService.copyScheduleCommit(
      validation.data.operationId,
      session.user.id
    );

    return NextResponse.json({ result }, { status: 200 });
  } catch (error: any) {
    console.error("Error committing schedule copy:", error);

    if (
      error.message.includes("tidak ditemukan") ||
      error.message.includes("sudah dibatalkan") ||
      error.message.includes("kedaluwarsa") ||
      error.message.includes("berubah sejak preview") ||
      error.message.includes("User with ID") ||
      error.message.includes("not found")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to commit schedule copy" },
      { status: 500 }
    );
  }
}
