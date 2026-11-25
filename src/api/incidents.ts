import { apiClient } from './client';
import { storageApi } from './storageApi';
import type { PagedResponse } from './products';

export type IncidentStatus = 'Pending' | 'NeedsRecheck' | 'Approved' | 'Compensated';
export type IncidentType = 'Lost' | 'Damaged' | 'TagSwapped';
export interface IncidentProduct {
  id: string; barcode: string; name: string; status: string; listedPrice: number;
  contractNumber: string | null; customerName: string | null; images: string[];
}
export interface IncidentAuditEvent {
  id: string; action: string; actorAccountId: string | null; actorType: string;
  reason: string | null; changes: string; occurredAt: string;
}
export interface IncidentReport {
  id: string; productId: string; productBarcode: string; productName: string;
  contractNumber: string | null; customerName: string | null; type: IncidentType;
  status: IncidentStatus; description: string; evidenceUrls: string[];
  agreedPrice: number; compensationAmount: number; createdByEmployeeId: string;
  approvedByEmployeeId: string | null; approvedByName: string | null; createdAt: string; approvedAt: string | null;
  reviewNote: string | null; history?: IncidentAuditEvent[];
  contractId?: string | null; payoutId?: string | null; payoutNumber?: string | null;
  payoutStatus?: 'Pending' | 'Approved' | 'Transferred' | 'Completed' | 'Rejected' | null;
}

const prepareEvidence = (urls: string[]) => {
  const paths = urls.map(url => storageApi.privateInspectionPath(url));
  if (paths.some(path => !path)) throw new Error('Ảnh chứng cứ phải được tải lên khu vực kiểm tra riêng tư.');
  return paths as string[];
};

export const incidentsApi = {
  async findProduct(barcode: string) {
    return (await apiClient.get<IncidentProduct>('/incidents/products/by-barcode', { params: { barcode } })).data;
  },
  async list(params: { page?: number; pageSize?: number; q?: string; status?: string } = {}) {
    return (await apiClient.get<PagedResponse<IncidentReport>>('/incidents', { params })).data;
  },
  async detail(id: string) {
    return (await apiClient.get<IncidentReport>(`/incidents/${encodeURIComponent(id)}`)).data;
  },
  async create(input: { productId: string; type: IncidentType; description: string; evidenceUrls: string[] }) {
    return (await apiClient.post<IncidentReport>('/incidents', { ...input, evidenceUrls: prepareEvidence(input.evidenceUrls) })).data;
  },
  async resubmit(id: string, input: { description: string; evidenceUrls: string[] }) {
    return (await apiClient.post<IncidentReport>(`/incidents/${encodeURIComponent(id)}/resubmit`, { ...input, evidenceUrls: prepareEvidence(input.evidenceUrls) })).data;
  },
  async approve(id: string, compensationAmount: number, note: string) {
    return (await apiClient.post<IncidentReport>(`/incidents/${encodeURIComponent(id)}/approve`, { compensationAmount, note })).data;
  },
  async requestRecheck(id: string, reason: string) {
    return (await apiClient.post<IncidentReport>(`/incidents/${encodeURIComponent(id)}/request-recheck`, { reason })).data;
  },
  async upload(file: File) {
    return storageApi.uploadImage(file, 'inspections');
  },
  async readEvidence(url: string) {
    const path = storageApi.privateInspectionRequestPath(url);
    if (!path) throw new Error('Đường dẫn ảnh chứng cứ không hợp lệ.');
    return (await apiClient.get<Blob>(path, { responseType: 'blob' })).data;
  },
};
