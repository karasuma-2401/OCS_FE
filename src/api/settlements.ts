import { apiClient } from './client';
import { storageApi } from './storageApi';

export interface SettlementContract {
  contractId: string; contractNumber: string; customerName: string | null;
  customerPhone: string | null; bankCode: string | null; bankAccountNumber: string | null;
  bankAccountHolder: string | null; productCount: number; soldProductCount: number; contractStatus: string;
}
export interface SettlementLine {
  type: 'SaleProceeds' | 'Commission' | 'Compensation' | 'ServiceFee';
  description: string; amount: number; productId: string | null; incidentReportId: string | null;
}
export interface SettlementPreview {
  contractId: string; contractNumber: string; customerName: string | null;
  lines: SettlementLine[]; totalAmount: number; blockReason: string | null;
}
export interface Payout {
  id: string; payoutNumber: string; contractId: string; contractNumber: string;
  customerName: string | null; customerPhone: string | null; bankCode: string | null;
  bankAccountNumber: string | null; bankAccountHolder: string | null; totalAmount: number;
  status: 'Pending' | 'Approved' | 'Transferred' | 'Completed'; proofUrl: string | null;
  bankTransactionReference: string | null; createdAt: string; approvedAt: string | null;
  transferredAt: string | null; customerConfirmedAt: string | null; completedAt: string | null;
  lines: SettlementLine[];
}

export const settlementsApi = {
  async contracts() { return (await apiClient.get<SettlementContract[]>('/settlements/contracts')).data; },
  async preview(contractId: string) { return (await apiClient.get<SettlementPreview>(`/settlements/contracts/${encodeURIComponent(contractId)}/preview`)).data; },
  async create(contractId: string) { return (await apiClient.post<Payout>(`/settlements/contracts/${encodeURIComponent(contractId)}/payouts`)).data; },
  async payouts() { return (await apiClient.get<Payout[]>('/settlements/payouts')).data; },
  async approve(id: string) { return (await apiClient.post<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/approve`)).data; },
  async transfer(id: string, proofUrl: string, bankTransactionReference: string) {
    const proofPath = storageApi.privateInspectionPath(proofUrl);
    if (!proofPath) throw new Error('Ảnh chứng từ phải được tải lên khu vực riêng tư.');
    return (await apiClient.post<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/transfer`, { proofUrl: proofPath, bankTransactionReference })).data;
  },
  async customerPayouts() { return (await apiClient.get<Payout[]>('/customer/payouts')).data; },
  async confirmReceived(id: string) { return (await apiClient.post<Payout>(`/customer/payouts/${encodeURIComponent(id)}/confirm-received`)).data; },
  async readProof(payoutId: string, customer = false) {
    const path = customer ? `/customer/payouts/${encodeURIComponent(payoutId)}/proof` : `/settlements/payouts/${encodeURIComponent(payoutId)}/proof`;
    return (await apiClient.get<Blob>(path, { responseType: 'blob' })).data;
  },
  async readUploadedProof(url: string) {
    const path = storageApi.privateInspectionRequestPath(url);
    if (!path) throw new Error('Đường dẫn chứng từ không hợp lệ.');
    return (await apiClient.get<Blob>(path, { responseType: 'blob' })).data;
  },
  async uploadProof(file: File) { return storageApi.uploadImage(file, 'inspections'); },
};
