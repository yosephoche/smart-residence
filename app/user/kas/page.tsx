"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, Pencil, Trash2, X, ChevronDown, Calendar, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseCategoryOptions } from "@/lib/calculations";
import ExpenseForm, { ExpenseFormData } from "@/components/forms/ExpenseForm";

export const dynamic = "force-dynamic";

const EASE = [0.25, 0.46, 0.45, 0.94] as const as any;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: "Pemeliharaan",
  SECURITY: "Keamanan",
  UTILITIES: "Utilitas",
  CLEANING: "Kebersihan",
  LANDSCAPING: "Taman",
  ADMINISTRATION: "Administrasi",
  OTHER: "Lainnya",
};

const CATEGORY_COLORS: Record<string, string> = {
  MAINTENANCE: "bg-orange-50 text-orange-600",
  SECURITY: "bg-red-50 text-red-600",
  UTILITIES: "bg-blue-50 text-blue-600",
  CLEANING: "bg-green-50 text-green-600",
  LANDSCAPING: "bg-emerald-50 text-emerald-600",
  ADMINISTRATION: "bg-purple-50 text-purple-600",
  OTHER: "bg-slate-50 text-slate-600",
};

export default function KasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const categories = getExpenseCategoryOptions();

  // Guard: only pengurus
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isPengurus && session?.user?.role !== "ADMIN") {
      router.replace("/user/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.isPengurus || session?.user?.role === "ADMIN") {
      fetchExpenses();
    }
  }, [session]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(Array.isArray(data) ? data : []);
    setIsLoading(false);
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (categoryFilter !== "ALL") result = result.filter((e) => e.category === categoryFilter);
    if (filterYear !== 0 && filterMonth !== 0) {
      result = result.filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
      });
    } else if (filterYear !== 0) {
      result = result.filter((e) => new Date(e.date).getFullYear() === filterYear);
    }
    return result;
  }, [expenses, categoryFilter, filterYear, filterMonth]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expenses.forEach((e) => years.add(new Date(e.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const handleSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("date", data.date);
    formData.append("category", data.category);
    formData.append("amount", String(data.amount));
    formData.append("description", data.description);
    if (data.notes) formData.append("notes", data.notes);
    if (data.proofImage) formData.append("proofImage", data.proofImage);

    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PUT" : "POST";

    const res = await fetch(url, { method, body: formData });
    setIsSubmitting(false);

    if (res.ok) {
      showToast(editingExpense ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan", "success");
      setShowForm(false);
      setEditingExpense(null);
      fetchExpenses();
    } else {
      const d = await res.json();
      showToast(d.error || "Gagal menyimpan", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Pengeluaran dihapus", "success");
      setDeleteConfirmId(null);
      fetchExpenses();
    } else {
      showToast("Gagal menghapus", "error");
      setDeleteConfirmId(null);
    }
  };

  const openEdit = (expense: any) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];

  if (status === "loading" || (!session?.user?.isPengurus && session?.user?.role !== "ADMIN" && status === "authenticated")) {
    return null;
  }

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg max-w-[320px] text-center ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kas Pengeluaran</h1>
          <p className="text-sm text-slate-400 mt-0.5">Kelola pengeluaran perumahan</p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-[0.97] transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah
        </button>
      </motion.div>

      {/* Summary card */}
      <motion.div variants={itemVariants} className="bg-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-blue-200" />
          <p className="text-xs text-blue-200 font-medium">Total Pengeluaran</p>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totalFiltered)}</p>
        <p className="text-xs text-blue-200 mt-1">{filteredExpenses.length} transaksi</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2">
        {/* Month filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterMonth(0)}
            className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
              filterMonth === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            Semua
          </button>
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setFilterMonth(i + 1)}
              className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                filterMonth === i + 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Year + category */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="w-full text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 appearance-none pr-6 font-medium"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative flex-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 appearance-none pr-6 font-medium"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* List */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 flex flex-col items-center gap-2 text-center">
            <Receipt className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400 font-medium">Belum ada pengeluaran</p>
            <p className="text-xs text-slate-300">Tap tombol Tambah untuk input pengeluaran</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + index * 0.03 }}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[expense.category] || "bg-slate-50 text-slate-500"}`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{expense.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[expense.category] || "bg-slate-50 text-slate-500"}`}>
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          <Calendar className="w-2.5 h-2.5 inline mr-0.5" />
                          {formatDate(expense.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(Number(expense.amount))}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(expense)}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(expense.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Expense Form Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeForm}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-2xl z-50 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800">
                  {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
                </h2>
                <button onClick={closeForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <ExpenseForm
                  onSubmit={handleSubmit}
                  onCancel={closeForm}
                  isSubmitting={isSubmitting}
                  initialData={editingExpense}
                  existingProofUrl={editingExpense?.proofImagePath}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              key="del-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              key="del-dialog"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
            >
              <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Pengeluaran?</h3>
                <p className="text-sm text-slate-500 mb-4">Data pengeluaran ini akan dihapus permanen.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 active:scale-[0.97] transition-transform"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold active:scale-[0.97] transition-transform"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
