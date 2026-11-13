import { apiClient } from './client';

export interface BarcodeLabelProduct { id: string; name: string; barcode: string; listedPrice: number }
export interface BarcodeLabelTemplate { widthMm: number; heightMm: number; columns: number; fontSizePt: number; version: string; updatedAt: string | null }

export const barcodeApi = {
  async generate(): Promise<string> {
    return (await apiClient.get<{ barcode: string }>('/contracts/barcode/new')).data.barcode;
  },
  async contractProducts(contractId: string): Promise<BarcodeLabelProduct[]> {
    return (await apiClient.get<BarcodeLabelProduct[]>(`/contracts/${encodeURIComponent(contractId)}/barcode-products`)).data;
  },
  async getTemplate(): Promise<BarcodeLabelTemplate> {
    return (await apiClient.get<BarcodeLabelTemplate>('/barcode-label-template')).data;
  },
  async saveTemplate(template: BarcodeLabelTemplate): Promise<BarcodeLabelTemplate> {
    return (await apiClient.put<BarcodeLabelTemplate>('/barcode-label-template', template)).data;
  },
};
