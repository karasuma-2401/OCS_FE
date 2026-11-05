import { apiClient } from './client';

export interface PublicProductCategory {
  id: string;
  name: string;
}

export interface PublicProductBrand {
  id: string;
  name: string;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  listedPrice: number | string;
  size: string;
  conditionPercentage: number;
  category: PublicProductCategory;
  brand: PublicProductBrand;
  coverImageUrl: string | null;
}

export interface PublicProductImage {
  id: string;
  url: string;
  imageType: 'Cover' | 'Detail';
  sortOrder: number;
}

export interface PublicProductDetail {
  id: string;
  name: string;
  description: string | null;
  listedPrice: number | string;
  size: string;
  conditionPercentage: number;
  category: PublicProductCategory;
  brand: PublicProductBrand;
  images: PublicProductImage[];
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type ProductSortOption = 'newest' | 'priceAsc' | 'priceDesc';

export interface GetPublicProductsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  categoryId?: string;
  brandId?: string;
  size?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  minCondition?: number;
  sort?: ProductSortOption;
}

export const CATEGORY_SEED_MAP: Record<string, string> = {
  'Áo khoác': '30000000-0000-0000-0000-000000000001',
  'Đầm & Váy': '30000000-0000-0000-0000-000000000002',
  'Quần & Jeans': '30000000-0000-0000-0000-000000000003',
  'Phụ kiện': '30000000-0000-0000-0000-000000000004',
};

export const CATEGORY_NAMES = ['Tất cả', 'Áo khoác', 'Đầm & Váy', 'Quần & Jeans', 'Phụ kiện'] as const;

export function getCategoryIdByName(name: string): string | undefined {
  return CATEGORY_SEED_MAP[name] ?? undefined;
}

export function getCategoryNameById(id?: string | null): string {
  if (!id) return 'Tất cả';
  const target = id.toLowerCase();
  for (const [name, mappedId] of Object.entries(CATEGORY_SEED_MAP)) {
    if (mappedId.toLowerCase() === target) return name;
  }
  return 'Tất cả';
}

export function formatVndPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') return '0 ₫';
  const num = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(num) || Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num).replace(/\u00a0/g, ' ');
}

export async function getPublicProducts(
  params?: GetPublicProductsParams,
  signal?: AbortSignal
): Promise<PagedResponse<PublicProduct>> {
  const queryParams: Record<string, string | number> = {};

  if (params) {
    if (params.page && params.page > 0) queryParams.page = params.page;
    if (params.pageSize && params.pageSize > 0) queryParams.pageSize = params.pageSize;
    if (params.q && params.q.trim()) queryParams.q = params.q.trim();
    if (params.categoryId && params.categoryId.trim()) queryParams.categoryId = params.categoryId.trim();
    if (params.brandId && params.brandId.trim()) queryParams.brandId = params.brandId.trim();
    if (params.size && params.size.trim()) queryParams.size = params.size.trim();
    if (params.minPrice !== undefined && params.minPrice !== '' && params.minPrice !== null) {
      queryParams.minPrice = Number(params.minPrice);
    }
    if (params.maxPrice !== undefined && params.maxPrice !== '' && params.maxPrice !== null) {
      queryParams.maxPrice = Number(params.maxPrice);
    }
    if (params.minCondition !== undefined && params.minCondition !== null && Number.isFinite(Number(params.minCondition))) {
      queryParams.minCondition = Number(params.minCondition);
    }
    if (params.sort) queryParams.sort = params.sort;
  }

  const response = await apiClient.get<PagedResponse<PublicProduct>>('/products', {
    params: queryParams,
    signal,
  });
  return response.data;
}

export async function getPublicProductDetail(
  id: string,
  signal?: AbortSignal
): Promise<PublicProductDetail> {
  const cleanId = id.trim();
  const response = await apiClient.get<PublicProductDetail>(`/products/${encodeURIComponent(cleanId)}/public`, {
    signal,
  });
  return response.data;
}

export const productsApi = {
  list: getPublicProducts,
  getDetail: getPublicProductDetail,
  formatPrice: formatVndPrice,
  getCategoryIdByName,
  getCategoryNameById,
};
