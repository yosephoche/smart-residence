import { z } from "zod";

export const SUBMISSION_TYPES = [
  { value: "FEEDBACK", label: "Feedback / Kritik" },
  { value: "SUGGESTION", label: "Masukan / Saran" },
  { value: "ACCESS_CARD_REPAIR", label: "Perbaikan Kartu Akses" },
  { value: "ACCESS_CARD_REPLACEMENT", label: "Penggantian Kartu Akses" },
] as const;

export const SUBMISSION_TYPE_LABEL: Record<string, string> = {
  FEEDBACK: "Feedback / Kritik",
  SUGGESTION: "Masukan / Saran",
  ACCESS_CARD_REPAIR: "Perbaikan Kartu Akses",
  ACCESS_CARD_REPLACEMENT: "Penggantian Kartu Akses",
};

export const SUBMISSION_STATUS_CONFIG = {
  PENDING: {
    label: "Menunggu",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
  },
  IN_REVIEW: {
    label: "Ditinjau",
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  RESOLVED: {
    label: "Selesai",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
  },
  CLOSED: {
    label: "Ditutup",
    colorClass: "text-slate-500",
    bgClass: "bg-slate-100",
  },
} as const;

export const createSubmissionSchema = z.object({
  type: z.enum(
    ["FEEDBACK", "SUGGESTION", "ACCESS_CARD_REPAIR", "ACCESS_CARD_REPLACEMENT"],
    { required_error: "Tipe pengaduan wajib dipilih" }
  ),
  title: z
    .string()
    .min(5, "Judul minimal 5 karakter")
    .max(100, "Judul maksimal 100 karakter"),
  content: z
    .string()
    .min(10, "Isi minimal 10 karakter")
    .max(1000, "Isi maksimal 1000 karakter"),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["IN_REVIEW", "RESOLVED", "CLOSED"], {
    required_error: "Status wajib dipilih",
  }),
  adminNote: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
