import { apiClient } from './client';

export interface FunctionPermission {
  code: string;
  name: string;
  description: string | null;
  isRequiredForAdmin: boolean;
  allowedRoleCodes: string[];
}

export interface RolePermissions {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissionCodes: string[];
  isProtected: boolean;
}

export const rolePermissionsApi = {
  async getPermissions() {
    const { data } = await apiClient.get<FunctionPermission[]>('/permissions');
    return data;
  },
  async getRoles() {
    const { data } = await apiClient.get<RolePermissions[]>('/roles');
    return data;
  },
  async update(roleId: string, permissionCodes: string[], expectedPermissionCodes: string[]) {
    const { data } = await apiClient.put<RolePermissions>(`/roles/${roleId}/permissions`, { permissionCodes, expectedPermissionCodes });
    return data;
  },
};
