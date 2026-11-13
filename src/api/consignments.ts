import { apiClient } from './client';

export interface ConsignmentProduct {
  id: string; barcode: string; name: string; status: string; listedPrice: number;
  agreedCommissionRate: number | null; estimatedPayout: number | null;
  detailAvailable: boolean;
}
export interface ConsignmentProductDetail extends ConsignmentProduct {
  description: string | null;
  brandName: string | null;
  categoryName: string | null;
  size: string | null;
  condition: string | null;
  imageUrls: string[];
}
export interface Consignment {
  contractId: string; contractNumber: string; appointmentId: string | null;
  signedAt: string; endsAt: string; status: string; expiryHandling: string;
  products: ConsignmentProduct[]; estimatedPayout: number | null; settledAmount: number;
  contractDocument: {
    fileName: string;
    contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
    uploadedAt: string | null;
  } | null;
}
export async function getMyConsignments(): Promise<Consignment[]> {
  const response = await apiClient.get<Consignment[]>('/customers/me/consignments');
  return response.data;
}

export async function getConsignmentDocument(contractId: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/customers/me/consignments/${encodeURIComponent(contractId)}/document`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function getConsignmentProductDetail(contractId: string, productId: string): Promise<ConsignmentProductDetail> {
  const response = await apiClient.get<ConsignmentProductDetail>(`/customers/me/consignments/${encodeURIComponent(contractId)}/products/${encodeURIComponent(productId)}`);
  return response.data;
}

export async function getConsignmentProductImage(imageUrl: string): Promise<Blob> {
  if (!/^\/api\/customers\/me\/consignments\/[0-9a-f-]+\/products\/[0-9a-f-]+\/images\/[0-9a-f-]+$/i.test(imageUrl)) {
    throw new Error('Đường dẫn ảnh ký gửi không hợp lệ.');
  }
  const response = await apiClient.get<Blob>(imageUrl.slice('/api'.length), { responseType: 'blob' });
  return response.data;
}
