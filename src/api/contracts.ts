import { apiClient } from './client';
import axios from 'axios';

export interface CreateContractRequest {
  appointmentId?: string;
  customerId?: string;
  requestId?: string;
  guest?: GuestCustomer;
  customerDetails?: Omit<GuestCustomer, 'fullName' | 'phoneNumber'>;
  saveCustomer?: boolean;
  products?: ContractProduct[];
  signedAt: string;
  endsAt: string;
  expiryHandling: 'Return' | 'Donate';
  terms?: string;
  templateVersion?: string;
  termsRequestId?: string;
  signature?: ContractImage;
}

export interface ContractResponse {
  id: string;
  contractNumber: string;
  customerId: string | null;
  appointmentId: string | null;
  createdByEmployeeId: string;
  signedAt: string;
  endsAt: string;
  expiryHandling: 'Return' | 'Donate';
  status: string;
}

export interface GuestCustomer { fullName: string; phoneNumber: string; email: string; identityNumber: string; address: string; bankCode: string; bankAccountNumber: string; bankAccountHolderName: string }
export interface ContractCustomer extends GuestCustomer { id: string; version: number; profileVersion: number }
export interface ContractEmployee { fullName: string; phoneNumber: string; jobTitle: string }
export interface ContractImage { contentType: string; data: string }
export interface ContractProduct { name: string; barcode: string; size: string; description: string; conditionPercentage: number; listedPrice: number | null; agreedCommissionRate: number | null; brandId: string; categoryId: string; storageLocationId: string | null; images: ContractImage[] }
export interface ContractOption { id: string; name: string; commissionRate: number | null }
export interface ContractOptions { brands: ContractOption[]; categories: ContractOption[]; locations: ContractOption[] }
export interface ContractListItem { id: string; contractNumber: string; customerName: string | null; signedAt: string; hasPdf: boolean; status?: string }
export interface ContractDetailProduct {
  id: string;
  name: string;
  barcode: string;
  size: string;
  conditionPercentage: number;
  listedPrice: number;
  agreedCommissionRate: number | null;
  brandName: string;
  categoryName: string;
}
export interface ContractDetail {
  id: string;
  contractNumber: string;
  signedAt: string;
  endsAt: string;
  expiryHandling: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerIdentity: string | null;
  customerAddress: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
  employeeName: string;
  employeeTitle: string | null;
  employeePhone: string | null;
  terms: string | null;
  customerSignatureDataUrl: string | null;
  products: ContractDetailProduct[];
  title?: string | null;
  organizationName?: string | null;
  headerText?: string | null;
  footerText?: string | null;
}
export interface ContractPdfFieldMapping { field: string; page: number; x: number; y: number; width: number; height: number }
export interface ContractTemplate { title: string; organizationName: string; headerText: string; footerText: string; defaultTerms: string; version: string; updatedAt: string | null; pdfBase64: string | null; fieldMappings: ContractPdfFieldMapping[] }

export async function getIntakeTemplate(): Promise<ContractTemplate> {
  return (await apiClient.get<ContractTemplate>('/contracts/template')).data;
}
export async function getManagedTemplate(): Promise<ContractTemplate> {
  return (await apiClient.get<ContractTemplate>('/contract-template')).data;
}
export async function getSampleContractBackground(): Promise<Blob> {
  return (await apiClient.get<Blob>('/contract-template/sample-background', { responseType: 'blob' })).data;
}
export async function saveManagedTemplate(template: ContractTemplate): Promise<ContractTemplate> {
  return (await apiClient.put<ContractTemplate>('/contract-template', template)).data;
}
export async function previewManagedTemplate(template: ContractTemplate): Promise<Blob> {
  return postPdf('/contract-template/preview', template);
}

