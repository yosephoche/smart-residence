import { getIncomes } from "@/services/income.service";
import { getExpenses } from "@/services/expense.service";
import type { MonthlyReportData } from "@/lib/reports/monthly-report";

/**
 * Rows behind the monthly financial report.
 *
 * Callers without a NextAuth session (the Telegram bot) hit the services
 * directly — /api/income and /api/expenses both require one.
 */
export async function getMonthlyReportData(
  year: number,
  month: number
): Promise<MonthlyReportData> {
  // Same month boundaries the kas page uses.
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [incomes, expenses] = await Promise.all([
    getIncomes({ startDate, endDate }),
    getExpenses({ startDate, endDate }),
  ]);

  return { year, month, incomes, expenses };
}
