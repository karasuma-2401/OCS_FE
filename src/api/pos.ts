import { apiClient, resolveApiAssetUrl, API_BASE_URL } from './client';
import type { VietQrPaymentSession } from '../types';

export interface PosProductLookupDto {
  id: string;
  barcode: string;
  name: string;
  size?: string;
  listedPrice: number;
  status: string;
  canAddToCart: boolean;
  rejectionReason?: string | null;
  categoryName?: string | null;
  brandName?: string | null;
  imageUrl?: string | null;
}

export interface PosCashPaymentRequest {
  productIds: string[];
  cashGiven: number;
}

export interface PosVietQrCheckoutRequest {
  productIds: string[];
  forceNew?: boolean;
}

export interface PosInvoiceItemDto {
  productId: string;
  barcode: string;
  name: string;
  price: number;
}

export interface PosCashPaymentResponse {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  cashGiven: number;
  changeAmount: number;
  createdAt: string;
  items: PosInvoiceItemDto[];
}

export interface PosInvoiceItemDetailDto {
  productId: string;
  barcode: string;
  name: string;
  size?: string;
  brandName?: string | null;
  categoryName?: string | null;
  price: number;
}

export interface PosInvoiceDetailDto {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  cashierName?: string | null;
  paymentMethod?: string | null;
  cashGiven?: number | null;
  changeAmount?: number | null;
  items: PosInvoiceItemDetailDto[];
}

export const posApi = {
  lookupProduct: async (identifier: string, signal?: AbortSignal): Promise<PosProductLookupDto> => {
    const trimmed = identifier.trim();
    const response = await apiClient.get<PosProductLookupDto>(
      `/pos/lookup/${encodeURIComponent(trimmed)}`,
      { signal }
    );
    const data = response.data;
    if (data && data.imageUrl) {
      data.imageUrl = resolveApiAssetUrl(data.imageUrl) ?? data.imageUrl;
    }
    return data;
  },

  checkoutCash: async (request: PosCashPaymentRequest): Promise<PosCashPaymentResponse> => {
    const response = await apiClient.post<PosCashPaymentResponse>(
      '/pos/checkout/cash',
      request
    );
    return response.data;
  },

  checkoutVietQr: async (request: PosVietQrCheckoutRequest): Promise<VietQrPaymentSession> => {
    const response = await apiClient.post<VietQrPaymentSession>(
      '/pos/checkout/vietqr',
      request
    );
    return response.data;
  },

  getInvoiceDetail: async (invoiceIdOrNumber: string, signal?: AbortSignal): Promise<PosInvoiceDetailDto> => {
    const trimmed = invoiceIdOrNumber.trim();
    const response = await apiClient.get<PosInvoiceDetailDto>(
      `/pos/invoices/${encodeURIComponent(trimmed)}`,
      { signal }
    );
    return response.data;
  },

  getInvoicePdfUrl: (invoiceIdOrNumber: string): string => {
    const trimmed = invoiceIdOrNumber.trim();
    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}/pos/invoices/${encodeURIComponent(trimmed)}/pdf`;
  },

  downloadInvoicePdf: async (invoiceIdOrNumber: string): Promise<Blob> => {
    const trimmed = invoiceIdOrNumber.trim();
    const response = await apiClient.get<Blob>(
      `/pos/invoices/${encodeURIComponent(trimmed)}/pdf`,
      { responseType: 'blob' }
    );
    return response.data;
  },
};
