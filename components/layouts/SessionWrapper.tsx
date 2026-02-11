"use client";

import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={300} // 5 minutes (default is ~30 seconds)
      refetchOnWindowFocus={false} // Don't refetch when tab regains focus
    >
      {children}
    </SessionProvider>
  );
}
