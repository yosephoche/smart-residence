"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, Pencil, Trash2, X, ChevronDown,
  Calendar, Receipt, ImagePlus, Check, Loader2, Download,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportMonthlyReport } from "@/lib/utils/export";

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

const CATEGORIES = [
  { value: "MAINTENANCE", label: "Pemeliharaan", color: "bg-orange-50 text-orange-600" },
  { value: "SECURITY", label: "Keamanan", color: "bg-red-50 text-red-600" },
  { value: "UTILITIES", label: "Utilitas", color: "bg-blue-50 text-blue-600" },
  { value: "CLEANING", label: "Kebersihan", color: "bg-green-50 text-green-600" },
  { value: "LANDSCAPING", label: "Taman", color: "bg-emerald-50 text-emerald-600" },
  { value: "ADMINISTRATION", label: "Administrasi", color: "bg-purple-50 text-purple-600" },
  { value: "OTHER", label: "Lainnya", color: "bg-slate-100 text-slate-600" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

type FormState = {
  date: string;
  category: string;
  amount: string;
  description: string;
  notes: string;
  proofImage: File | null;
};

const emptyForm = (): FormState => ({
  date: new Date().toISOString().split("T")[0],
  category: "",
  amount: "",
  description: "",
  notes: "",
  proofImage: null,
});

export default function KasPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);
  const [dlMonth, setDlMonth] = useState(new Date().getMonth() + 1);
  const [dlYear, setDlYear] = useState(new Date().getFullYear());
  const fileRef = useRef<HTMLInputElement>(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isPengurus && session?.user?.role !== "ADMIN") {
      router.replace("/user/dashboard");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.isPengurus || session?.user?.role === "ADMIN") fetchExpenses();
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
    setTimeout(() => setToast(null), 3000);
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

  const openAdd = () => {
    setEditingExpense(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (expense: any) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      category: expense.category || "",
      amount: String(expense.amount || ""),
      description: expense.description || "",
      notes: expense.notes || "",
      proofImage: null,
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const validate = () => {
    const e: Partial<FormState> = {};
    if (!form.date) e.date = "Tanggal wajib diisi";
    else if (new Date(form.date) > new Date()) e.date = "Tidak boleh tanggal masa depan";
    if (!form.category) e.category = "Pilih kategori";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Jumlah harus lebih dari 0";
    if (!form.description || form.description.trim().length < 5) e.description = "Min. 5 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("date", form.date);
    fd.append("category", form.category);
    fd.append("amount", form.amount);
    fd.append("description", form.description.trim());
    if (form.notes.trim()) fd.append("notes", form.notes.trim());
    if (form.proofImage) fd.append("proofImage", form.proofImage);

    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PUT" : "POST";
    const res = await fetch(url, { method, body: fd });
    setIsSubmitting(false);

    if (res.ok) {
      showToast(editingExpense ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan", "success");
      closeForm();
      fetchExpenses();
    } else {
      const d = await res.json();
      showToast(d.error || "Gagal menyimpan", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setDeleteConfirmId(null);
    if (res.ok) {
      showToast("Pengeluaran dihapus", "success");
      fetchExpenses();
    } else {
      showToast("Gagal menghapus", "error");
    }
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const startDate = new Date(dlYear, dlMonth - 1, 1).toISOString();
      const endDate = new Date(dlYear, dlMonth, 0, 23, 59, 59).toISOString();

      const [expRes, incRes] = await Promise.all([
        fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/income?startDate=${startDate}&endDate=${endDate}`),
      ]);

      const [expData, incData] = await Promise.all([expRes.json(), incRes.json()]);

      await exportMonthlyReport({
        month: dlMonth,
        year: dlYear,
        expenses: Array.isArray(expData) ? expData : [],
        incomes: Array.isArray(incData) ? incData : [],
      });

      setShowDownloadSheet(false);
      showToast("Laporan berhasil diunduh", "success");
    } catch {
      showToast("Gagal mengunduh laporan", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatAmountDisplay = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? Number(num).toLocaleString("id-ID") : "";
  };

  if (status === "loading") return null;
  if (status === "authenticated" && !session?.user?.isPengurus && session?.user?.role !== "ADMIN") return null;

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
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg whitespace-nowrap ${
              toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDownloadSheet(true)}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-xl active:scale-[0.97] transition-transform"
            title="Unduh Laporan"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl active:scale-[0.97] transition-transform shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
      </motion.div>

      {/* Summary card */}
      <motion.div variants={itemVariants} className="bg-blue-600 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-blue-200" />
          <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total Pengeluaran</p>
        </div>
        <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalFiltered)}</p>
        <p className="text-xs text-blue-200 mt-1">{filteredExpenses.length} transaksi</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-0.5 px-0.5">
          <button
            onClick={() => setFilterMonth(0)}
            className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
              filterMonth === 0 ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
            }`}
          >
            Semua
          </button>
          {MONTHS.map((m, i) => (
            <button
              key={i}
              onClick={() => setFilterMonth(i + 1)}
              className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                filterMonth === i + 1 ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="text-xs text-slate-700 font-semibold bg-slate-100 rounded-lg px-3 py-1.5 appearance-none pr-7 border-0 outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs text-slate-700 font-semibold bg-slate-100 rounded-lg px-3 py-1.5 appearance-none pr-7 border-0 outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* List */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[68px] bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-1">
              <Receipt className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-400">Belum ada pengeluaran</p>
            <p className="text-xs text-slate-300">Tap Tambah untuk input pengeluaran</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredExpenses.map((expense, index) => {
              const cat = CAT_MAP[expense.category];
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + index * 0.025, ease: EASE, duration: 0.3 }}
                  className="flex items-center gap-3 p-4"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.color || "bg-slate-100 text-slate-500"}`}>
                    <Wallet className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{expense.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat?.color || "bg-slate-100 text-slate-500"}`}>
                        {cat?.label || expense.category}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDate(expense.date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(Number(expense.amount))}</p>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => openEdit(expense)}
                        className="p-1.5 rounded-lg text-slate-300 active:bg-blue-50 active:text-blue-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(expense.id)}
                        className="p-1.5 rounded-lg text-slate-300 active:bg-red-50 active:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Bottom Sheet Form */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[55]"
              onClick={closeForm}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-md bg-white rounded-t-3xl z-[60] max-h-[92vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingExpense ? "Perbarui data pengeluaran" : "Input pengeluaran baru"}
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form body */}
              <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
                {/* Date */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Tanggal <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    className={`w-full bg-slate-50 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-800 border-0 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${
                      errors.date ? "ring-2 ring-red-400" : ""
                    }`}
                  />
                  {errors.date && <p className="text-xs text-red-500 mt-1 ml-1">{errors.date}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Kategori <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat.value })}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left transition-all active:scale-[0.97] ${
                          form.category === cat.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          form.category === cat.value ? "bg-blue-200" : cat.color.split(" ")[1].replace("text-", "bg-")
                        }`} />
                        <span className="text-xs font-semibold">{cat.label}</span>
                        {form.category === cat.value && (
                          <Check className="w-3 h-3 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  {errors.category && <p className="text-xs text-red-500 mt-1 ml-1">{errors.category}</p>}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Jumlah (Rp) <span className="text-red-400">*</span>
                  </label>
                  <div className={`flex items-center bg-slate-50 rounded-2xl px-4 transition-shadow ${
                    errors.amount ? "ring-2 ring-red-400" : "focus-within:ring-2 focus-within:ring-blue-500"
                  }`}>
                    <span className="text-sm font-bold text-slate-400 mr-2">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatAmountDisplay(form.amount)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setForm({ ...form, amount: raw });
                      }}
                      placeholder="0"
                      className="flex-1 bg-transparent py-3.5 text-sm font-semibold text-slate-800 border-0 outline-none placeholder:text-slate-300"
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-red-500 mt-1 ml-1">{errors.amount}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Deskripsi <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Contoh: Bayar tukang pagar blok A"
                    maxLength={200}
                    className={`w-full bg-slate-50 rounded-2xl px-4 py-3.5 text-sm text-slate-800 border-0 outline-none placeholder:text-slate-300 transition-shadow ${
                      errors.description ? "ring-2 ring-red-400" : "focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1 ml-1">{errors.description}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Catatan <span className="text-slate-300 font-normal normal-case">(opsional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Tambahkan catatan jika perlu..."
                    maxLength={500}
                    rows={2}
                    className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 text-sm text-slate-800 border-0 outline-none placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-shadow resize-none"
                  />
                </div>

                {/* Proof image */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Bukti <span className="text-slate-300 font-normal normal-case">(opsional)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setForm({ ...form, proofImage: e.target.files?.[0] || null })}
                  />
                  {form.proofImage ? (
                    <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-700 truncate">{form.proofImage.name}</p>
                        <p className="text-xs text-emerald-500">{(form.proofImage.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={() => { setForm({ ...form, proofImage: null }); if (fileRef.current) fileRef.current.value = ""; }}
                        className="text-emerald-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : editingExpense?.proofImagePath ? (
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <ImagePlus className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500">Sudah ada foto bukti</p>
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="text-xs text-blue-600 font-semibold"
                        >
                          Ganti foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-400 font-medium active:bg-slate-100 transition-colors"
                    >
                      <ImagePlus className="w-5 h-5" />
                      Upload foto bukti
                    </button>
                  )}
                </div>

              </div>

              {/* Submit button — pinned outside scroll area */}
              <div className="flex-shrink-0 px-5 pt-3 pb-6 border-t border-slate-100">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingExpense ? "Simpan Perubahan" : "Tambah Pengeluaran"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Download Report Sheet */}
      <AnimatePresence>
        {showDownloadSheet && (
          <>
            <motion.div
              key="dl-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[55]"
              onClick={() => setShowDownloadSheet(false)}
            />
            <motion.div
              key="dl-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-md bg-white rounded-t-3xl z-[60]"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              <div className="px-5 py-3 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Unduh Laporan</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Laporan keuangan format XLSX</p>
                  </div>
                  <button
                    onClick={() => setShowDownloadSheet(false)}
                    className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Month picker */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bulan</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {MONTHS.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setDlMonth(i + 1)}
                      className={`py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-[0.97] ${
                        dlMonth === i + 1
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Year picker */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tahun</p>
                <div className="flex gap-2 mb-6">
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      onClick={() => setDlYear(y)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] ${
                        dlYear === y
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2.5 bg-blue-50 rounded-2xl px-4 py-3 mb-5">
                  <Receipt className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Laporan akan berisi <span className="font-bold">Ringkasan</span>, <span className="font-bold">Pengeluaran</span>, dan <span className="font-bold">Pemasukan</span> dalam 3 sheet terpisah.
                  </p>
                </div>

                <button
                  onClick={handleDownloadReport}
                  disabled={isDownloading}
                  className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 shadow-sm"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengunduh...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Unduh Laporan {MONTHS[dlMonth - 1]} {dlYear}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              key="del-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[55]"
              onClick={() => setDeleteConfirmId(null)}
            />
            <motion.div
              key="del-dialog"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-[60] flex items-center justify-center px-6"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Hapus Pengeluaran?</h3>
                <p className="text-sm text-slate-500 mb-5">Data ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600 active:scale-[0.97] transition-transform"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold active:scale-[0.97] transition-transform"
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
