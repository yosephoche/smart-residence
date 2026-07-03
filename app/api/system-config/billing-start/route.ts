import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingStartConfig, setBillingStartConfig } from "@/services/systemConfig.service";

export const GET = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await getBillingStartConfig();
  return NextResponse.json(config);
});

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = req.auth.user.id;
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  if (
    typeof body.year !== "number" || typeof body.month !== "number" ||
    body.month < 1 || body.month > 12 ||
    body.year < 2000 || body.year > 2100
  ) {
    return NextResponse.json(
      { error: "Config must have a valid year (2000-2100) and month (1-12)" },
      { status: 400 }
    );
  }

  const config = { enabled: body.enabled, year: body.year, month: body.month };
  await setBillingStartConfig(config, adminId);

  return NextResponse.json(config);
});
