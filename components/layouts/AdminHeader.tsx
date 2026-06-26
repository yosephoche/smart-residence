"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-client";
import { Bell, ChevronDown, ChevronRight, Settings, LogOut } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Pengguna",
  "/admin/houses": "Rumah",
  "/admin/house-types": "Tipe Rumah",
  "/admin/payments": "Pembayaran",
  "/admin/income": "Pemasukan",
  "/admin/expenses": "Pengeluaran",
  "/admin/settings": "Pengaturan",
  "/admin/urgent-contacts": "Kontak Darurat",
  "/admin/submissions": "Pengajuan",
  "/admin/staff/attendance": "Absensi Staf",
  "/admin/staff/reports": "Laporan Shift",
  "/admin/staff/shifts": "Template Shift",
  "/admin/staff/schedule": "Jadwal",
  "/admin/staff/leave": "Cuti Staf",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match (for nested routes like /admin/users/123)
  const match = Object.keys(PAGE_TITLES).find((key) => pathname.startsWith(key + "/"));
  return match ? PAGE_TITLES[match] : "Admin";
}

export default function AdminHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "A";

  useEffect(() => {
    fetch("/api/payments/stats")
      .then((r) => r.json())
      .then((data) => setPendingCount(data.pending ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-400 font-medium">Admin</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-700">{pageTitle}</span>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Link
          href="/admin/payments"
          className="relative w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
          title={`${pendingCount} pembayaran menunggu`}
        >
          <Bell className="w-4.5 h-4.5 text-slate-500" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </Link>

        {/* Avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">{initials}</span>
            </div>
            <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate hidden sm:block">
              {user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/admin/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Pengaturan
                </Link>
              </div>
              <div className="py-1 border-t border-slate-100">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
