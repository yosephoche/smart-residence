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
  Phone
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

export default function AdminSidebar() {
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
    <aside className="w-64 bg-white border-r-2 border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg tracking-tight">SmartResidence</h1>
            <p className="text-xs text-gray-500">{t('navigation.admin.admin_panel')}</p>
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
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
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
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                          isChildActive
                            ? "bg-primary-600 text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
      <div className="p-4 border-t-2 border-gray-200 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="px-2">
          <LanguageSwitcher />
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('common.actions.logout')}
        </button>
      </div>
    </aside>
  );
}
