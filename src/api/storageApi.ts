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

  async deleteImage(urlOrKey: string): Promise<void> {
    const key = storageApi.extractKey(urlOrKey);
    if (!key) return;
    await apiClient.delete(`/storage/${encodeURI(key)}`);
  },
};
