export type RoleCode = 'Admin' | 'Manager' | 'Staff' | 'Customer';
export type Role = RoleCode | 'Consignor';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: RoleCode[];
  username?: string | null;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  lockoutEndAt?: string;
  retryAfterSeconds?: number;
  continuationToken?: string;
  email?: string;
}

export interface CurrentUserResponse {
  user: User;
  expiresAt: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  expiresAt: string;
  expiresIn: number;
}

export interface CsrfTokenResponse {
  token: string;
  headerName?: string;
}

export interface RegisterResponse {
  challengeId: string;
  purpose: string;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
  continuationToken: string;
}

export interface VerifyOtpResponse {
  message: string;
  verifiedAt: string;
}

export interface ResendOtpResponse {
  challengeId: string;
  purpose: string;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
  continuationToken: string;
}

// Deprecated: kept temporarily for backwards compatibility with existing UI types
export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn: number;
  user: User;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  price: number;
  expectedPrice?: number;
  costPrice?: number;
  status: 'Draft' | 'Approved' | 'OnSale' | 'Sold' | 'Returned' | 'Disposed';
  category?: {
    id: string;
    name: string;
  };
  brand?: {
    id: string;
    name: string;
    tier: string;
  };
  imageUrl?: string;
  consignmentContractId?: string;
}

export interface Appointment {
  id: string;
  consignorName: string;
  consignorPhone: string;
  scheduledDate: string;
  timeSlot: string;
  expectedItemCount: number;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  note?: string;
}

export interface ConsignmentContract {
  id: string;
  contractNumber: string;
  consignorName: string;
  consignorPhone: string;
  commissionRate: number;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Active' | 'Settled' | 'Terminated';
  itemCount: number;
  totalSoldAmount: number;
  totalPayoutAmount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

