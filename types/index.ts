import { ROLES, PAYMENT_STATUS } from "@/lib/constants";

// User Types
export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  isFirstLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

// House Type
export interface HouseType {
  id: string;
  typeName: string;
  price: number;
  description?: string;
}

// House
export interface House {
  id: string;
  houseNumber: string;
  block: string;
  houseTypeId: string;
  userId?: string;
  houseType?: HouseType;
  user?: User;
}

// Payment
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export interface PaymentMonth {
  id: string;
  paymentId: string;
  year: number;
  month: number;
}

export interface Payment {
  id: string;
  userId: string;
  houseId: string;
  amountMonths: number;
  totalAmount: number;
  proofImagePath: string;
  status: PaymentStatus;
  rejectionNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  user?: User;
  house?: House;
  paymentMonths?: PaymentMonth[];
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface ChangePasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserFormData {
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface HouseFormData {
  houseNumber: string;
  block: string;
  houseTypeId: string;
  userId?: string;
}

export interface HouseTypeFormData {
  typeName: string;
  price: number;
  description?: string;
}

export interface PaymentUploadFormData {
  amountMonths: number;
  proofImage: File;
}
