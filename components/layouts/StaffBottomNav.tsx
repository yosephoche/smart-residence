"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Home, Clock, FileText, User, AlertCircle } from "lucide-react";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const StaffBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Role-based tabs configuration
  const getTabsForRole = (jobType: string | undefined): TabItem[] => {
    const baseTabs = [
      {
        id: "dashboard",
        label: "Beranda",
        icon: Home,
        href: "/staff/dashboard",
      },
      {
        id: "attendance",
        label: "Absensi",
        icon: Clock,
        href: "/staff/attendance",
      },
    ];

    // Security staff sees Unpaid Residents instead of Reports
    const thirdTab = jobType === "SECURITY"
      ? {
          id: "unpaid",
          label: "Penghuni",
          icon: AlertCircle,
          href: "/staff/unpaid-residents",
        }
      : {
          id: "reports",
          label: "Laporan",
          icon: FileText,
          href: "/staff/reports",
        };

    return [
      ...baseTabs,
      thirdTab,
      {
        id: "profile",
        label: "Profil",
        icon: User,
        href: "/staff/profile",
      },
    ];
  };

  const tabs = getTabsForRole(session?.user?.staffJobType);

  const getActiveTab = () => {
    const activeTab = tabs.find((tab) => pathname === tab.href);
    return activeTab?.id || "dashboard";
  };

  const activeTab = getActiveTab();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 safe-bottom z-50"
      role="tablist"
      aria-label="Navigasi staff"
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-2">
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
              className="relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[60px]"
            >
              {isActive && (
                <motion.div
                  layoutId="staff-tab-indicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.9,
                  color: isActive ? "#2563EB" : "#94A3B8",
                }}
                transition={{
                  duration: 0.2,
                }}
                className="flex items-center justify-center"
              >
                <Icon className="w-5 h-5" />
              </motion.div>
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
      </div>

      <style jsx>{`
        .safe-bottom {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </nav>
  );
};

export default StaffBottomNav;
