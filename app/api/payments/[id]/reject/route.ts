import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rejectPayment } from "@/services/payment.service";

export const POST = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { rejectionNote } = await req.json();

  if (!rejectionNote) {
    return NextResponse.json(
      { error: "Rejection note is required" },
      { status: 400 }
    );
  }

  try {
    const payment = await rejectPayment(id, rejectionNote);
    return NextResponse.json(payment);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reject payment" },
      { status: 400 }
    );
  }
});
