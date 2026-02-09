"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-client";
import UserNavbar from "@/components/layouts/UserNavbar";
import Loading from "@/components/ui/Loading";
import AuthGuard from "@/components/layouts/AuthGuard";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
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
