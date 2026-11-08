import { apiClient } from './client';
import type {
  InitiateVietQrPaymentRequest,
  PosPendingInvoiceSummary,
  VietQrPaymentSession,
} from '../types';

export const posPaymentsApi = {
  async initiateVietQr(
    saleInvoiceId: string,
    forceNew = false,
  ): Promise<VietQrPaymentSession> {
    const payload: InitiateVietQrPaymentRequest = {
      saleInvoiceId,
      forceNew,
    };
    const response = await apiClient.post<VietQrPaymentSession>(
      '/pos/payments/vietqr',
      payload,
    );
    return response.data;
  },

  async getVietQrStatus(
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<VietQrPaymentSession> {
    const response = await apiClient.get<VietQrPaymentSession>(
      `/pos/payments/vietqr/${encodeURIComponent(transactionId)}`,
      { signal },
    );
    return response.data;
  },

  async listPendingInvoices(
    signal?: AbortSignal,
  ): Promise<PosPendingInvoiceSummary[]> {
    const response = await apiClient.get<PosPendingInvoiceSummary[]>(
      '/pos/payments/vietqr/pending-invoices',
      { signal },
    );
    return response.data;
  },
};

export const initiateVietQrPayment = posPaymentsApi.initiateVietQr;
export const getVietQrPaymentStatus = posPaymentsApi.getVietQrStatus;
export const listPendingPosInvoices = posPaymentsApi.listPendingInvoices;
