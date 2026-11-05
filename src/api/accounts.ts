import { apiClient } from './client';
import type { RoleCode } from '@/types';

export type AccountType = 'Customer' | 'Internal';
export type AccountStatus = 'PendingActivation' | 'Active' | 'Locked' | 'Deactivated';
export interface AccountSummary {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  accountType: AccountType;
  status: AccountStatus;
  roles: RoleCode[];
  createdAt: string;
  isProtected: boolean;
  username: string | null;
}
export interface PagedAccounts {
  items: AccountSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface AccountHistoryItem {
  id: string;
  actorAccountId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: unknown;
  occurredAt: string;
  source: string;
}
export interface PagedAccountHistory {
  items: AccountHistoryItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface CreateInternalAccount {
  fullName: string;
  email: string;
  phoneNumber: string;
  username: string;
  password: string;
  jobTitle: string;
  hiredOn: string;
}
export type CreateInternalAccountRequest = Omit<CreateInternalAccount, 'password'> & {
  password: string | null;
  useDefaultPassword: boolean;
};
export interface UpdateAccountRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  username: string | null;
}
export interface EmployeeProfile {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string;
  username: string | null;
  jobTitle: string;
  hiredOn: string;
  leftOn: string | null;
  employeeStatus: 'Working' | 'Suspended' | 'Left';
  accountStatus: AccountStatus;
  roles: RoleCode[];
}
export interface UpdateEmployeeProfileRequest {
  fullName: string;
  phoneNumber: string;
  jobTitle: string;
  hiredOn: string;
}

export const accountsApi = {
  async list(params: { page: number; pageSize: number; search?: string; accountType?: number; status?: number; role?: RoleCode }) {
    const { data } = await apiClient.get<PagedAccounts>('/accounts', { params });
    return data;
  },
  async get(id: string) {
    const { data } = await apiClient.get<AccountSummary>(`/accounts/${id}`);
    return data;
  },
  async update(id: string, input: UpdateAccountRequest) {
    const { data } = await apiClient.put<AccountSummary>(`/accounts/${id}`, input);
    return data;
  },
  async getEmployeeProfile(id: string) {
    const { data } = await apiClient.get<EmployeeProfile>(`/accounts/${id}/employee-profile`);
    return data;
  },
  async updateEmployeeProfile(id: string, input: UpdateEmployeeProfileRequest) {
    const { data } = await apiClient.patch<EmployeeProfile>(`/accounts/${id}/employee-profile`, input);
    return data;
  },
  async create(input: CreateInternalAccountRequest, role: 'Admin' | 'Manager' | 'Staff', isAdmin: boolean) {
    const { data } = await apiClient.post<AccountSummary>(isAdmin ? '/accounts/internal' : '/accounts/staff', isAdmin ? { ...input, role } : input);
    return data;
  },
  async lock(id: string, locked: boolean) {
    const { data } = await apiClient.patch<AccountSummary>(`/accounts/${id}/lock-status`, { locked });
    return data;
  },
  async status(id: string, status: 'Active' | 'Deactivated') {
    const { data } = await apiClient.patch<AccountSummary>(`/accounts/${id}/status`, { status });
    return data;
  },
  async roles(id: string, roles: Array<'Admin' | 'Manager' | 'Staff'>) {
    const { data } = await apiClient.put<AccountSummary>(`/accounts/${id}/roles`, { roles });
    return data;
  },
  async resetPassword(id: string, password: string | null, useDefaultPassword: boolean) {
    await apiClient.post<void>(`/accounts/${id}/reset-password`, { password, useDefaultPassword });
  },
  async history(params: { page: number; pageSize: number; accountId?: string }) {
    const { data } = await apiClient.get<PagedAccountHistory>('/accounts/history', { params });
    return data;
  },
};
