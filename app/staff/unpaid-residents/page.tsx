"use client";

import { useEffect, useState } from "react";
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unpaid residents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-2">Failed to Load Data</p>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchUnpaidHouses}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unpaid Residents</h1>
        <p className="text-sm text-gray-600 mt-1">
          Residents who haven&apos;t paid this month
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by house number, block, or resident name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
        />
      </div>

      {/* Stats */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              {filteredHouses.length} {filteredHouses.length === 1 ? "Resident" : "Residents"} Unpaid
            </p>
            <p className="text-xs text-amber-700">
              {searchQuery ? "Matching search" : "Total for this month"}
            </p>
          </div>
        </div>
      </div>

      {/* Unpaid List */}
      {filteredHouses.length > 0 ? (
        <div className="space-y-3">
          {filteredHouses.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border-2 border-amber-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* House Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      House {item.house.houseNumber}
                    </p>
                    <p className="text-sm text-gray-600">Block {item.house.block}</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  Unpaid
                </span>
              </div>

              {/* Resident Info */}
              <div className="grid grid-cols-1 gap-2 pl-13">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
                    <p className="text-xs text-gray-500">{item.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-700">
                      {item.house.houseType.typeName}
                    </p>
                    <p className="text-xs font-medium text-gray-900">
                      {formatCurrency(item.house.houseType.price)}/month
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No results found</p>
              <p className="text-sm text-gray-500">
                Try a different search term
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-medium mb-1">All Paid!</p>
              <p className="text-sm text-gray-500">
                All residents have paid for this month
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
