import { prisma } from "@/lib/prisma";
import { ExpenseCategory } from "@prisma/client";

// Fetch expenses with optional filtering
export async function getExpenses({
  startDate,
  endDate,
  category,
  createdBy,
}: {
  startDate?: Date;
  endDate?: Date;
  category?: ExpenseCategory;
  createdBy?: string;
} = {}) {
  return prisma.expense.findMany({
    where: {
      ...(startDate ? { date: { gte: startDate } } : {}),
      ...(endDate ? { date: { lte: endDate } } : {}),
      ...(category ? { category } : {}),
      ...(createdBy ? { createdBy } : {}),
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: "desc" },
  });
}

// Get single expense by ID
export async function getExpenseById(id: string) {
  return prisma.expense.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

// Create new expense (admin only)
export async function createExpense(data: {
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string;
  notes?: string;
  createdBy: string;
}) {
  return prisma.expense.create({
    data,
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

// Update existing expense (admin only)
export async function updateExpense(
  id: string,
  data: {
    date?: Date;
    category?: ExpenseCategory;
    amount?: number;
    description?: string;
    notes?: string;
  }
) {
  return prisma.expense.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });
}

// Delete expense (admin only)
export async function deleteExpense(id: string) {
  return prisma.expense.delete({ where: { id } });
}

// Get total expenses for a specific month
export async function getMonthlyExpenses(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  return Number(result._sum.amount ?? 0);
}

// Get all-time total expenses
export async function getTotalExpenses() {
  const result = await prisma.expense.aggregate({
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

// Get expense statistics with category breakdown
export async function getExpenseStats({
  startDate,
  endDate,
}: {
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const [total, totalAmount, byCategory] = await Promise.all([
    prisma.expense.count({
      where: {
        ...(startDate ? { date: { gte: startDate } } : {}),
        ...(endDate ? { date: { lte: endDate } } : {}),
      },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        ...(startDate ? { date: { gte: startDate } } : {}),
        ...(endDate ? { date: { lte: endDate } } : {}),
      },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: true,
      where: {
        ...(startDate ? { date: { gte: startDate } } : {}),
        ...(endDate ? { date: { lte: endDate } } : {}),
      },
    }),
  ]);

  return {
    total,
    totalAmount: Number(totalAmount._sum.amount ?? 0),
    byCategory: byCategory.map((item) => ({
      category: item.category,
      amount: Number(item._sum.amount ?? 0),
      count: item._count,
    })),
  };
}
