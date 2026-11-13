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
export interface ContractListItem { id: string; contractNumber: string; customerName: string | null; signedAt: string; hasPdf: boolean }
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
export async function listContracts(page: number): Promise<ContractListItem[]> {
  const response = await apiClient.get<ContractListItem[]>('/contracts', { params: { page } });
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
