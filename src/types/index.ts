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

