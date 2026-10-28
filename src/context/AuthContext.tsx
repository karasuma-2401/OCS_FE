import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isStaffOrAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ocs_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ocs_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('ocs_token', token);
    } else {
      localStorage.removeItem('ocs_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('ocs_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ocs_user');
    }
  }, [user]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('ocs_token');
    localStorage.removeItem('ocs_user');
  };

  const hasRole = (role: Role) => {
    return user?.roles?.includes(role) ?? false;
  };

  const isStaffOrAdmin =
    hasRole('Admin') || hasRole('Manager') || hasRole('Staff');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isStaffOrAdmin,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

