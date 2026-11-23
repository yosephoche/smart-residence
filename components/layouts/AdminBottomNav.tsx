"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, motion } from "framer-motion";
import { Home, CreditCard, ArrowRightLeft, UserCheck, MoreHorizontal } from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const tabs: TabItem[] = [
  { id: "dashboard", label: "Beranda", icon: Home, href: "/admin/dashboard" },
  { id: "payments", label: "Bayar", icon: CreditCard, href: "/admin/payments" },
  { id: "finance", label: "Keuangan", icon: ArrowRightLeft, href: "/admin/income" },
  { id: "staff", label: "Staf", icon: UserCheck, href: "/admin/staff/attendance" },
];

interface AdminBottomNavProps {
  onMoreClick: () => void;
  moreActive: boolean;
}

const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ onMoreClick, moreActive }) => {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (moreActive) return "more";
    if (pathname.startsWith("/admin/income") || pathname.startsWith("/admin/expenses")) {
      return "finance";
    }
    if (pathname.startsWith("/admin/staff")) {
      return "staff";
    }
    const activeTab = tabs.find(
      (tab) => pathname === tab.href || pathname.startsWith(tab.href + "/")
    );
    return activeTab?.id ?? "more";
  };

  const activeTab = getActiveTab();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-100 safe-bottom z-50 md:hidden"
      role="tablist"
      aria-label="Navigasi admin"
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              className="relative flex flex-col items-center gap-0.5 py-1 px-2 min-w-[52px]"
            >
              {isActive && (
                <motion.div
                  layoutId="admin-tab-indicator"
                  className="absolute -top-2 left-0 right-0 mx-auto w-8 h-1 bg-blue-600 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <m.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  color: isActive ? "#2563EB" : "#94A3B8",
                }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Icon className="w-5 h-5" />
              </m.div>
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMoreClick}
          role="tab"
          aria-selected={activeTab === "more"}
          aria-label="Lainnya"
          className="relative flex flex-col items-center gap-0.5 py-1 px-2 min-w-[52px]"
        >
          {activeTab === "more" && (
            <motion.div
              layoutId="admin-tab-indicator"
              className="absolute -top-2 left-0 right-0 mx-auto w-8 h-1 bg-blue-600 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <m.div
            animate={{
              scale: activeTab === "more" ? 1 : 0.9,
              color: activeTab === "more" ? "#2563EB" : "#94A3B8",
            }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <MoreHorizontal className="w-5 h-5" />
          </m.div>
          <span
            className={`text-[10px] font-medium transition-colors duration-200 ${
              activeTab === "more" ? "text-blue-600" : "text-slate-400"
            }`}
          >
            Lainnya
          </span>
        </button>
      </div>

      <style jsx>{`
        .safe-bottom {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </nav>
  );
};

export default AdminBottomNav;
