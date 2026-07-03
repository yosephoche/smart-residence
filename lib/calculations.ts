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

export interface YearMonth {
  year: number;
  month: number;
}

function containsMonth(list: YearMonth[], target: YearMonth): boolean {
  return list.some((m) => m.year === target.year && m.month === target.month);
}

function nextMonth({ year, month }: YearMonth): YearMonth {
  return month >= 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Compute the ordered (oldest-first) list of owed-but-unpaid months for a house.
 * Iterates from billingStart through upTo (inclusive), skipping months that are
 * already occupied (PENDING/APPROVED payment) or excluded from billing.
 * Returns [] when billingStart is null (feature disabled) or starts after upTo.
 */
export function computeUnpaidMonths(params: {
  billingStart: YearMonth | null;
  occupiedMonths: YearMonth[];
  excludedPeriods: YearMonth[];
  upTo?: YearMonth;
}): YearMonth[] {
  const { billingStart, occupiedMonths, excludedPeriods } = params;
  if (!billingStart) return [];

  const now = new Date();
  const upTo = params.upTo ?? { year: now.getFullYear(), month: now.getMonth() + 1 };

  const unpaid: YearMonth[] = [];
  let cursor: YearMonth = { year: billingStart.year, month: billingStart.month };
  let guard = 0;
  while (
    (cursor.year < upTo.year || (cursor.year === upTo.year && cursor.month <= upTo.month)) &&
    guard < 240
  ) {
    if (!containsMonth(occupiedMonths, cursor) && !containsMonth(excludedPeriods, cursor)) {
      unpaid.push(cursor);
    }
    cursor = nextMonth(cursor);
    guard++;
  }
  return unpaid;
}

/**
 * Allocate a payment to months, oldest arrears first: take the first N unpaid
 * months, then fill any remaining quota by walking forward from the current
 * month, skipping already-selected, occupied, and excluded months.
 */
export function selectPaymentMonths(params: {
  amountMonths: number;
  unpaidMonths: YearMonth[];
  occupiedMonths: YearMonth[];
  excludedPeriods: YearMonth[];
  now?: YearMonth;
}): YearMonth[] {
  const { amountMonths, unpaidMonths, occupiedMonths, excludedPeriods } = params;

  const selected = unpaidMonths.slice(0, amountMonths);
  if (selected.length >= amountMonths) return selected;

  const today = new Date();
  let cursor: YearMonth =
    params.now ?? { year: today.getFullYear(), month: today.getMonth() + 1 };
  let guard = 0;
  while (selected.length < amountMonths && guard < 240) {
    if (
      !containsMonth(selected, cursor) &&
      !containsMonth(occupiedMonths, cursor) &&
      !containsMonth(excludedPeriods, cursor)
    ) {
      selected.push(cursor);
    }
    cursor = nextMonth(cursor);
    guard++;
  }
  return selected;
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
 * Get income category label in Indonesian
 */
export function getIncomeCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    MONTHLY_FEES: "Iuran Bulanan",
    LATE_FEES: "Denda Keterlambatan",
    GUEST_PARKING: "Parkir Tamu",
    FACILITY_RENTAL: "Sewa Fasilitas",
    MAINTENANCE_CHARGE: "Biaya Pemeliharaan Khusus",
    REGISTRATION_FEE: "Biaya Pendaftaran",
    OTHER: "Lainnya",
  };
  return labels[category] ?? category;
}

/**
 * Get all income category options for dropdowns
 */
export function getIncomeCategoryOptions() {
  return [
    { value: "MONTHLY_FEES", label: "Iuran Bulanan" },
    { value: "LATE_FEES", label: "Denda Keterlambatan" },
    { value: "GUEST_PARKING", label: "Parkir Tamu" },
    { value: "FACILITY_RENTAL", label: "Sewa Fasilitas" },
    { value: "MAINTENANCE_CHARGE", label: "Biaya Pemeliharaan Khusus" },
    { value: "REGISTRATION_FEE", label: "Biaya Pendaftaran" },
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
