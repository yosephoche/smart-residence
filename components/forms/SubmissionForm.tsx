"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import {
  SUBMISSION_TYPES,
  createSubmissionSchema,
} from "@/lib/validations/submission.schema";

interface SubmissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SubmissionForm({
  onSuccess,
  onCancel,
}: SubmissionFormProps) {
  const [type, setType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = createSubmissionSchema.safeParse({ type, title, content });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal mengirim pengaduan");
        return;
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Form Pengaduan / Permintaan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Tipe Pengaduan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SUBMISSION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-colors ${
                  type === t.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Judul
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Tuliskan judul singkat..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-[10px] text-slate-400 mt-1 text-right">
            {title.length}/100
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Isi / Detail
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Jelaskan secara detail..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-[10px] text-slate-400 mt-1 text-right">
            {content.length}/1000
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-2xl active:scale-[0.98] transition-transform duration-150"
          >
            Batal
          </button>
          <AnimatePresence mode="wait">
            {submitSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <CheckCircle className="w-4 h-4" />
                Terkirim!
              </motion.div>
            ) : (
              <motion.button
                key="submit"
                type="submit"
                disabled={submitting || !type}
                className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 rounded-2xl active:scale-[0.98] transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Mengirim..." : "Kirim"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
