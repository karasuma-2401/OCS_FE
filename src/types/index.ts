export type RoleCode = 'Admin' | 'Manager' | 'Staff' | 'Customer';
export type Role = RoleCode | 'Consignor';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: RoleCode[];
  permissions?: string[];
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
  challengeId?: string;
  maskedDestination?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
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

export type AppointmentStatus =
  | 'Scheduled'
  | 'CheckedIn'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow';

export interface Appointment {
  id: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlotId: string;
  timeSlotDisplay: string; // "08:00 - 09:00"
  startTime: string;
  endTime: string;
  estimatedItemCount: number;
  submissionMethod: string;
  status: AppointmentStatus;
  note?: string;
  cancellationReason?: string;
  reminderSentAt?: string;
  createdAt: string;
  canCancel: boolean;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  maxCustomers: number;
  bookedCount: number;
  availableCount: number;
  isAvailable: boolean;
}

export interface CreateAppointmentRequest {
  appointmentDate: string; // YYYY-MM-DD
  timeSlotId: string;
  estimatedItemCount: number;
  note?: string;
  submissionMethod?: number; // 0: InPerson, 1: Shipping
}

export interface CancelAppointmentRequest {
  reason?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  reason?: string;
}

export interface StartReceptionResponse {
  appointmentId: string;
  trackingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  estimatedItemCount: number;
  note?: string;
  message: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: number;
  sentAt: string;
  isRead: boolean;
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

export type VietQrTransactionStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';
export type InvoicePaymentStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface InitiateVietQrPaymentRequest {
  saleInvoiceId: string;
  forceNew?: boolean;
}

export interface VietQrPaymentSession {
  transactionId: string;
  saleInvoiceId: string;
  invoiceNumber: string;
  amount: string;
  paymentReference: string;
  transferContent: string;
  bankCode: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  qrCodeUrl: string;
  qrPayload: string;
  providerName: string;
  status: VietQrTransactionStatus;
  invoicePaymentStatus: InvoicePaymentStatus;
  isExpired: boolean;
  createdAt: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface PosPendingInvoiceSummary {
  saleInvoiceId: string;
  invoiceNumber: string;
  totalAmount: string;
  paymentStatus: InvoicePaymentStatus;
  createdAt: string;
  activeTransactionId?: string | null;
  activePaymentReference?: string | null;
  activeExpiresAt?: string | null;
}
