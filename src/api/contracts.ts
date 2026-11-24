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
  earlyWithdrawalFeeRate?: number | null;
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
export interface ContractTemplate {
  title: string;
  organizationName: string;
  headerText: string;
  footerText: string;
  defaultTerms: string;
  version: string;
  updatedAt: string | null;
  pdfBase64: string | null;
  fieldMappings: ContractPdfFieldMapping[];
  defaultTermDays?: number;
  defaultExpiryHandling?: 'Return' | 'Donate';
}

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
  const mapData = (raw: any): ContractDetail => {
    const productsRaw = raw.products || raw.Products || [];
    const sig = raw.signature || raw.Signature;
    const sigDataUrl = raw.customerSignatureDataUrl || raw.CustomerSignatureDataUrl ||
      (sig?.data ? `data:${sig.contentType || 'image/png'};base64,${sig.data}` : null);

    return {
      id: raw.id || raw.Id || id,
      contractNumber: raw.contractNumber || raw.ContractNumber || 'HĐ-KÝ-GỬI',
      signedAt: raw.signedAt || raw.SignedAt || new Date().toISOString(),
      endsAt: raw.endsAt || raw.EndsAt || new Date().toISOString(),
      expiryHandling: raw.expiryHandling || raw.ExpiryHandling || 'Return',
      status: raw.status || raw.Status || 'Active',
      customerName: raw.customerName || raw.CustomerName || raw.customerNameSnapshot || raw.CustomerNameSnapshot || '',
      customerPhone: raw.customerPhone || raw.CustomerPhone || raw.customerPhoneSnapshot || raw.CustomerPhoneSnapshot || '',
      customerEmail: raw.customerEmail || raw.CustomerEmail || raw.customerEmailSnapshot || raw.CustomerEmailSnapshot || null,
      customerIdentity: raw.customerIdentity || raw.CustomerIdentity || raw.customerIdentitySnapshot || raw.CustomerIdentitySnapshot || null,
      customerAddress: raw.customerAddress || raw.CustomerAddress || raw.customerAddressSnapshot || raw.CustomerAddressSnapshot || null,
      bankCode: raw.bankCode || raw.BankCode || raw.bankCodeSnapshot || raw.BankCodeSnapshot || null,
      bankAccountNumber: raw.bankAccountNumber || raw.BankAccountNumber || raw.bankAccountNumberSnapshot || raw.BankAccountNumberSnapshot || null,
      bankAccountHolderName: raw.bankAccountHolderName || raw.BankAccountHolderName || raw.bankAccountHolderSnapshot || raw.BankAccountHolderSnapshot || null,
      employeeName: raw.employeeName || raw.EmployeeName || raw.employeeNameSnapshot || raw.EmployeeNameSnapshot || 'Nhân viên tiếp nhận',
      employeeTitle: raw.employeeTitle || raw.EmployeeTitle || raw.employeeTitleSnapshot || raw.EmployeeTitleSnapshot || null,
      employeePhone: raw.employeePhone || raw.EmployeePhone || raw.employeePhoneSnapshot || raw.EmployeePhoneSnapshot || null,
      terms: raw.terms || raw.Terms || raw.termsSnapshot || raw.TermsSnapshot || raw.template?.defaultTerms || raw.Template?.DefaultTerms || null,
      customerSignatureDataUrl: sigDataUrl,
      title: raw.title || raw.Title || raw.templateTitleSnapshot || raw.TemplateTitleSnapshot || raw.template?.title || raw.Template?.Title || null,
      organizationName: raw.organizationName || raw.OrganizationName || raw.organizationNameSnapshot || raw.OrganizationNameSnapshot || raw.template?.organizationName || raw.Template?.OrganizationName || null,
      headerText: raw.headerText || raw.HeaderText || raw.headerTextSnapshot || raw.HeaderTextSnapshot || raw.template?.headerText || raw.Template?.HeaderText || null,
      footerText: raw.footerText || raw.FooterText || raw.footerTextSnapshot || raw.FooterTextSnapshot || raw.template?.footerText || raw.Template?.FooterText || null,
      products: Array.isArray(productsRaw) ? productsRaw.map((p: any) => ({
        id: p.id || p.Id || '',
        name: p.name || p.Name || '',
        barcode: p.barcode || p.Barcode || '',
        size: p.size || p.Size || '',
        conditionPercentage: p.conditionPercentage ?? p.ConditionPercentage ?? 100,
        listedPrice: p.listedPrice ?? p.ListedPrice ?? 0,
        agreedCommissionRate: p.agreedCommissionRate ?? p.AgreedCommissionRate ?? p.commissionRate ?? p.CommissionRate ?? null,
        brandName: p.brandName || p.BrandName || p.brand || p.Brand || '',
        categoryName: p.categoryName || p.CategoryName || p.category || p.Category || '',
      })) : [],
    };
  };

  try {
    const res = await apiClient.get<Record<string, any>>(`/contracts/${encodeURIComponent(id)}/detail`);
    return mapData(res.data);
  } catch {
    try {
      // Dự phòng gọi endpoint /web nếu endpoint /detail gặp sự cố
      const res = await apiClient.get<Record<string, any>>(`/contracts/${encodeURIComponent(id)}/web`);
      return mapData(res.data);
    } catch {
      // Dự phòng gọi endpoint /contracts/{id} cơ bản
      const res = await apiClient.get<Record<string, any>>(`/contracts/${encodeURIComponent(id)}`);
      return mapData(res.data);
    }
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
  const response = await apiClient.get<any[]>('/contracts', { params: queryParams });
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map((x: any) => ({
    id: x.id || x.Id,
    contractNumber: x.contractNumber || x.ContractNumber,
    customerName: x.customerName || x.CustomerName || x.customerNameSnapshot || x.CustomerNameSnapshot || null,
    signedAt: x.signedAt || x.SignedAt,
    hasPdf: x.hasPdf ?? x.HasPdf ?? true,
    status: x.status || x.Status || 'Active',
  }));
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
export async function previewContractWeb(request: CreateContractRequest): Promise<string> {
  return (await apiClient.post<{ terms: string }>('/contracts/preview-web', request)).data.terms;
}
export async function previewContractWord(request: CreateContractRequest): Promise<Blob> {
  return postPdf('/contracts/preview?format=word', request);
}
