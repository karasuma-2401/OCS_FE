import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, RoleCode, LoginResponse } from '@/types';
import { getMe, logout as apiLogout, login as apiLogin, type LoginRequest } from '@/api/auth';
import { setUnauthorizedHandler, clearCsrfToken } from '@/api/client';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
  isChecking: boolean;
  isStaffOrAdmin: boolean;
  bootstrapError: boolean;
  setAuthenticatedUser: (user: User, expiresAt: string) => void;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  retryBootstrap: () => Promise<void>;
  revalidateSession: () => Promise<void>;
  hasRole: (role: RoleCode) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_SYNC_CHANNEL = 'ocs_auth_sync';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState(false);

  // Broadcast helper
  const postSyncMessage = useCallback((action: 'LOGIN' | 'LOGOUT') => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
        channel.postMessage(action);
        channel.close();
      }
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  // Check current session against /me
  const checkAuth = useCallback(async (foreground = false) => {
    if (foreground) {
      setStatus('checking');
      setBootstrapError(false);
    }
    try {
      const data = await getMe();
      setUser(data.user);
      setExpiresAt(data.expiresAt);
      setStatus('authenticated');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 401) {
        setUser(null);
        setExpiresAt(null);
        setStatus('anonymous');
      } else {
        // Network error / timeout / 5xx: do NOT assume cookie was revoked
        if (foreground) {
          setBootstrapError(true);
          setStatus('anonymous');
        }
      }
    }
  }, []);

  // Initial bootstrap on mount
  useEffect(() => {
    void checkAuth(true);
  }, [checkAuth]);

  // Hook into apiClient 401 interceptor
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setExpiresAt(null);
      setStatus('anonymous');
      clearCsrfToken();
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  // Multi-tab synchronization
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent<string>) => {
        if (event.data === 'LOGOUT') {
          setUser(null);
          setExpiresAt(null);
          setStatus('anonymous');
          clearCsrfToken();
        } else if (event.data === 'LOGIN') {
          void checkAuth(true);
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    return () => {
      channel?.close();
    };
  }, [checkAuth]);

  // Tab visibility and focus: check if session has expired or needs revalidation
  useEffect(() => {
    const handleRevalidation = () => {
      if (document.visibilityState === 'visible' && status === 'authenticated') {
        if (expiresAt) {
          const expiryTime = new Date(expiresAt).getTime();
          const now = Date.now();
          if (now >= expiryTime) {
            void checkAuth();
            return;
          }
        }
        // Periodic background revalidation
        void checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleRevalidation);
    window.addEventListener('focus', handleRevalidation);

    return () => {
      document.removeEventListener('visibilitychange', handleRevalidation);
      window.removeEventListener('focus', handleRevalidation);
    };
  }, [status, expiresAt, checkAuth]);

  useEffect(() => {
    if (status !== 'authenticated' || !expiresAt) return;
    const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const timer = window.setTimeout(() => void checkAuth(), Math.min(delay, 2147483647));
    return () => window.clearTimeout(timer);
  }, [status, expiresAt, checkAuth]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const timer = window.setInterval(() => void checkAuth(), 30_000);
    return () => window.clearInterval(timer);
  }, [status, checkAuth]);

  // Set user after successful login
  const setAuthenticatedUser = useCallback((newUser: User, newExpiresAt: string) => {
    setUser(newUser);
    setExpiresAt(newExpiresAt);
    setStatus('authenticated');
    setBootstrapError(false);
    postSyncMessage('LOGIN');
  }, [postSyncMessage]);

  // Login action
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiLogin(credentials);
    setAuthenticatedUser(response.user, response.expiresAt);
    return response;
  }, [setAuthenticatedUser]);

  // Logout action
  const logout = useCallback(async (): Promise<void> => {
    await apiLogout();
    setUser(null);
    setExpiresAt(null);
    setStatus('anonymous');
    clearCsrfToken();
    postSyncMessage('LOGOUT');
  }, [postSyncMessage]);

  // Retry bootstrap action
  const retryBootstrap = useCallback(async () => {
    await checkAuth(true);
  }, [checkAuth]);

  const revalidateSession = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  // Role check helper
  const hasRole = useCallback((role: RoleCode): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);

  const isStaffOrAdmin =
    hasRole('Admin') || hasRole('Manager') || hasRole('Staff');

  const isAuthenticated = status === 'authenticated' && !!user;
  const isChecking = status === 'checking';

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        expiresAt,
        isAuthenticated,
        isChecking,
        isStaffOrAdmin,
        bootstrapError,
        setAuthenticatedUser,
        login,
        logout,
        retryBootstrap,
        revalidateSession,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
