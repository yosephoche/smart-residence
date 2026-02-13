import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomes, createIncome } from "@/services/income.service";
import { IncomeCategory } from "@prisma/client";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/income - List incomes with optional filters (admin only)
export const GET = auth(async (req) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const category = url.searchParams.get("category") as IncomeCategory | null;

  const incomes = await getIncomes({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    category: category ?? undefined,
  });

  return NextResponse.json(serializePrismaJson(incomes));
});

// POST /api/income - Create new income (admin only)
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

    const incomeDate = new Date(date);
    if (incomeDate > new Date()) {
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

    const income = await createIncome({
      date: incomeDate,
      category,
      amount: Number(amount),
      description,
      notes: notes || undefined,
      createdBy: session.user.id,
    });

    return NextResponse.json(serializePrismaJson(income), { status: 201 });
  } catch (error) {
    console.error("Error creating income:", error);
    return NextResponse.json(
      { error: "Failed to create income" },
      { status: 500 }
    );
  }
});
