import { apiClient } from './client';

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
    lookupProduct: async (identifier: string): Promise<PosProductLookupDto> => {
        const response = await apiClient.get<PosProductLookupDto>(
            `/api/pos/lookup/${encodeURIComponent(identifier.trim())}`
        );
        return response.data;
    },

    checkoutCash: async (request: PosCashPaymentRequest): Promise<PosCashPaymentResponse> => {
        const response = await apiClient.post<PosCashPaymentResponse>(
            '/api/pos/checkout/cash',
            request
        );
        return response.data;
    },

    getInvoiceDetail: async (invoiceIdOrNumber: string): Promise<PosInvoiceDetailDto> => {
        const response = await apiClient.get<PosInvoiceDetailDto>(
            `/api/pos/invoices/${encodeURIComponent(invoiceIdOrNumber.trim())}`
        );
        return response.data;
    },

    getInvoicePdfUrl: (invoiceIdOrNumber: string): string => {
        return `/api/pos/invoices/${encodeURIComponent(invoiceIdOrNumber.trim())}/pdf`;
    },
};