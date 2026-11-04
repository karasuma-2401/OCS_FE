import axios, { type AxiosRequestConfig } from 'axios';
import type { CsrfTokenResponse } from '@/types';

// Clean legacy localStorage/sessionStorage keys once on startup
try {
  localStorage.removeItem('ocs_token');
  localStorage.removeItem('ocs_user');
  sessionStorage.removeItem('ocs_token');
  sessionStorage.removeItem('ocs_user');
} catch {
  // Ignore in environments where storage is blocked or disabled
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF token caching & retrieval
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

// Request interceptor: attach CSRF token for mutations
const MUTATING_METHODS = new Set(['post', 'put', 'delete', 'patch']);

apiClient.interceptors.request.use(async (config) => {
  const method = config.method?.toLowerCase();
  if (method && MUTATING_METHODS.has(method)) {
    // If header is not already explicitly set, retrieve and set X-XSRF-TOKEN
    if (!config.headers['X-XSRF-TOKEN']) {
      try {
        const token = await fetchCsrfToken();
        if (token) {
          config.headers['X-XSRF-TOKEN'] = token;
        }
      } catch {
        // If CSRF fetch fails, let request proceed; backend middleware returns 403 AUTH.CSRF_INVALID
      }
    }
  }
  return config;
});

// Unauthorized handler callback for AuthContext integration
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// Response interceptor: handle 401 sessions without redirect loops
let isHandling401 = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = (error.config as AxiosRequestConfig)?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');

      // Do NOT trigger global logout/clear when login request fails (credentials invalid)
      if (!isLoginRequest) {
        if (!isHandling401) {
          isHandling401 = true;
          try {
            unauthorizedHandler?.();
          } finally {
            // Debounce concurrent 401s
            setTimeout(() => {
              isHandling401 = false;
            }, 1000);
          }
        }
      }
    }
    // 403 Forbidden is intentionally NOT cleared here (identity is valid, only lacks permissions)
    return Promise.reject(error);
  }
);