export async function getContractPdf(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/contracts/${encodeURIComponent(id)}/pdf`, { responseType: 'blob' });
  return response.data;
}
export async function getContractDocument(id: string): Promise<Blob> {
  return (await apiClient.get<Blob>(`/contracts/${encodeURIComponent(id)}/document`, { responseType: 'blob' })).data;
}
export async function getContractDetail(id: string): Promise<ContractDetail> {
  try {
    return (await apiClient.get<ContractDetail>(`/contracts/${encodeURIComponent(id)}/detail`)).data;
  } catch {
    // Dự phòng gọi endpoint /web nếu endpoint /detail gặp sự cố
    const res = await apiClient.get<Record<string, any>>(`/contracts/${encodeURIComponent(id)}/web`);
    const web = res.data;
    return {
      id: web.id || id,
      contractNumber: web.contractNumber || 'HĐ-KÝ-GỬI',
      signedAt: web.signedAt || new Date().toISOString(),
      endsAt: web.endsAt || new Date().toISOString(),
      expiryHandling: web.expiryHandling || 'Return',
      status: web.status || 'Active',
      customerName: web.customerName || 'Khách hàng',
      customerPhone: web.customerPhone || '',
      customerEmail: web.customerEmail || null,
      customerIdentity: web.customerIdentity || null,
      customerAddress: web.customerAddress || null,
      bankCode: web.bankCodeSnapshot || web.bankCode || null,
      bankAccountNumber: web.bankAccountNumberSnapshot || web.bankAccountNumber || null,
      bankAccountHolderName: web.bankAccountHolderSnapshot || web.bankAccountHolderName || null,
      employeeName: web.employeeName || 'Nhân viên tiếp nhận',
      employeeTitle: web.employeeTitle || null,
      employeePhone: web.employeePhone || null,
      terms: web.terms || web.template?.defaultTerms || null,
      customerSignatureDataUrl: web.signature ? `data:${web.signature.contentType};base64,${web.signature.data}` : null,
      title: web.template?.title || web.title || null,
      organizationName: web.template?.organizationName || web.organizationName || null,
      headerText: web.template?.headerText || web.headerText || null,
      footerText: web.template?.footerText || web.footerText || null,
      products: Array.isArray(web.products) ? web.products.map((p: any) => ({
        id: p.id || '',
        name: p.name || '',
        barcode: p.barcode || '',
        size: p.size || '',
        conditionPercentage: p.conditionPercentage || 95,
        listedPrice: p.listedPrice || 0,
        agreedCommissionRate: p.commissionRate ?? p.agreedCommissionRate ?? 20,
        brandName: p.brand || p.brandName || '',
        categoryName: p.category || p.categoryName || '',
      })) : [],
    };
  }
}
export interface ContractFilterParams {
  page?: number;
  query?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export async function listContracts(params: number | ContractFilterParams = 1): Promise<ContractListItem[]> {
  const queryParams = typeof params === 'number' ? { page: params } : params;
  const response = await apiClient.get<ContractListItem[]>('/contracts', { params: queryParams });
  return response.data;
}

export async function findContractCustomer(phone: string): Promise<ContractCustomer> {
  const response = await apiClient.get<ContractCustomer>('/contracts/customers/by-phone', { params: { phone } });
  return response.data;
}

export async function getContractCustomer(id: string): Promise<ContractCustomer> {
  const response = await apiClient.get<ContractCustomer>(`/contracts/customers/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getContractOptions(): Promise<ContractOptions> {
  const response = await apiClient.get<ContractOptions>('/contracts/options');
  return response.data;
}

export async function getContractEmployee(): Promise<ContractEmployee> {
  const response = await apiClient.get<ContractEmployee>('/contracts/employee/me');
  return response.data;
}

export async function updateContractCustomer(customer: ContractCustomer): Promise<ContractCustomer> {
  const { email, identityNumber, address, bankCode, bankAccountNumber, bankAccountHolderName, version, profileVersion } = customer;
  const response = await apiClient.put<ContractCustomer>(`/contracts/customers/${encodeURIComponent(customer.id)}`, { email, identityNumber, address, bankCode, bankAccountNumber, bankAccountHolderName, version, profileVersion });
  return response.data;
}

export async function createContract(request: CreateContractRequest): Promise<ContractResponse> {
  const response = await apiClient.post<ContractResponse>('/contracts', request);
  return response.data;
}

async function postPdf(path: string, request: unknown): Promise<Blob> {
  try {
    const response = await apiClient.post<Blob>(path, request, { responseType: 'blob' });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Preserve the original error. */ }
    }
    throw error;
  }
}
export async function previewContract(request: CreateContractRequest): Promise<Blob> {
  return postPdf('/contracts/preview', request);
}
export async function previewContractWord(request: CreateContractRequest): Promise<Blob> {
  return postPdf('/contracts/preview?format=word', request);
}
