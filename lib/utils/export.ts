import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMonth, getExpenseCategoryLabel, getIncomeCategoryLabel } from "@/lib/calculations";

// --- CSV export ---

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function exportCSV(filename: string, headers: string[], rows: string[][]): void {
  const lines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- XLSX export ---

export async function exportXLSX(filename: string, headers: string[], rows: string[][]): Promise<void> {
  const xlsx = await import("xlsx");
  const sheetData = [headers, ...rows];
  const ws = xlsx.utils.aoa_to_sheet(sheetData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Data");
  xlsx.writeFile(wb, filename);
}

// --- Mappers ---

interface Payment {
  id: string;
  user?: { name: string; email: string };
  house?: {
    houseNumber: string;
    block?: string;
    houseType?: { typeName: string };
  };
  amountMonths: number;
  totalAmount: number;
  paymentMonths?: Array<{ year: number; month: number }>;
  status: string;
  createdAt: string;
}

export function mapPaymentsForExport(payments: Payment[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "Resident Name",
    "Email",
    "House Number",
    "Block",
    "House Type",
    "Months",
    "Total Amount",
    "Period",
    "Status",
    "Submitted Date",
  ];

  const rows = payments.map((p) => {
    let period = `${p.amountMonths} bulan`;
    if (p.paymentMonths && p.paymentMonths.length > 0) {
      period = p.paymentMonths.map((m) => formatPaymentMonth(m)).join(", ");
    }

    return [
      p.user?.name ?? "",
      p.user?.email ?? "",
      p.house?.houseNumber ?? "",
      p.house?.block ?? "",
      p.house?.houseType?.typeName ?? "",
      String(p.amountMonths),
      formatCurrency(Number(p.totalAmount)),
      period,
      p.status,
      formatDate(p.createdAt),
    ];
  });

  return { headers, rows };
}

interface UnpaidHouse {
  id: string;
  houseNumber: string;
  block: string;
  user?: { name: string; email: string } | null;
  houseType?: { typeName: string; price: unknown } | null;
}

interface AnnotatedHouseForExport {
  houseNumber: string;
  block: string;
  user?: { name: string; email: string } | null;
  houseType?: { typeName: string; price: unknown } | null;
  paymentStatus: "PENDING" | "APPROVED" | null;
}

export function mapHousesWithStatusForExport(houses: AnnotatedHouseForExport[]): { headers: string[]; rows: string[][] } {
  const headers = ["Resident Name","Email","House Number","Block","House Type","Monthly Rate","Status"];
  const rows = houses.map((h) => [
    h.user?.name ?? "",
    h.user?.email ?? "",
    h.houseNumber,
    h.block,
    h.houseType?.typeName ?? "",
    h.houseType?.price != null ? formatCurrency(Number(h.houseType.price)) : "",
    h.paymentStatus === null ? "Belum Bayar" : h.paymentStatus === "PENDING" ? "Pending" : "Approved",
  ]);
  return { headers, rows };
}

export function mapUnpaidHousesForExport(houses: UnpaidHouse[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "Resident Name",
    "Email",
    "House Number",
    "Block",
    "House Type",
    "Monthly Rate",
    "Status",
  ];

  const rows = houses.map((h) => [
    h.user?.name ?? "",
    h.user?.email ?? "",
    h.houseNumber,
    h.block,
    h.houseType?.typeName ?? "",
    h.houseType?.price != null ? formatCurrency(Number(h.houseType.price)) : "",
    "Belum Bayar",
  ]);

  return { headers, rows };
}

interface Expense {
  id: string;
  date: string | Date;
  category: string;
  description: string;
  amount: number;
  notes?: string | null;
  creator?: { name: string } | null;
  createdAt: string | Date;
}

export function mapExpensesForExport(expenses: Expense[]): {
  headers: string[];
  rows: string[][];
} {
  const headers = [
    "Date",
    "Category",
    "Description",
    "Amount",
    "Notes",
    "Created By",
    "Created At",
  ];

  const rows = expenses.map((e) => [
    formatDate(e.date),
    getExpenseCategoryLabel(e.category),
    e.description,
    formatCurrency(Number(e.amount)),
    e.notes || "-",
    e.creator?.name ?? "-",
    formatDate(e.createdAt),
  ]);

  return { headers, rows };
}

interface Income {
  id: string;
  date: string | Date;
  category: string;
  description: string;
  amount: number;
  notes?: string | null;
  creator?: { name: string } | null;
  createdAt: string | Date;
}

export function mapIncomesForExport(incomes: Income[]): {
  headers: string[];
  rows: string[][];
} {
  const headers = [
    "Date",
    "Category",
    "Description",
    "Amount",
    "Notes",
    "Created By",
    "Created At",
  ];

  const rows = incomes.map((i) => [
    formatDate(i.date),
    getIncomeCategoryLabel(i.category),
    i.description,
    formatCurrency(Number(i.amount)),
    i.notes || "-",
    i.creator?.name ?? "-",
    formatDate(i.createdAt),
  ]);

  return { headers, rows };
}

interface Attendance {
  id: string;
  clockInAt: string | Date;
  clockOutAt?: string | Date | null;
  lateMinutes?: number | null;
  staff: {
    name: string;
    staffJobType: string;
  };
  schedule?: {
    shiftTemplate: {
      shiftName: string;
      startTime: string;
      endTime: string;
    };
  } | null;
  shiftStartTime?: string;
}

export function mapAttendancesForExport(attendances: Attendance[]): {
  headers: string[];
  rows: string[][];
} {
  const headers = [
    "Staff Name",
    "Job Type",
    "Shift",
    "Clock In",
    "Clock Out",
    "Duration",
    "Late (min)",
    "Status",
  ];

  const rows = attendances.map((a) => {
    // Calculate duration
    let duration = "-";
    if (a.clockOutAt) {
      const diffMs = new Date(a.clockOutAt).getTime() - new Date(a.clockInAt).getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      duration = `${hours}h ${minutes}m`;
    }

    // Shift info
    const shift = a.schedule
      ? `${a.schedule.shiftTemplate.shiftName} (${a.schedule.shiftTemplate.startTime}-${a.schedule.shiftTemplate.endTime})`
      : a.shiftStartTime || "Manual";

    // Status
    const status = a.lateMinutes && a.lateMinutes > 0 ? "Late" : "On Time";

    return [
      a.staff.name,
      a.staff.staffJobType.replace("_", " "),
      shift,
      formatDate(a.clockInAt),
      a.clockOutAt ? formatDate(a.clockOutAt) : "-",
      duration,
      a.lateMinutes?.toString() || "0",
      status,
    ];
  });

  return { headers, rows };
}

interface HouseForExport {
  houseNumber: string;
  block: string;
  houseType?: { typeName: string; price: unknown } | null;
  userId?: string | null;
  isRented?: boolean;
  renterName?: string | null;
  user?: { name: string; email: string } | null;
}

export function mapHousesForExport(houses: HouseForExport[]): {
  headers: string[];
  rows: string[][];
} {
  const headers = [
    "House Number",
    "Block",
    "House Type",
    "Monthly Rate (Rp)",
    "Resident Name",
    "Resident Email",
    "Status",
    "Is Rented",
    "Renter Name",
  ];

  const rows = houses.map((h) => [
    h.houseNumber,
    h.block,
    h.houseType?.typeName ?? "-",
    h.houseType?.price != null ? formatCurrency(Number(h.houseType.price)) : "Rp 0",
    h.user?.name ?? "-",
    h.user?.email ?? "-",
    h.userId ? "Occupied" : "Vacant",
    h.isRented ? "Yes" : "No",
    h.renterName ?? "-",
  ]);

  return { headers, rows };
}
