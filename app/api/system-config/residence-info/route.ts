import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResidenceInfoConfig, setResidenceInfoConfig } from "@/services/systemConfig.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/system-config/residence-info - Public (users need to see residence info on profile)
export async function GET() {
  try {
    const config = await getResidenceInfoConfig();
    return NextResponse.json(serializePrismaJson(config));
  } catch (error) {
    console.error("Error fetching residence info config:", error);
    return NextResponse.json(
      { error: "Failed to fetch residence info configuration" },
      { status: 500 }
    );
  }
}

// POST /api/system-config/residence-info - Admin only
export const POST = auth(async (req) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { residenceName, residenceAddress } = body;

    if (!residenceName || !residenceName.trim()) {
      return NextResponse.json(
        { error: "Nama perumahan tidak boleh kosong" },
        { status: 400 }
      );
    }

    await setResidenceInfoConfig(
      { residenceName: residenceName.trim(), residenceAddress: (residenceAddress ?? "").trim() },
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating residence info config:", error);
    return NextResponse.json(
      { error: "Failed to update residence info configuration" },
      { status: 500 }
    );
  }
});
