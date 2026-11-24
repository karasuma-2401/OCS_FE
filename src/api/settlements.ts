import { apiClient } from './client';
import { storageApi } from './storageApi';

export type SettlementEligibilityKind =
  | 'ReadyFinal'
  | 'ReadyInterim'
  | 'OpenPayout'
  | 'Blocked'
  | 'SettledOrEmpty'
  | 'Cancelled';

export interface SettlementContract {
  contractId: string; contractNumber: string; customerName: string | null;
  customerPhone: string | null; bankCode: string | null; bankAccountNumber: string | null;
  bankAccountHolder: string | null; productCount: number; soldProductCount: number; contractStatus: string;
  endsAt?: string; activeProductCount?: number; compensatedProductCount?: number; approvedIncidentCount?: number;
  unsettledSalesNetAmount?: number; unsettledCompensationAmount?: number; eligiblePayoutAmount?: number;
  openPayoutId?: string | null; openPayoutNumber?: string | null;
  openPayoutStatus?: Payout['status'] | null; openPayoutAmount?: number | null;
  blockReason?: string | null;
  eligibilityKind?: SettlementEligibilityKind | null;
  eligibilityReason?: string | null;
  otherProductCount?: number;
  completedPayoutCount?: number;
  completedPayoutAmount?: number;
  eligibilityFactors?: string[];
}
export interface SettlementLine {
  type: 'SaleProceeds' | 'Commission' | 'Compensation' | 'ServiceFee';
  description: string; amount: number; productId: string | null; incidentReportId: string | null;
}
export interface SettlementPreview {
  contractId: string; contractNumber: string; customerName: string | null;
  lines: SettlementLine[]; totalAmount: number; blockReason: string | null;
  customerPhone?: string | null; bankCode?: string | null; bankAccountNumber?: string | null; bankAccountHolder?: string | null;
  endsAt?: string | null;
  deferredLines?: SettlementLine[];
  deferredAmount?: number;
  openPayoutId?: string | null; openPayoutNumber?: string | null;
  openPayoutStatus?: Payout['status'] | null; openPayoutAmount?: number | null;
  isCompensationOnly?: boolean;
  isMidTerm?: boolean;
  eligibilityKind?: SettlementEligibilityKind | null;
  eligibilityReason?: string | null;
  totalProductCount?: number;
  soldProductCount?: number;
  activeProductCount?: number;
  compensatedProductCount?: number;
  otherProductCount?: number;
  completedPayoutCount?: number;
  completedPayoutAmount?: number;
  eligibilityFactors?: string[];
}
export interface Payout {
  id: string; payoutNumber: string; contractId: string; contractNumber: string;
  customerName: string | null; customerPhone: string | null; bankCode: string | null;
  bankAccountNumber: string | null; bankAccountHolder: string | null; totalAmount: number;
  status: 'Pending' | 'Approved' | 'Transferred' | 'Completed' | 'Rejected'; proofUrl: string | null;
  bankTransactionReference: string | null; createdAt: string; approvedAt: string | null;
  transferredAt: string | null; customerConfirmedAt: string | null; completedAt: string | null;
  lines: SettlementLine[]; createdByEmployeeId: string | null; approvedByEmployeeId: string | null;
  rejectedByEmployeeId: string | null; rejectedAt: string | null; rejectionReason: string | null;
  createdByName: string | null; approvedByName: string | null; rejectedByName: string | null;
}

export interface PayoutHistory {
  action: string; changes: string; reason: string | null; actorAccountId: string | null; actorName: string | null; occurredAt: string;
}

export const settlementsApi = {
  async contracts() { return (await apiClient.get<SettlementContract[]>('/settlements/contracts')).data; },
  async preview(contractId: string) { return (await apiClient.get<SettlementPreview>(`/settlements/contracts/${encodeURIComponent(contractId)}/preview`)).data; },
  async create(contractId: string, serviceFee: number, serviceFeeDescription: string) {
    return (await apiClient.post<Payout>(`/settlements/contracts/${encodeURIComponent(contractId)}/payouts`, { serviceFee, serviceFeeDescription })).data;
  },
  async payouts() { return (await apiClient.get<Payout[]>('/settlements/payouts')).data; },
  async payout(id: string) { return (await apiClient.get<Payout>(`/settlements/payouts/${encodeURIComponent(id)}`)).data; },
  async history(id: string) { return (await apiClient.get<PayoutHistory[]>(`/settlements/payouts/${encodeURIComponent(id)}/history`)).data; },
  async approve(id: string) { return (await apiClient.post<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/approve`)).data; },
  async reject(id: string, reason: string) { return (await apiClient.post<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/reject`, { reason })).data; },
  async updatePayment(id: string, bankCode: string, bankAccountNumber: string, bankAccountHolder: string, reason: string) {
    return (await apiClient.put<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/payment`, { bankCode, bankAccountNumber, bankAccountHolder, reason })).data;
  },
  async updateServiceFee(id: string, serviceFee: number, description: string, reason: string) {
    return (await apiClient.put<Payout>(`/settlements/payouts/${encodeURIComponent(id)}/service-fee`, { serviceFee, description, reason })).data;
  },
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
