import axios from 'axios';
import { apiClient, clearCsrfToken, fetchCsrfToken } from './client';
import type {
  CurrentUserResponse,
  LoginResponse,
  ProblemDetails,
  RegisterResponse,
  ResendOtpResponse,
  VerifyOtpResponse,
} from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface VerifyOtpRequest {
  challengeId: string;
  continuationToken: string;
  code: string;
}

export interface ResendOtpRequest {
  challengeId: string;
  continuationToken: string;
}

/**
 * Extracts and maps RFC 7807 ProblemDetails from an API error response.
 */
export function parseProblemDetails(error: unknown): ProblemDetails {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    return {
      type: typeof data.type === 'string' ? data.type : undefined,
      title: typeof data.title === 'string' ? data.title : undefined,
      status: typeof data.status === 'number' ? data.status : error.response.status,
      detail: typeof data.detail === 'string' ? data.detail : undefined,
      code: typeof data.code === 'string' ? data.code : undefined,
      traceId: typeof data.traceId === 'string' ? data.traceId : undefined,
      errors: data.errors && typeof data.errors === 'object' ? (data.errors as Record<string, string[]>) : undefined,
      lockoutEndAt: typeof data.lockoutEndAt === 'string' ? data.lockoutEndAt : undefined,
      retryAfterSeconds: typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
      continuationToken: typeof data.continuationToken === 'string' ? data.continuationToken : undefined,
      email: typeof data.email === 'string' ? data.email : undefined,
    };
  }

  if (axios.isAxiosError(error) && !error.response) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      title: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.',
    };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    title: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
  };
}

/**
 * Login with email and password. Sets the HttpOnly session cookie on the browser.
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  // Clear cached CSRF token so next request acquires a fresh token bound to authenticated identity
  clearCsrfToken();
  return response.data;
}

/**
 * Register a new customer account.
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data);
  return response.data;
}

/**
 * Verify OTP to activate customer account.
 */
export async function verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
  const response = await apiClient.post<VerifyOtpResponse>('/auth/otp/verify', data);
  return response.data;
}

/**
 * Resend OTP to customer email.
 */
export async function resendOtp(data: ResendOtpRequest): Promise<ResendOtpResponse> {
  const response = await apiClient.post<ResendOtpResponse>('/auth/otp/resend', data);
  return response.data;
}

/**
 * Get current authenticated user profile and remaining session time.
 */
export async function getMe(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>('/auth/me', {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
  return response.data;
}

/**
 * Logout current session on server and clear cookies.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearCsrfToken();
  }
}

/**
 * Fetch or get cached CSRF anti-forgery request token.
 */
export async function getCsrfToken(): Promise<string> {
  return fetchCsrfToken();
}

