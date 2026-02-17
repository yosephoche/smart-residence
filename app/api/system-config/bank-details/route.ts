import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBankDetailsConfig, setBankDetailsConfig } from "@/services/systemConfig.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/system-config/bank-details - Public (users need to see bank info when uploading)
export async function GET() {
  try {
    const config = await getBankDetailsConfig();
    return NextResponse.json(serializePrismaJson(config));
  } catch (error) {
    console.error("Error fetching bank details config:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank details configuration" },
      { status: 500 }
    );
  }
}

// POST /api/system-config/bank-details - Admin only
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
    const { bankName, accountNumber, accountName } = body;

    // Validation
    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Missing required fields: bankName, accountNumber, accountName" },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be numeric" },
        { status: 400 }
      );
    }

    await setBankDetailsConfig(
      { bankName, accountNumber, accountName },
      session.user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating bank details config:", error);
    return NextResponse.json(
      { error: "Failed to update bank details configuration" },
      { status: 500 }
    );
  }
});
