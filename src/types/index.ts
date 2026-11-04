export type Role = 'Admin' | 'Manager' | 'Staff' | 'Consignor' | 'Customer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: Role[];
}

export interface AuthResponse {
  accessToken: string;
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
