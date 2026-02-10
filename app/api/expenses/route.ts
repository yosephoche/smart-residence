import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getExpenses, createExpense } from "@/services/expense.service";
import { ExpenseCategory } from "@prisma/client";

// GET /api/expenses - List expenses with optional filters
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const category = url.searchParams.get("category") as ExpenseCategory | null;

  const expenses = await getExpenses({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    category: category ?? undefined,
  });

  return NextResponse.json(expenses);
});

// POST /api/expenses - Create new expense (admin only)
export const POST = auth(async (req) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { date, category, amount, description, notes } = body;

    // Validation
    if (!date || !category || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields: date, category, amount, description" },
        { status: 400 }
      );
    }

    const expenseDate = new Date(date);
    if (expenseDate > new Date()) {
      return NextResponse.json(
        { error: "Date cannot be in the future" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be positive" },
        { status: 400 }
      );
    }

    const expense = await createExpense({
      date: expenseDate,
      category,
      amount: Number(amount),
      description,
      notes: notes || undefined,
      createdBy: session.user.id,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
});
