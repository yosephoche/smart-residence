import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";
import { updateScheduleSchema } from "@/lib/validations/schedule.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await scheduleService.getScheduleById(id);

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);

    if (error.message === "Schedule not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Validate request body
    const validation = updateScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const schedule = await scheduleService.updateSchedule(
      id,
      validation.data
    );

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("Error updating schedule:", error);

    if (error.message === "Schedule not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes("doesn't match")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await scheduleService.deleteSchedule(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting schedule:", error);

    if (error.message.includes("Attendance record exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
