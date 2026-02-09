import { User } from "@/types";

// Mock users for development (password is stored in plain text for mock purposes only)
export const mockUsers: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@smartresidence.com",
    password: "IPL2026", // Plain text for mock only
    role: "ADMIN",
    isFirstLogin: true,
    createdAt: new Date("2026-01-01").toISOString(),
    updatedAt: new Date("2026-01-01").toISOString(),
  },
  {
    id: "2",
    name: "John Doe",
    email: "john@gmail.com",
    password: "IPL2026",
    role: "USER",
    isFirstLogin: true,
    createdAt: new Date("2026-01-05").toISOString(),
    updatedAt: new Date("2026-01-05").toISOString(),
  },
  {
    id: "3",
    name: "Jane Smith",
    email: "jane@gmail.com",
    password: "password123",
    role: "USER",
    isFirstLogin: false,
    createdAt: new Date("2026-01-10").toISOString(),
    updatedAt: new Date("2026-01-10").toISOString(),
  },
  {
    id: "4",
    name: "Bob Wilson",
    email: "bob@gmail.com",
    password: "password123",
    role: "USER",
    isFirstLogin: false,
    createdAt: new Date("2026-01-15").toISOString(),
    updatedAt: new Date("2026-01-15").toISOString(),
  },
];

// Helper functions for mock user management
export function findUserByEmail(email: string): User | undefined {
  return mockUsers.find((user) => user.email === email);
}

export function findUserById(id: string): User | undefined {
  return mockUsers.find((user) => user.id === id);
}

export function validateUserCredentials(
  email: string,
  password: string
): User | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  if (user.password !== password) return null;
  return user;
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return false;

  user.password = newPassword;
  user.isFirstLogin = false;
  user.updatedAt = new Date().toISOString();
  return true;
}

export function createUser(
  name: string,
  email: string,
  role: "ADMIN" | "USER",
  password: string = "IPL2026"
): User {
  const newUser: User = {
    id: (mockUsers.length + 1).toString(),
    name,
    email,
    password,
    role,
    isFirstLogin: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);
  return newUser;
}

export function updateUser(
  userId: string,
  updates: Partial<Pick<User, "name" | "email" | "role">>
): User | null {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return null;

  Object.assign(user, updates, { updatedAt: new Date().toISOString() });
  return user;
}

export function deleteUser(userId: string): boolean {
  const index = mockUsers.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  mockUsers.splice(index, 1);
  return true;
}

export function getAllUsers(): User[] {
  return [...mockUsers];
}
