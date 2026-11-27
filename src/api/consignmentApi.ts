import { apiClient, resolveImageUrl } from './client';
import type { CommissionTierRates } from './systemConfig';
import type {
  CreateReceptionRequest,
  ReceptionContractResult,
  BrandTierType,
} from '@/types';

export interface CategoryOption {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface BrandOption {
  id: string;
  name: string;
  tier: BrandTierType;
  defaultCommissionRate: number;
  isActive?: boolean;
}

export type ReceptionDraftItem = CreateReceptionRequest['items'][number] & { id?: string; coverImageUrl?: string };
export interface ReceptionDraft {
  draftId: string;
  savedAt: string;
  intakeType: 'Consignment' | 'Buyout';
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  identityNumber?: string | null;
  address?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolderName?: string | null;
  actualItemCount?: number | null;
  termDays: number;
  commissionShop: number;
  note?: string | null;
  items: ReceptionDraftItem[];
}

interface RawBrandResponse {
  id: string;
  name: string;
  tier: BrandTierType;
  defaultCommissionRate: string | number;
  isActive: boolean;
}

interface PagedBrandsResponse {
  items: RawBrandResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: '30000000-0000-0000-0000-000000000001', name: 'Áo khoác' },
  { id: '30000000-0000-0000-0000-000000000002', name: 'Đầm & Váy' },
  { id: '30000000-0000-0000-0000-000000000003', name: 'Quần & Jeans' },
  { id: '30000000-0000-0000-0000-000000000004', name: 'Phụ kiện' },
];

export const DEFAULT_BRANDS: BrandOption[] = [
  {
    id: '40000000-0000-0000-0000-000000000099',
    name: 'Khác',
    tier: 'NoBrand',
    defaultCommissionRate: 10,
    isActive: true,
  },
  {
    id: '40000000-0000-0000-0000-000000000001',
    name: 'Zara',
    tier: 'Commercial',
    defaultCommissionRate: 15,
    isActive: true,
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    name: 'Uniqlo',
    tier: 'Commercial',
    defaultCommissionRate: 15,
    isActive: true,
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    name: 'Routine',
    tier: 'LocalBrand',
    defaultCommissionRate: 12,
    isActive: true,
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    name: 'Chanel',
    tier: 'Luxury',
    defaultCommissionRate: 20,
    isActive: true,
  },
];

export const COMMON_MATERIALS = [
  'Cotton',
  'Lụa (Silk)',
  'Denim',
  'Len (Wool)',
  'Da thật (Leather)',
  'Da nhân tạo (PU)',
  'Kaki',
  'Nỉ / Dạ',
  'Polyester',
  'Vải đũi (Linen)',
  'Ren (Lace)',
  'Khác',
];

export const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FreeSize', 'Khác'];

export const REJECTION_REASONS = [
  'Độ mới dưới 80% (không đạt chuẩn ký gửi)',
  'Hàng có vết ố / rách sờn không khắc phục được',
  'Tem mác bị cắt mất, không kiểm chứng được xuất xứ',
  'Nghi ngờ hàng nhái / vi phạm bản quyền thương hiệu',
  'Danh mục hoặc kiểu dáng lỗi thời, cửa hàng ngưng nhận',
  'Khách không đồng ý với mức giá niêm yết hoặc hoa hồng',
  'Lý do khác (ghi rõ bên dưới)',
];

export function getTierDefaultCommissionRate(tier?: BrandTierType, tiers?: CommissionTierRates): number {
  switch (tier) {
    case 'Luxury':
      return tiers?.luxury ?? 20;
    case 'Commercial':
      return tiers?.commercial ?? 15;
    case 'LocalBrand':
      return tiers?.localBrand ?? 12;
    case 'NoBrand':
      return tiers?.noBrand ?? 10;
    default:
      return tiers?.commercial ?? 15;
  }
}

