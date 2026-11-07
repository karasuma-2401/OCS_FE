import { apiClient } from './client';
import type { PagedResponse } from './products';

export interface InventoryLocation { id: string; code: string; name: string }
export interface InventoryProduct {
  id: string; barcode: string; name: string; size: string; description: string | null;
  conditionPercentage: number; brand: string; category: string; listedPrice: number;
  sourceType: 'Consignment' | 'Buyout'; sourceReference: string | null; status: string; approvalStatus: string;
  version: string; location: InventoryLocation | null; coverImageUrl: string | null;
}
export interface InventoryDetail {
  product: InventoryProduct; agreementEvidence: string | null; agreedListedPrice: number | null;
  images: { id: string; url: string; imageType: string; sortOrder: number }[];
  history: { action: string; previousValue: string | null; newValue: string | null; reason: string | null; actorAccountId: string | null; occurredAt: string }[];
}
export interface InventoryFilters { page: number; pageSize: number; q?: string; status?: string; approval?: string; locationId?: string }

export const inventoryApi = {
  async list(params: InventoryFilters, signal?: AbortSignal) {
    return (await apiClient.get<PagedResponse<InventoryProduct>>('/inventory', { params, signal })).data;
  },
  async detail(id: string, signal?: AbortSignal) {
    return (await apiClient.get<InventoryDetail>(`/inventory/${encodeURIComponent(id)}`, { signal })).data;
  },
  async locations(signal?: AbortSignal) {
    return (await apiClient.get<InventoryLocation[]>('/inventory/locations', { signal })).data;
  },
  async createLocation(code: string, name: string) {
    return (await apiClient.post<InventoryLocation>('/inventory/locations', { code, name })).data;
  },
  async review(id: string, expectedVersion: string, approve: boolean, reason?: string, verifiedPrice?: number, agreementEvidence?: string) {
    return (await apiClient.post<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/review`, { expectedVersion, approve, reason, verifiedPrice, agreementEvidence })).data;
  },
  async resubmit(id: string, expectedVersion: string) {
    return (await apiClient.post<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/resubmit`, { expectedVersion })).data;
  },
  async offer(id: string, expectedVersion: string) {
    return (await apiClient.post<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/offer`, { expectedVersion })).data;
  },
  async changeLocation(id: string, expectedVersion: string, locationId: string) {
    return (await apiClient.put<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/location`, { expectedVersion, locationId })).data;
  },
  async changePrice(id: string, expectedVersion: string, price: number, reason: string) {
    return (await apiClient.put<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/price`, { expectedVersion, price, reason })).data;
  },
  async changeDetails(id: string, expectedVersion: string, name: string, size: string, description: string, conditionPercentage: number) {
    return (await apiClient.put<InventoryProduct>(`/inventory/${encodeURIComponent(id)}/details`, { expectedVersion, name, size, description, conditionPercentage })).data;
  },
};
