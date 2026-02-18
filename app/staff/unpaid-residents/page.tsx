"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Home, User, DollarSign, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";

interface UnpaidHouse {
  house: {
    houseNumber: string;
    block: string;
    houseType: {
      typeName: string;
      price: number;
    };
  };
  user: {
    name: string;
    email: string;
  };
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
  const [unpaidHouses, setUnpaidHouses] = useState<UnpaidHouse[]>([]);
  const [filteredHouses, setFilteredHouses] = useState<UnpaidHouse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUnpaidHouses();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredHouses(unpaidHouses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = unpaidHouses.filter((item) => {
      const houseNumber = item.house.houseNumber.toLowerCase();
      const block = item.house.block.toLowerCase();
      const userName = item.user.name.toLowerCase();
      const email = item.user.email.toLowerCase();

      return (
        houseNumber.includes(query) ||
        block.includes(query) ||
        userName.includes(query) ||
        email.includes(query)
      );
    });

    setFilteredHouses(filtered);
  }, [searchQuery, unpaidHouses]);

  const fetchUnpaidHouses = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/payments/unpaid-this-month");

      if (!res.ok) {
        throw new Error("Failed to fetch unpaid residents");
      }

      const data = await res.json();
      setUnpaidHouses(data);
      setFilteredHouses(data);
    } catch (err: any) {
      console.error("Failed to fetch unpaid houses:", err);
      setError(err.message || "Failed to load unpaid residents");
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
            onClick={fetchUnpaidHouses}
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
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Penghuni Belum Bayar</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Penghuni yang belum bayar bulan ini
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

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="bg-amber-50 border border-amber-100 rounded-2xl p-3"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              {filteredHouses.length} {filteredHouses.length === 1 ? "Penghuni" : "Penghuni"} Belum Bayar
            </p>
            <p className="text-xs text-amber-700">
              {searchQuery ? "Hasil pencarian" : "Total bulan ini"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Unpaid List */}
      {filteredHouses.length > 0 ? (
        <motion.div variants={itemVariants} className="space-y-3">
          {filteredHouses.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.04 }}
              className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] border border-amber-100 p-4"
            >
              {/* House Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Home className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Rumah {item.house.houseNumber}
                    </p>
                    <p className="text-sm text-slate-400">Blok {item.house.block}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                  Belum Bayar
                </span>
              </div>

              {/* Resident Info */}
              <div className="grid grid-cols-1 gap-2 pl-13">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.user.name}</p>
                    <p className="text-xs text-slate-400">{item.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-700">
                      {item.house.houseType.typeName}
                    </p>
                    <p className="text-xs font-medium text-slate-800">
                      {formatCurrency(item.house.houseType.price)}/bulan
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-12 text-center"
        >
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Tidak ada hasil</p>
              <p className="text-sm text-slate-400">
                Coba kata kunci lain
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-slate-900 font-medium mb-1">Semua Sudah Bayar!</p>
              <p className="text-sm text-slate-400">
                Semua penghuni sudah membayar bulan ini
              </p>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