export interface ReceptionTemplate {
  title: string;
  organizationName: string;
  headerText: string;
  footerText: string;
  defaultTerms: string;
  effectiveTerms?: string;
  earlyWithdrawalFeeRate?: number;
  version: string;
  defaultTermDays?: number;
  defaultExpiryHandling?: 'Return' | 'Donate';
}
export const consignmentApi = {
  async getReceptionTemplate(): Promise<ReceptionTemplate> { return (await apiClient.get<ReceptionTemplate>('/consignments/reception-template')).data; },
  async getCategories(): Promise<CategoryOption[]> {
    const response = await apiClient.get<CategoryOption[]>('/categories', {
      params: { activeOnly: true },
    });
    return response.data;
  },

  async getBrands(): Promise<BrandOption[]> {
      const response = await apiClient.get<PagedBrandsResponse>('/brands', {
        params: { page: 1, pageSize: 100 },
      });
      const fetched: BrandOption[] = (response.data.items || [])
        .filter((b) => b.isActive)
        .map((b) => ({
          id: b.id,
          name: b.name,
          tier: b.tier,
          defaultCommissionRate: Number(b.defaultCommissionRate) > 0 ? Number(b.defaultCommissionRate) : 0,
          isActive: b.isActive,
        }));
      return fetched;
  },

  async getCustomerItemHistoryCount(
    customerId?: string,
    phoneNumber?: string,
  ): Promise<number> {
    try {
      const response = await apiClient.get<{ count: number }>(
        '/consignments/customer-history-count',
        {
          params: { customerId, phoneNumber },
        },
      );
      return response.data.count ?? 0;
    } catch {
      return 0;
    }
  },

  async createReception(
    request: CreateReceptionRequest,
  ): Promise<ReceptionContractResult> {
    const response = await apiClient.post<ReceptionContractResult>(
      '/consignments/reception',
      request,
    );
    return response.data;
  },

  async saveDraft(request: {
    draftId?: string;
    appointmentId?: string;
    intakeType: 'Consignment' | 'Buyout';
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    identityNumber?: string; address?: string; bankCode?: string; bankAccountNumber?: string; bankAccountHolderName?: string;
    actualItemCount?: number;
    termDays: number;
    commissionShop: number;
    note?: string;
    items: ReceptionDraftItem[];
  }): Promise<{ draftId: string; savedAt: string }> {
    const response = await apiClient.post<{ draftId: string; savedAt: string }>(
      '/consignments/draft',
      request,
    );
    return response.data;
  },

  async getDraftByAppointment(appointmentId: string): Promise<ReceptionDraft | null> {
    try {
      const response = await apiClient.get<ReceptionDraft>(
        `/consignments/draft/by-appointment/${appointmentId}`,
      );
      return response.data || null;
    } catch {
      return null;
    }
  },

  async getLatestWalkInDraft(): Promise<ReceptionDraft | null> {
    try {
      const response = await apiClient.get<ReceptionDraft>('/consignments/draft/walkin');
      return response.data || null;
    } catch {
      return null;
    }
  },

  async deleteDraft(draftId: string): Promise<void> {
    try {
      await apiClient.delete(`/consignments/draft/${draftId}`);
    } catch {
    }
  },

  async deleteDraftByAppointment(appointmentId: string): Promise<void> {
    try {
      await apiClient.delete(`/consignments/draft/by-appointment/${appointmentId}`);
    } catch {
    }
  },

  async deleteWalkInDraft(): Promise<void> {
    try {
      await apiClient.delete('/consignments/draft/walkin');
    } catch {
    }
  },

  async uploadProductImage(
    file: File,
    folder: 'products' | 'inspections' = 'inspections',
  ): Promise<{ url: string; id: string; fileName?: string; size?: number; contentType?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      id?: string;
      url: string;
      fileName?: string;
      size?: number;
      contentType?: string;
    }>(`/storage/upload?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      url: resolveImageUrl(response.data.url),
      id: response.data.id || crypto.randomUUID(),
      fileName: response.data.fileName,
      size: response.data.size,
      contentType: response.data.contentType,
    };
  },

  async deleteProductImage(_urlOrKey: string): Promise<void> {
    // Chính sách bảo toàn dữ liệu R2: Cho phép upload ảnh nhưng bảo lưu vĩnh viễn trên R2 (không xóa tệp vật lý)
    return Promise.resolve();
  },
};
