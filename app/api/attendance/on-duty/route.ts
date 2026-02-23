import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOnDutyStaff } from "@/services/attendance.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { JobType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Accessible to USER and ADMIN only (not STAFF)
    if (session.user.role === "STAFF") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const onDutyStaff = await getOnDutyStaff(JobType.SECURITY);

    return NextResponse.json(serializePrismaJson(onDutyStaff));
  } catch (error: any) {
    console.error("[On-Duty Staff Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to get on-duty staff" },
      { status: 500 }
    );
  }
}
