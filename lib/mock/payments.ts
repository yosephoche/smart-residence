import { Payment } from "@/types";

// Mock Payments
export const mockPayments: Payment[] = [
  {
    id: "1",
    userId: "2", // John Doe
    houseId: "1",
    amountMonths: 3,
    totalAmount: 450000,
    proofImagePath: "/mock-receipt-1.jpg",
    status: "APPROVED",
    approvedBy: "1", // Admin
    approvedAt: new Date("2026-01-20").toISOString(),
    createdAt: new Date("2026-01-15").toISOString(),
  },
  {
    id: "2",
    userId: "2", // John Doe
    houseId: "1",
    amountMonths: 2,
    totalAmount: 300000,
    proofImagePath: "/mock-receipt-2.jpg",
    status: "PENDING",
    createdAt: new Date("2026-01-25").toISOString(),
  },
  {
    id: "3",
    userId: "3", // Jane Smith
    houseId: "2",
    amountMonths: 6,
    totalAmount: 1200000,
    proofImagePath: "/mock-receipt-3.jpg",
    status: "APPROVED",
    approvedBy: "1", // Admin
    approvedAt: new Date("2026-01-18").toISOString(),
    createdAt: new Date("2026-01-16").toISOString(),
  },
  {
    id: "4",
    userId: "4", // Bob Wilson
    houseId: "3",
    amountMonths: 1,
    totalAmount: 250000,
    proofImagePath: "/mock-receipt-4.jpg",
    status: "REJECTED",
    rejectionNote: "Bukti transfer tidak jelas, mohon upload ulang dengan kualitas lebih baik",
    createdAt: new Date("2026-01-22").toISOString(),
  },
  {
    id: "5",
    userId: "4", // Bob Wilson
    houseId: "3",
    amountMonths: 3,
    totalAmount: 750000,
    proofImagePath: "/mock-receipt-5.jpg",
    status: "PENDING",
    createdAt: new Date("2026-01-28").toISOString(),
  },
];

// Payment Helper Functions
export function getAllPayments(): Payment[] {
  return [...mockPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function findPaymentById(id: string): Payment | undefined {
  return mockPayments.find((p) => p.id === id);
}

export function findPaymentsByUserId(userId: string): Payment[] {
  return mockPayments
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function findPaymentsByStatus(status: "PENDING" | "APPROVED" | "REJECTED"): Payment[] {
  return mockPayments
    .filter((p) => p.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createPayment(
  userId: string,
  houseId: string,
  amountMonths: number,
  totalAmount: number,
  proofImagePath: string
): Payment {
  const newPayment: Payment = {
    id: (mockPayments.length + 1).toString(),
    userId,
    houseId,
    amountMonths,
    totalAmount,
    proofImagePath,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  mockPayments.push(newPayment);
  return newPayment;
}

export function approvePayment(
  paymentId: string,
  approvedBy: string
): Payment | null {
  const payment = mockPayments.find((p) => p.id === paymentId);
  if (!payment || payment.status !== "PENDING") return null;

  payment.status = "APPROVED";
  payment.approvedBy = approvedBy;
  payment.approvedAt = new Date().toISOString();

  return payment;
}

export function rejectPayment(
  paymentId: string,
  rejectionNote: string
): Payment | null {
  const payment = mockPayments.find((p) => p.id === paymentId);
  if (!payment || payment.status !== "PENDING") return null;

  payment.status = "REJECTED";
  payment.rejectionNote = rejectionNote;

  return payment;
}

// Analytics functions
export function getPaymentStats() {
  const total = mockPayments.length;
  const pending = mockPayments.filter((p) => p.status === "PENDING").length;
  const approved = mockPayments.filter((p) => p.status === "APPROVED").length;
  const rejected = mockPayments.filter((p) => p.status === "REJECTED").length;

  const totalRevenue = mockPayments
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.totalAmount, 0);

  return {
    total,
    pending,
    approved,
    rejected,
    totalRevenue,
  };
}
