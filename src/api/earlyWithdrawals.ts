import { apiClient } from './client';
import type { PagedResponse } from './products';

export interface WithdrawalFilters { page: number; pageSize: number; q?: string; status?: string; paymentStatus?: string; sort?: string }
export interface WithdrawalSummary { totalCount: number; pendingCount: number; approvedCount: number; completedCount: number; rejectedCount: number }

export type WithdrawalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed' | 'Legacy';
export interface WithdrawalItem {
  productId: string; name: string; contractId: string | null; contractNumber: string | null;
  listedPrice: number; penaltyRate: number; penaltyAmount: number;
}
export interface EligibleWithdrawalProduct {
  productId: string; name: string; barcode: string; contractId: string; contractNumber: string;
  endsAt: string; listedPrice: number; penaltyRate: number; penaltyAmount: number;
}
export interface EarlyWithdrawal {
  id: string; customerId: string; customerName: string | null; customerPhone: string | null;
  status: WithdrawalStatus; reason: string; totalPenaltyAmount: number;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid'; requestedAt: string;
  processedByEmployeeId: string | null; approvedAt: string | null; decisionNote: string | null;
  paidAt: string | null; paidByEmployeeId: string | null; handedOverAt: string | null;
  handedOverByEmployeeId: string | null; handoverEvidence: string | null; items: WithdrawalItem[];
}
export interface WithdrawalPayment { amount: number; paymentMethod: 'Cash' | 'BankTransfer'; reference?: string }
const customerPath = '/customers/me/early-withdrawals';
const staffPath = '/early-withdrawals';
const pathFor = (customer: boolean) => customer ? customerPath : staffPath;
export const earlyWithdrawalsApi = {
  async summary(customer: boolean, signal?: AbortSignal) {
    return (await apiClient.get<WithdrawalSummary>(`${pathFor(customer)}/summary`, { signal })).data;
  },
  async search(customer: boolean, params: WithdrawalFilters, signal?: AbortSignal) {
    return (await apiClient.get<PagedResponse<EarlyWithdrawal>>(`${pathFor(customer)}/search`, { params, signal })).data;
  },
  async eligible(signal?: AbortSignal) {
    return (await apiClient.get<EligibleWithdrawalProduct[]>(`${customerPath}/eligible-products`, { signal })).data;
  },
  async list(customer: boolean, page: number, pageSize = 20, signal?: AbortSignal) {
    return (await apiClient.get<EarlyWithdrawal[]>(pathFor(customer), { params: { page, pageSize }, signal })).data;
  },
  async detail(customer: boolean, id: string, signal?: AbortSignal) {
    return (await apiClient.get<EarlyWithdrawal>(`${pathFor(customer)}/${encodeURIComponent(id)}`, { signal })).data;
  },
  async create(productIds: string[], reason: string) {
    return (await apiClient.post<EarlyWithdrawal>(customerPath, { productIds, reason })).data;
  },
  async cancel(id: string) {
    return (await apiClient.post<EarlyWithdrawal>(`${customerPath}/${encodeURIComponent(id)}/cancel`)).data;
  },
  async approve(id: string) {
    return (await apiClient.post<EarlyWithdrawal>(`${staffPath}/${encodeURIComponent(id)}/approve`)).data;
  },
  async reject(id: string, note: string) {
    return (await apiClient.post<EarlyWithdrawal>(`${staffPath}/${encodeURIComponent(id)}/reject`, { note })).data;
  },
  async pay(id: string, payment: WithdrawalPayment) {
    return (await apiClient.post<EarlyWithdrawal>(`${staffPath}/${encodeURIComponent(id)}/payment`, payment)).data;
  },
  async handover(id: string, evidence: string) {
    return (await apiClient.post<EarlyWithdrawal>(`${staffPath}/${encodeURIComponent(id)}/handover`, { evidence })).data;
  },
};
