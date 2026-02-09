"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import { validateUserCredentials, findUserById, updateUserPassword } from "./users";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("mock_user_id");
    if (storedUserId) {
      const foundUser = findUserById(storedUserId);
      if (foundUser) {
        setUser(foundUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const validatedUser = validateUserCredentials(email, password);

    if (!validatedUser) {
      return { success: false, error: "Invalid email or password" };
    }

    // Store user ID in localStorage
    localStorage.setItem("mock_user_id", validatedUser.id);
    setUser(validatedUser);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem("mock_user_id");
    setUser(null);
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify old password
    if (user.password !== oldPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Update password
    const success = updateUserPassword(user.id, newPassword);

    if (!success) {
      return { success: false, error: "Failed to update password" };
    }

    // Update local user state
    const updatedUser = findUserById(user.id);
    if (updatedUser) {
      setUser(updatedUser);
    }

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
