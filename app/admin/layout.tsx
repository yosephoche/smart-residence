"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-client";
import AdminSidebar from "@/components/layouts/AdminSidebar";
import AdminHeader from "@/components/layouts/AdminHeader";
import AdminBottomNav from "@/components/layouts/AdminBottomNav";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/layouts/AuthGuard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== "ADMIN") {
        router.push("/user/dashboard");
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

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar — always visible md+ */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar — AnimatePresence slide-in */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <m.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[55] md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar panel */}
            <m.div
              key="sidebar-panel"
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-screen z-[60] md:hidden"
            >
              <AdminSidebar onClose={() => setSidebarOpen(false)} />
            </m.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
        <AdminHeader />

        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <AdminBottomNav onMoreClick={() => setSidebarOpen(true)} moreActive={sidebarOpen} />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthGuard>
  );
}
