import { apiClient } from './client';
import type { CategoryOption, BrandOption } from './consignmentApi';

export interface BuyoutInspection {
  id: string; customerId: string; name: string; size: string; description: string | null;
  conditionPercentage: number; brandId: string; categoryId: string; inspectionNotes: string;
  inspectedByEmployeeId: string; createdAt: string; available: boolean; customerName: string; brandName: string; categoryName: string;
}
export interface BuyoutCustomer { id: string; fullName: string; phoneNumber: string }
export interface Buyout {
  id: string; buyoutNumber: string; customerId: string; inspectionId: string; createdByEmployeeId: string;
  approvedByEmployeeId: string | null; status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  purchasePrice: number; listedPrice: number; version: string; createdAt: string; paidAt: string | null;
  paidByEmployeeId: string | null; rejectionReason: string | null; productId: string | null;
  productBarcode: string | null; inspection: Omit<BuyoutInspection, 'available' | 'customerName'>; customerName: string;
}
export interface InspectionRequest {
  customerId: string; name: string; size: string; description: string | null; conditionPercentage: number;
  brandId: string; categoryId: string; inspectionNotes: string; passed: true;
}
export interface PaymentRequest {
  expectedVersion: string; storageLocationId: string; paymentMethod: 'Cash' | 'BankTransfer';
  bankTransactionReference: string | null; customerAgreed: true;
}
export interface BuyoutReceipt {
  buyoutId: string; buyoutNumber: string; customerId: string; customerName: string; productName: string;
  size: string; conditionPercentage: number; purchasePrice: number; listedPrice: number; transactionId: string;
  paymentMethod: 'Cash' | 'BankTransfer'; bankTransactionReference: string | null; paidAt: string;
  paidByEmployeeId: string; paidByEmployeeName: string; productBarcode: string | null;
}

export const buyoutsApi = {
  async customers(query: string) { return (await apiClient.get<BuyoutCustomer[]>('/buyouts/customers', { params: { query: query.trim() } })).data; },
  async list(signal?: AbortSignal) { return (await apiClient.get<Buyout[]>('/buyouts', { signal })).data; },
  async detail(id: string) { return (await apiClient.get<Buyout>(`/buyouts/${encodeURIComponent(id)}`)).data; },
  async receipt(id: string) { return (await apiClient.get<BuyoutReceipt>(`/buyouts/${encodeURIComponent(id)}/receipt`)).data; },
  async inspections(customerId?: string) { return (await apiClient.get<BuyoutInspection[]>('/buyouts/inspections', { params: { customerId: customerId || undefined } })).data; },
  async inspect(input: InspectionRequest) { return (await apiClient.post<BuyoutInspection>('/buyouts/inspections', input)).data; },
  async create(inspectionId: string, purchasePrice: number, listedPrice: number) { return (await apiClient.post<Buyout>('/buyouts', { inspectionId, purchasePrice, listedPrice })).data; },
  async review(id: string, expectedVersion: string, approve: boolean, reason: string | null) { return (await apiClient.post<Buyout>(`/buyouts/${encodeURIComponent(id)}/review`, { expectedVersion, approve, reason })).data; },
  async pay(id: string, input: PaymentRequest) { return (await apiClient.post<Buyout>(`/buyouts/${encodeURIComponent(id)}/payment`, input)).data; },
  async categories() { return (await apiClient.get<CategoryOption[]>('/categories', { params: { activeOnly: true } })).data.filter(item => item.isActive !== false); },
  async brands() {
    const brands: BrandOption[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = (await apiClient.get<{ items: BrandOption[]; totalCount: number; pageSize: number }>('/brands', { params: { page, pageSize: 100 } })).data;
      brands.push(...data.items.filter(item => item.isActive));
      totalPages = Math.ceil(data.totalCount / data.pageSize);
      page++;
    } while (page <= totalPages);
    return brands;
  },
};
