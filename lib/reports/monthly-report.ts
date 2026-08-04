/**
 * Monthly financial report workbook.
 *
 * Kept free of prisma and of any browser API so the same builder serves the
 * kas page download and the Telegram bot, which needs a Buffer instead of a
 * DOM download.
 */

import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseCategoryLabel, getIncomeCategoryLabel } from "@/lib/calculations";

/** Prisma returns Decimal for money columns; API responses return number. */
type NumericLike = number | string | { toString(): string };

export interface ReportEntry {
  id: string;
  date: string | Date;
  category: string;
  description: string;
  amount: NumericLike;
  notes?: string | null;
  creator?: { name: string } | null;
}

export interface MonthlyReportData {
  month: number;
  year: number;
  incomes: ReportEntry[];
  expenses: ReportEntry[];
}

export interface MonthlyReportTotals {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeCount: number;
  expenseCount: number;
}

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function monthNameId(month: number): string {
  return MONTH_NAMES_ID[month - 1] ?? `Bulan ${month}`;
}

export function monthlyReportFilename(month: number, year: number): string {
  return `Laporan_Keuangan_${monthNameId(month)}_${year}.xlsx`;
}

export function summarizeMonthlyReport(data: MonthlyReportData): MonthlyReportTotals {
  const totalIncome = data.incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpense = data.expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeCount: data.incomes.length,
    expenseCount: data.expenses.length,
  };
}

const ENTRY_HEADERS = [
  "No",
  "Tanggal",
  "Kategori",
  "Deskripsi",
  "Jumlah (Rp)",
  "Catatan",
  "Dicatat Oleh",
];

const ENTRY_COLS = [
  { wch: 4 },
  { wch: 12 },
  { wch: 16 },
  { wch: 36 },
  { wch: 18 },
  { wch: 24 },
  { wch: 18 },
];

export async function buildMonthlyReportWorkbook(data: MonthlyReportData) {
  const xlsx = await import("xlsx");
  const { month, year, incomes, expenses } = data;

  const monthName = monthNameId(month);
  const title = `Laporan Keuangan ${monthName} ${year}`;
  const { totalIncome, totalExpense, balance } = summarizeMonthlyReport(data);

  const wb = xlsx.utils.book_new();

  // --- Sheet 1: Ringkasan ---
  const summaryData = [
    [title],
    [],
    ["RINGKASAN KEUANGAN"],
    ["Periode", `${monthName} ${year}`],
    ["Total Pemasukan", formatCurrency(totalIncome)],
    ["Total Pengeluaran", formatCurrency(totalExpense)],
    ["Saldo", formatCurrency(balance)],
    [],
    ["Jumlah Transaksi Pemasukan", incomes.length],
    ["Jumlah Transaksi Pengeluaran", expenses.length],
  ];
  const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];
  xlsx.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  // --- Sheet 2: Pengeluaran ---
  const expenseRows = expenses.map((e, i) => [
    i + 1,
    formatDate(e.date),
    getExpenseCategoryLabel(e.category),
    e.description,
    Number(e.amount),
    e.notes || "-",
    e.creator?.name ?? "-",
  ]);
  const expenseTotalRow = ["", "", "", "TOTAL", totalExpense, "", ""];
  const wsExpense = xlsx.utils.aoa_to_sheet([ENTRY_HEADERS, ...expenseRows, expenseTotalRow]);
  wsExpense["!cols"] = ENTRY_COLS;
  xlsx.utils.book_append_sheet(wb, wsExpense, "Pengeluaran");

  // --- Sheet 3: Pemasukan ---
  const incomeRows = incomes.map((i, idx) => [
    idx + 1,
    formatDate(i.date),
    getIncomeCategoryLabel(i.category),
    i.description,
    Number(i.amount),
    i.notes || "-",
    i.creator?.name ?? "-",
  ]);
  const incomeTotalRow = ["", "", "", "TOTAL", totalIncome, "", ""];
  const wsIncome = xlsx.utils.aoa_to_sheet([ENTRY_HEADERS, ...incomeRows, incomeTotalRow]);
  wsIncome["!cols"] = ENTRY_COLS;
  xlsx.utils.book_append_sheet(wb, wsIncome, "Pemasukan");

  return wb;
}

/** Server-side counterpart of the browser download — returns the file bytes. */
export async function buildMonthlyReportBuffer(data: MonthlyReportData): Promise<Buffer> {
  const xlsx = await import("xlsx");
  const wb = await buildMonthlyReportWorkbook(data);
  return xlsx.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
