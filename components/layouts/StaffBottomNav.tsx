"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, FileText, AlertCircle, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function StaffBottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/staff/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/staff/attendance",
      label: "Attendance",
      icon: Clock,
    },
    {
      href: "/staff/reports",
      label: "Reports",
      icon: FileText,
    },
    {
      href: "/staff/unpaid-residents",
      label: "Unpaid",
      icon: AlertCircle,
    },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors ${
                active
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className={`text-xs mt-1 ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 h-full min-w-[44px] text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-6 h-6 stroke-2" />
          <span className="text-xs mt-1 font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
