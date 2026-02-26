"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Home, User, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";
import { Pagination } from "@/components/ui/Table";

interface HouseWithStatus {
  id: string;
  houseNumber: string;
  block: string;
  houseType: {
    typeName: string;
    price: number;
  };
  user: {
    name: string;
    email: string;
  };
  paymentStatus: "PENDING" | "APPROVED" | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
} as const;

export default function UnpaidResidentsPage() {
  const [allHouses, setAllHouses] = useState<HouseWithStatus[]>([]);
  const [filteredUnpaid, setFilteredUnpaid] = useState<HouseWithStatus[]>([]);
  const [filteredPaid, setFilteredPaid] = useState<HouseWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");

  useEffect(() => {
    fetchHouseStatus();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const matchesQuery = (item: HouseWithStatus) => {
      if (!query) return true;
      return (
        item.houseNumber.toLowerCase().includes(query) ||
        item.block.toLowerCase().includes(query) ||
        item.user.name.toLowerCase().includes(query) ||
        item.user.email.toLowerCase().includes(query)
      );
    };
    const filtered = allHouses.filter(matchesQuery);
    setFilteredUnpaid(filtered.filter((h) => h.paymentStatus !== "APPROVED"));
    setFilteredPaid(filtered.filter((h) => h.paymentStatus === "APPROVED"));
  }, [searchQuery, allHouses]);

  const fetchHouseStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const res = await fetch(`/api/payments/house-status?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch house payment status");
      const data: HouseWithStatus[] = await res.json();
      setAllHouses(data);
    } catch (err: any) {
      console.error("Failed to fetch house status:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const activeList = activeTab === "unpaid" ? filteredUnpaid : filteredPaid;

  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(activeList, {
    initialPageSize: 10,
    resetDeps: [searchQuery, activeTab],
  });

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-2">Gagal Memuat Data</p>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchHouseStatus}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-2xl active:scale-[0.98] transition-transform duration-150"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Title */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Pembayaran IPL Warga</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Status pembayaran IPL penghuni bulan ini
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={itemVariants} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nomor rumah, blok, atau nama..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
        />
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        <div className="flex">
          {/* Belum Bayar Tab */}
          <button
            onClick={() => setActiveTab("unpaid")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors border-b-2 ${
              activeTab === "unpaid"
                ? "border-amber-500 bg-amber-50"
                : "border-transparent"
            }`}
          >
            <AlertCircle
              className={`w-4 h-4 ${
                activeTab === "unpaid" ? "text-amber-500" : "text-slate-400"
              }`}
            />
            <div className="text-left">
              <p
                className={`text-sm font-semibold ${
                  activeTab === "unpaid" ? "text-amber-700" : "text-slate-500"
                }`}
              >
                {filteredUnpaid.length}
              </p>
              <p
                className={`text-xs ${
                  activeTab === "unpaid" ? "text-amber-600" : "text-slate-400"
                }`}
              >
                Belum Bayar
              </p>
            </div>
          </button>

          <div className="w-px bg-slate-100 my-2" />

          {/* Sudah Bayar Tab */}
          <button
            onClick={() => setActiveTab("paid")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors border-b-2 ${
              activeTab === "paid"
                ? "border-emerald-500 bg-emerald-50"
                : "border-transparent"
            }`}
          >
            <CheckCircle
              className={`w-4 h-4 ${
                activeTab === "paid" ? "text-emerald-500" : "text-slate-400"
              }`}
            />
            <div className="text-left">
              <p
                className={`text-sm font-semibold ${
                  activeTab === "paid" ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                {filteredPaid.length}
              </p>
              <p
                className={`text-xs ${
                  activeTab === "paid" ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                Sudah Bayar
              </p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* List Section */}
      <motion.div variants={itemVariants}>
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          {activeTab === "unpaid" ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {activeTab === "unpaid" ? "Belum Bayar" : "Sudah Bayar"}
          </p>
          <span className="ml-auto text-xs text-slate-400">{totalItems} penghuni</span>
        </div>

        {/* Cards */}
        {paginatedData.length > 0 ? (
          <div className="space-y-3">
            {paginatedData.map((item, index) => {
              const isUnpaid = activeTab === "unpaid";
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.04 }}
                  className={`bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] border p-4 ${
                    isUnpaid ? "border-amber-100" : "border-emerald-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isUnpaid ? "bg-amber-50" : "bg-emerald-50"
                        }`}
                      >
                        <Home
                          className={`w-5 h-5 ${
                            isUnpaid ? "text-amber-600" : "text-emerald-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Rumah {item.houseNumber}
                        </p>
                        <p className="text-sm text-slate-400">Blok {item.block}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isUnpaid
                          ? "bg-amber-50 text-amber-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {isUnpaid
                        ? item.paymentStatus === "PENDING"
                          ? "Menunggu"
                          : "Belum Bayar"
                        : "Sudah Bayar"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pl-13">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.user.name}
                        </p>
                        <p className="text-xs text-slate-400">{item.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-sm text-slate-700">{item.houseType.typeName}</p>
                        <p className="text-xs font-medium text-slate-800">
                          {formatCurrency(item.houseType.price)}/bulan
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-8 text-center">
            {searchQuery ? (
              <>
                <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-medium mb-1">Tidak ada hasil</p>
                <p className="text-sm text-slate-400">Coba kata kunci lain</p>
              </>
            ) : activeTab === "unpaid" ? (
              <>
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-slate-900 font-medium mb-1">
                  Semua penghuni sudah bayar!
                </p>
                <p className="text-sm text-slate-400">
                  Tidak ada tagihan yang belum dibayar
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-slate-600 font-medium mb-1">
                  Belum ada yang membayar bulan ini
                </p>
                <p className="text-sm text-slate-400">
                  Data akan muncul setelah ada pembayaran yang disetujui
                </p>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {paginatedData.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              totalItems={totalItems}
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
