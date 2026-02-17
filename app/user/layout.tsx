"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-client";
import UserBottomNav from "@/components/layouts/UserBottomNav";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/layouts/AuthGuard";
import { Home } from "lucide-react";
import { AnimatePresence } from "framer-motion";

function UserLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect admins to admin panel
      if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user || user.role !== "USER") {
    return null;
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col max-w-md mx-auto relative">
      {/* Status Bar Spacer */}
      <div className="h-12 bg-white flex-shrink-0" />

      {/* Header */}
      <header className="bg-white px-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-800">
              IPL Manager
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {getInitials(user.name)}
            </span>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      {/* Bottom Tab Navigation */}
      <UserBottomNav />
    </div>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <UserLayoutContent>{children}</UserLayoutContent>
    </AuthGuard>
  );
}
