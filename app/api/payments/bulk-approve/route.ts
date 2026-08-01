import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { bulkApprovePayments } from "@/services/payment.service";
import { dispatchBulkDecided } from "@/lib/notifications";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req) => {
  const session = req.auth;

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: session?.user ? 403 : 401 }
    );
  }

  try {
    const { paymentIds } = await req.json();

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { error: "paymentIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await bulkApprovePayments(paymentIds, session.user.id);

    // Keep the bot notifications in sync so no admin acts on them twice.
    const approvedIds = result.succeeded.map((payment: { id: string }) => payment.id);
    const adminName = session.user.name ?? "admin";
    if (approvedIds.length > 0) {
      after(() => dispatchBulkDecided(approvedIds, adminName, "APPROVED"));
    }

    return NextResponse.json(serializePrismaJson(result));
  } catch (error) {
    console.error("Bulk approve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve payments" },
      { status: 500 }
    );
  }
});

// Increase timeout for bulk operations
export const maxDuration = 60;
