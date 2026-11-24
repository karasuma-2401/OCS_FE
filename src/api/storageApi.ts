import { apiClient, resolveImageUrl } from './client';

export interface UploadResponse {
  id?: string;
  url: string;
  fileName: string;
  size: number;
  contentType: string;
}

export const storageApi = {
  extractKey(urlOrKey: string): string {
    if (!urlOrKey) return '';
    let key = urlOrKey;
    if (key.includes('/api/storage/')) {
      key = key.split('/api/storage/')[1] || '';
    } else if (key.startsWith('http://') || key.startsWith('https://')) {
      try {
        const u = new URL(key);
        key = u.pathname.replace(/^\/api\/storage\//, '').replace(/^\//, '');
      } catch {
        key = key.replace(/^\//, '');
      }
    }
    return key.replace(/^\//, '');
  },

  privateInspectionPath(urlOrKey: string): string | null {
    const key = this.extractKey(urlOrKey);
    if (!key.toLowerCase().startsWith('inspections/') || key.split('/').some(part => !part || part === '.' || part === '..')) return null;
    return `/api/storage/${key}`;
  },

  privateInspectionRequestPath(urlOrKey: string): string | null {
    return this.privateInspectionPath(urlOrKey)?.replace(/^\/api/, '') ?? null;
  },

  async uploadImage(
    file: File,
    folder: 'products' | 'inspections' = 'products',
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadResponse>(
      `/storage/upload?folder=${folder}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return {
      ...response.data,
      url: resolveImageUrl(response.data.url),
    };
  },

  async deleteImage(_urlOrKey: string): Promise<void> {
    // Chính sách bảo toàn dữ liệu R2: Cho phép upload ảnh nhưng bảo lưu vĩnh viễn trên R2 (không xóa tệp vật lý)
    return Promise.resolve();
  },
};
