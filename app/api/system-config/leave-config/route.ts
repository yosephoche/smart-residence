import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeaveConfig, setLeaveConfig } from "@/services/systemConfig.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { z } from "zod";

const leaveConfigSchema = z.object({
  maxDaysPerRequest: z.number().int().min(1).max(30),
  minAdvanceDays: z.number().int().min(1).max(60),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getLeaveConfig();
    return NextResponse.json(serializePrismaJson(config));
  } catch (error: any) {
    console.error("[Leave Config GET]", error);
    return NextResponse.json({ error: "Failed to fetch leave config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = leaveConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.errors },
        { status: 400 }
      );
    }

    await setLeaveConfig(parsed.data, session.user.id);
    return NextResponse.json({ message: "Konfigurasi cuti berhasil disimpan", config: parsed.data });
  } catch (error: any) {
    console.error("[Leave Config POST]", error);
    return NextResponse.json({ error: "Failed to save leave config" }, { status: 500 });
  }
}
