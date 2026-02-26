import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWhatsAppTemplateConfig,
  setWhatsAppTemplateConfig,
} from "@/services/systemConfig.service";

// GET /api/system-config/whatsapp-template - Auth required (residents need it to build WA links)
export const GET = auth(async (req) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getWhatsAppTemplateConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching WhatsApp template config:", error);
    return NextResponse.json(
      { error: "Failed to fetch WhatsApp template configuration" },
      { status: 500 }
    );
  }
});

// POST /api/system-config/whatsapp-template - Admin only
export const POST = auth(async (req) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Admin only" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { template } = body;

    if (!template || typeof template !== "string") {
      return NextResponse.json(
        { error: "Missing required field: template" },
        { status: 400 }
      );
    }

    const trimmed = template.trim();

    if (trimmed.length < 10) {
      return NextResponse.json(
        { error: "Template must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: "Template must not exceed 500 characters" },
        { status: 400 }
      );
    }

    await setWhatsAppTemplateConfig({ template: trimmed }, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating WhatsApp template config:", error);
    return NextResponse.json(
      { error: "Failed to update WhatsApp template configuration" },
      { status: 500 }
    );
  }
});
