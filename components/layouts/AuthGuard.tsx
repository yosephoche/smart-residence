"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  return <>{children}</>;
}
