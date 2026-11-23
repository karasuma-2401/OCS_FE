import { apiClient } from './client';
import type { PagedResponse } from './products';

export interface ExpiryProduct {
  id: string; barcode: string; name: string; status: string; listedPrice: number;
  handledByEmployeeId: string | null; handledAt: string | null;
  recipientOrganization: string | null; evidence: string | null; note: string | null;
}
export interface ExpiryProcessing {
  id: string; contractId: string; contractNumber: string; customerName: string | null;
  customerPhone: string | null; endsAt: string; type: 'Return' | 'Donate';
  status: 'Pending' | 'Completed' | 'OverdueDonated'; collectionDeadline: string | null;
  recipientOrganization: string | null; evidence: string | null; note: string | null;
  confirmedAt: string | null; unclaimedApprovedAt: string | null;
  unclaimedBasis: string | null; products: ExpiryProduct[];
}
export interface DonationReceipt {
  id: string; receiptNumber: string; expiryProcessingId: string;
  contractNumber: string; customerName: string | null;
  recipientOrganization: string; evidence: string; note: string | null;
  handledByEmployeeId: string; handledAt: string;
  products: { productId: string; barcode: string; name: string; listedPrice: number }[];
}
export const expiryApi = {
  async list(params: { page: number; pageSize: number; q?: string; customerId?: string; customerQuery?: string; status?: string; type?: string; deadlineFrom?: string; deadlineTo?: string }) {
    return (await apiClient.get<PagedResponse<ExpiryProcessing>>('/expiry-processings', { params })).data;
  },
  async detail(id: string) {
    return (await apiClient.get<ExpiryProcessing>(`/expiry-processings/${encodeURIComponent(id)}`)).data;
  },
  async confirmReturn(id: string, barcodes: string[]) {
    return (await apiClient.post<ExpiryProcessing>(`/expiry-processings/${encodeURIComponent(id)}/confirm-return`, { barcodes })).data;
  },
  async confirmDonation(id: string, barcodes: string[], recipientOrganization: string, evidence: string, note: string) {
    return (await apiClient.post<ExpiryProcessing>(`/expiry-processings/${encodeURIComponent(id)}/confirm-donation`, { barcodes, recipientOrganization, evidence, note })).data;
  },
  async markUnclaimed(id: string, basis: string) {
    return (await apiClient.post<ExpiryProcessing>(`/expiry-processings/${encodeURIComponent(id)}/mark-unclaimed`, { basis })).data;
  },
  async donationReceipts(id: string) {
    return (await apiClient.get<DonationReceipt[]>(`/expiry-processings/${encodeURIComponent(id)}/donation-receipts`)).data;
  },
  async donationReceipt(id: string, receiptId: string) {
    return (await apiClient.get<DonationReceipt>(`/expiry-processings/${encodeURIComponent(id)}/donation-receipts/${encodeURIComponent(receiptId)}`)).data;
  },
};
