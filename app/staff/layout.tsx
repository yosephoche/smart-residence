"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import StaffBottomNav from "@/components/layouts/StaffBottomNav";
import { Home, Loader2 } from "lucide-react";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (session.user.role !== "STAFF") {
      router.push("/login");
    }
  }, [session, status, router]);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "STAFF") {
    return null;
  }

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
            <div>
              <span className="text-sm font-bold text-slate-800">
                Staff Portal
              </span>
              <p className="text-[10px] text-slate-400 capitalize">
                {session.user.staffJobType?.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">
              {getInitials(session.user.name)}
            </span>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </main>

      {/* Bottom Tab Navigation */}
      <StaffBottomNav />
    </div>
  );
}
