/**
 * Business logic calculations for IPL payments
 */

/**
 * Calculate total payment amount based on price per month and number of months
 * CRITICAL: This calculation must match server-side calculation for security
 */
export function calculateTotalPayment(pricePerMonth: number, numberOfMonths: number): number {
  if (numberOfMonths < 1 || numberOfMonths > 12) {
    throw new Error("Number of months must be between 1 and 12");
  }

  if (pricePerMonth < 0) {
    throw new Error("Price per month cannot be negative");
  }

  return pricePerMonth * numberOfMonths;
}

/**
 * Calculate outstanding payment amount
 */
export function calculateOutstanding(
  monthlyRate: number,
  totalMonthsInYear: number = 12,
  paidMonths: number = 0
): number {
  const outstandingMonths = totalMonthsInYear - paidMonths;
  return monthlyRate * Math.max(0, outstandingMonths);
}

/**
 * Get month options for payment selection
 */
export function getMonthOptions(): Array<{ value: number; label: string }> {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} Bulan`,
  }));
}

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * Given the set of already-occupied {year, month} for a house,
 * return the first calendar month (starting from today) that is NOT occupied.
 * Falls back to the current month if nothing is occupied.
 */
export function computeNextStartMonth(
  occupiedMonths: Array<{ year: number; month: number }>
): { year: number; month: number } {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-based

  while (occupiedMonths.some((om) => om.year === year && om.month === month)) {
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return { year, month };
}

/**
 * Compute the list of (year, month) covered by a payment starting from startMonth.
 * startMonth.month is 1-based (1 = January … 12 = December).
 */
export function computeCoveredMonths(
  startMonth: { year: number; month: number },
  amountMonths: number
): Array<{ year: number; month: number }> {
  const startYear = startMonth.year;
  const start = startMonth.month - 1; // convert to 0-based for math
  return Array.from({ length: amountMonths }, (_, i) => {
    const totalMonths = start + i;
    return {
      year: startYear + Math.floor(totalMonths / 12),
      month: (totalMonths % 12) + 1,
    };
  });
}

/**
 * Format a covered month as full Indonesian name + year, e.g. "Februari 2026"
 */
export function formatPaymentMonth({ year, month }: { year: number; month: number }): string {
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}

/**
 * Format a covered month as short name, e.g. "Feb"
 */
export function formatPaymentMonthShort({ month }: { month: number }): string {
  return MONTH_NAMES_SHORT[month - 1];
}

/**
 * Get expense category label in Indonesian
 */
export function getExpenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    MAINTENANCE: "Pemeliharaan",
    SECURITY: "Keamanan",
    UTILITIES: "Utilitas",
    CLEANING: "Kebersihan",
    LANDSCAPING: "Taman",
    ADMINISTRATION: "Administrasi",
    OTHER: "Lainnya",
  };
  return labels[category] ?? category;
}

/**
 * Get all expense category options for dropdowns
 */
export function getExpenseCategoryOptions() {
  return [
    { value: "MAINTENANCE", label: "Pemeliharaan" },
    { value: "SECURITY", label: "Keamanan" },
    { value: "UTILITIES", label: "Utilitas" },
    { value: "CLEANING", label: "Kebersihan" },
    { value: "LANDSCAPING", label: "Taman" },
    { value: "ADMINISTRATION", label: "Administrasi" },
    { value: "OTHER", label: "Lainnya" },
  ];
}

/**
 * Calculate net revenue (revenue - expenses)
 */
export function calculateNetRevenue(
  totalRevenue: number,
  totalExpenses: number
): number {
  return totalRevenue - totalExpenses;
}
