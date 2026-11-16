import axios, { type AxiosRequestConfig } from 'axios';
import type { CsrfTokenResponse } from '@/types';

try {
  localStorage.removeItem('ocs_token');
  localStorage.removeItem('ocs_user');
  sessionStorage.removeItem('ocs_token');
  sessionStorage.removeItem('ocs_user');
} catch {
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function resolveApiAssetUrl(url: string | null): string | null {
  return url?.startsWith('/api/product-images/') ? `${API_BASE_URL.replace(/\/$/, '')}${url.slice(4)}` : url;
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  if (url.startsWith('/api') && API_BASE_URL.startsWith('http')) {
    try {
      const origin = new URL(API_BASE_URL).origin;
      return `${origin}${url}`;
    } catch {
      return url;
    }
  }
  return url;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

export function setCsrfToken(token: string | null): void {
  csrfTokenCache = token;
}

export function clearCsrfToken(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

export async function fetchCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    try {
      const response = await axios.get<CsrfTokenResponse>(`${API_BASE_URL}/auth/csrf`, {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
      csrfTokenCache = response.data.token;
      return response.data.token;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

const MUTATING_METHODS = new Set(['post', 'put', 'delete', 'patch']);

apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (method && MUTATING_METHODS.has(method)) {
    if (!config.headers['X-XSRF-TOKEN']) {
      try {
        const token = await fetchCsrfToken();
        if (token) {
          config.headers['X-XSRF-TOKEN'] = token;
        }
      } catch {
      }
    }
  }
  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

let isHandling401 = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'AUTH.CSRF_INVALID') {
      clearCsrfToken();
    }
    if (error.response?.status === 401) {
      const requestUrl = (error.config as AxiosRequestConfig)?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');

      if (!isLoginRequest) {
        if (!isHandling401) {
          isHandling401 = true;
          try {
            unauthorizedHandler?.();
          } finally {
            setTimeout(() => {
              isHandling401 = false;
            }, 1000);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
