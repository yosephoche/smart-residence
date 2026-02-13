import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomeById, updateIncome, deleteIncome } from "@/services/income.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/income/[id] (admin only)
export const GET = auth(async (req, { params }) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const income = await getIncomeById(id);
  if (!income) {
    return NextResponse.json({ error: "Income not found" }, { status: 404 });
  }

  return NextResponse.json(serializePrismaJson(income));
});

// PUT /api/income/[id] - Update income (admin only)
export const PUT = auth(async (req, { params }) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { date, category, amount, description, notes } = body;

    // Validation (same as POST)
    const updateData: any = {};
    if (date) {
      const incomeDate = new Date(date);
      if (incomeDate > new Date()) {
        return NextResponse.json({ error: "Date cannot be in future" }, { status: 400 });
      }
      updateData.date = incomeDate;
    }
    if (category) updateData.category = category;
    if (amount) {
      if (amount <= 0) {
        return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
      }
      updateData.amount = Number(amount);
    }
    if (description) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes || null;

    const income = await updateIncome(id, updateData);
    return NextResponse.json(serializePrismaJson(income));
  } catch (error) {
    console.error("Error updating income:", error);
    return NextResponse.json({ error: "Failed to update income" }, { status: 500 });
  }
});

// DELETE /api/income/[id] - Delete income (admin only)
export const DELETE = auth(async (req, { params }) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deleteIncome(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting income:", error);
    return NextResponse.json({ error: "Failed to delete income" }, { status: 500 });
  }
});
