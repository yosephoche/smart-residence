"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import {
  Home,
  Users,
  Building2,
  Tag,
  CreditCard,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserCheck,
  Clock,
  FileText,
  CalendarDays,
  ClipboardList,
  Phone,
  CalendarRange,
  MessageSquare,
} from "lucide-react";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

interface NavItemBase {
  name: string;
  icon: React.ReactNode;
}

interface NavLink extends NavItemBase {
  type: "item";
  href: string;
}

interface NavGroup extends NavItemBase {
  type: "group";
  children: {
    name: string;
    href: string;
    icon: React.ReactNode;
  }[];
}

type NavConfig = (NavLink | NavGroup)[];

const STORAGE_KEY = "admin-sidebar-expanded-groups";

export default function AdminSidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const navConfig: NavConfig = [
    {
      type: "item",
      name: t('navigation.admin.dashboard'),
      href: "/admin/dashboard",
      icon: <Home className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.users'),
      href: "/admin/users",
      icon: <Users className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.houses'),
      href: "/admin/houses",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.house_types'),
      href: "/admin/house-types",
      icon: <Tag className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.payments'),
      href: "/admin/payments",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      type: "group",
      name: t('navigation.admin.transactions'),
      icon: <ArrowRightLeft className="w-5 h-5" />,
      children: [
        {
          name: t('navigation.admin.income'),
          href: "/admin/income",
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          name: t('navigation.admin.expenses'),
          href: "/admin/expenses",
          icon: <TrendingDown className="w-4 h-4" />,
        },
      ],
    },
    {
      type: "group",
      name: t('navigation.admin.staff_management'),
      icon: <UserCheck className="w-5 h-5" />,
      children: [
        {
          name: t('navigation.admin.attendance'),
          href: "/admin/staff/attendance",
          icon: <Clock className="w-4 h-4" />,
        },
        {
          name: t('navigation.admin.shift_reports'),
          href: "/admin/staff/reports",
          icon: <FileText className="w-4 h-4" />,
        },
        {
          name: t('navigation.admin.shift_templates'),
          href: "/admin/staff/shifts",
          icon: <ClipboardList className="w-4 h-4" />,
        },
        {
          name: t('navigation.admin.schedule'),
          href: "/admin/staff/schedule",
          icon: <CalendarDays className="w-4 h-4" />,
        },
        {
          name: t('navigation.admin.leave_requests'),
          href: "/admin/staff/leave",
          icon: <CalendarRange className="w-4 h-4" />,
        },
      ],
    },
    {
      type: "item",
      name: t('navigation.admin.urgent_contacts'),
      href: "/admin/urgent-contacts",
      icon: <Phone className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.submissions'),
      href: "/admin/submissions",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      type: "item",
      name: t('navigation.admin.settings'),
      href: "/admin/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  // Load expanded groups from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setExpandedGroups(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error("Failed to load sidebar state:", error);
    }
  }, []);

  // Save expanded groups to localStorage
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (error) {
        console.error("Failed to save sidebar state:", error);
      }
      return next;
    });
  };

  // Check if any child in group is active
  const isGroupActive = (group: NavGroup) => {
    return group.children.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + "/")
    );
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">SmartResidence</h1>
            <p className="text-xs text-slate-400">{t('navigation.admin.admin_panel')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navConfig.map((item) => {
          if (item.type === "item") {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          }

          // Group rendering
          const isExpanded = expandedGroups.has(item.name);
          const isActive = isGroupActive(item);

          return (
            <div key={item.name} className="space-y-1">
              <button
                onClick={() => toggleGroup(item.name)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                {item.icon}
                <span className="flex-1 text-left">{item.name}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-2 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive =
                      pathname === child.href || pathname.startsWith(child.href + "/");

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                          isChildActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                        )}
                      >
                        {child.icon}
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-slate-200 font-semibold text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="px-2">
          <LanguageSwitcher />
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-slate-200 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('common.actions.logout')}
        </button>
      </div>
    </aside>
  );
}
