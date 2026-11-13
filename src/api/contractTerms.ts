import { apiClient } from './client';

export interface ContractTermsRequest {
  id: string;
  draftKey: string;
  requestedBy: string;
  requestedByName: string | null;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Used';
  decisionNote: string | null;
  version: string;
  createdAt: string;
  decidedAt: string | null;
}

export const contractTermsApi = {
  async mine(draftKey: string): Promise<ContractTermsRequest | null> {
    try { return (await apiClient.get<ContractTermsRequest>(`/contract-terms-requests/mine/${encodeURIComponent(draftKey)}`)).data; }
    catch (error: unknown) { if (typeof error === 'object' && error && 'response' in error && (error as { response?: { status?: number } }).response?.status === 404) return null; throw error; }
  },
  async request(draftKey: string, reason: string, customerPhone: string): Promise<ContractTermsRequest> {
    return (await apiClient.post<ContractTermsRequest>('/contract-terms-requests', { draftKey, reason, customerPhone })).data;
  },
  async pending(): Promise<ContractTermsRequest[]> {
    return (await apiClient.get<ContractTermsRequest[]>('/contract-terms-requests')).data;
  },
  async cancel(id: string, version: string): Promise<ContractTermsRequest> {
    return (await apiClient.post<ContractTermsRequest>(`/contract-terms-requests/${encodeURIComponent(id)}/cancel`, { version })).data;
  },
  async approve(id: string, version: string, file: File, note: string): Promise<ContractTermsRequest> {
    const data = new FormData(); data.append('file', file); data.append('version', version); data.append('note', note);
    return (await apiClient.put<ContractTermsRequest>(`/contract-terms-requests/${encodeURIComponent(id)}/approve`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  async reject(id: string, version: string, note: string): Promise<ContractTermsRequest> {
    return (await apiClient.post<ContractTermsRequest>(`/contract-terms-requests/${encodeURIComponent(id)}/reject`, { version, note })).data;
  },
};
