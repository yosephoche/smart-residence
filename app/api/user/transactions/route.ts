import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIncomes } from "@/services/income.service";
import { getExpenses } from "@/services/expense.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  notes: string | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

// GET /api/user/transactions - List all financial transactions (income + expenses)
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const type = url.searchParams.get("type") || "all"; // all, income, expense

    // Validate type parameter
    if (!["all", "income", "expense"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type parameter. Must be: all, income, or expense" },
        { status: 400 }
      );
    }

    // Validate date range (max 2 years = 730 days)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 730) {
        return NextResponse.json(
          { error: "Date range cannot exceed 2 years" },
          { status: 400 }
        );
      }

      if (start > end) {
        return NextResponse.json(
          { error: "Start date must be before or equal to end date" },
          { status: 400 }
        );
      }
    }

    // Fetch income and expenses in parallel based on type filter
    const [incomes, expenses] = await Promise.all([
      type === "expense"
        ? []
        : getIncomes({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          }),
      type === "income"
        ? []
        : getExpenses({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          }),
    ]);

    // Map to unified Transaction format
    const transactions: Transaction[] = [
      ...incomes.map((income) => ({
        id: income.id,
        date: income.date.toISOString(),
        type: "income" as const,
        category: income.category,
        amount: Number(income.amount),
        description: income.description,
        notes: income.notes,
        creator: income.creator,
      })),
      ...expenses.map((expense) => ({
        id: expense.id,
        date: expense.date.toISOString(),
        type: "expense" as const,
        category: expense.category,
        amount: Number(expense.amount),
        description: expense.description,
        notes: expense.notes,
        creator: expense.creator,
      })),
    ];

    // Sort by date DESC (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(serializePrismaJson(transactions));
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
});
