"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useMemo } from "react";

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  const user = useMemo(() => {
    if (!session?.user) return null;

    return {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      role: session.user.role,
      isFirstLogin: session.user.isFirstLogin,
    };
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.role,
    session?.user?.isFirstLogin,
  ]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, error: "Invalid email or password" };
    }

    return { success: true };
  };

  const logout = async () => {
    await signOut({ redirect: true, redirectTo: "/login" });
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || "Failed to change password" };
    }

    // Re-sign in to get a fresh JWT with isFirstLogin: false
    // The old JWT in the cookie still has isFirstLogin: true
    const email = session?.user?.email;
    await signOut({ redirect: false });
    await signIn("credentials", {
      email,
      password: newPassword,
      redirect: false,
    });

    return { success: true };
  };

  return { user, isLoading, login, logout, changePassword };
}
