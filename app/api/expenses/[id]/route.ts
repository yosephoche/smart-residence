import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExpenseById, updateExpense, deleteExpense } from "@/services/expense.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/expenses/[id]
export const GET = auth(async (req, { params }) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json(serializePrismaJson(expense));
});

// PUT /api/expenses/[id] - Update expense (admin only)
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
      const expenseDate = new Date(date);
      if (expenseDate > new Date()) {
        return NextResponse.json({ error: "Date cannot be in future" }, { status: 400 });
      }
      updateData.date = expenseDate;
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

    const expense = await updateExpense(id, updateData);
    return NextResponse.json(serializePrismaJson(expense));
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
});

// DELETE /api/expenses/[id] - Delete expense (admin only)
export const DELETE = auth(async (req, { params }) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
});
