import { apiClient } from './client';
import type { VietQrPaymentSession } from '@/types';

export type WithdrawalVietQrSession = Omit<VietQrPaymentSession, 'saleInvoiceId' | 'invoiceNumber' | 'invoicePaymentStatus'> & {
  earlyWithdrawalId: string;
  requestNumber: string;
  paymentStatus: VietQrPaymentSession['invoicePaymentStatus'];
};

// Adapt only the view contract of the existing POS modal. The API/ledger use a withdrawal ID,
// never create a sale invoice, and never report a cash receipt as a successful QR transaction.
function forModal(session: WithdrawalVietQrSession): VietQrPaymentSession {
  const { earlyWithdrawalId, requestNumber, paymentStatus, ...payment } = session;
  return { ...payment, saleInvoiceId: earlyWithdrawalId, invoiceNumber: requestNumber,
    invoicePaymentStatus: session.status === 'Success' ? paymentStatus : 'Unpaid' };
}

export function withdrawalPaymentApi(withdrawalId: string) {
  const path = `/early-withdrawals/${encodeURIComponent(withdrawalId)}/payment/vietqr`;
  return {
    async initiateVietQr(_id: string, forceNew = false) {
      return forModal((await apiClient.post<WithdrawalVietQrSession>(path, { forceNew })).data);
    },
    async getVietQrStatus(transactionId: string, signal?: AbortSignal) {
      return forModal((await apiClient.get<WithdrawalVietQrSession>(`${path}/${encodeURIComponent(transactionId)}`, { signal })).data);
    },
  };
}
