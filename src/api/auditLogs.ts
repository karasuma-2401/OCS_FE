import { apiClient } from './client';

export interface AuditLogFilterParams {
  from?: string;
  to?: string;
  entityType?: string;
  action?: string;
  actorType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogItem {
  id: string;
  actorAccountId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string;
  reason: string | null;
  source: string;
  occurredAt: string;
}

export interface PagedAuditLogs {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const auditLogsApi = {
  async search(params: AuditLogFilterParams): Promise<PagedAuditLogs> {
    const query: Record<string, string | number> = {};
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
    if (params.entityType) query.entityType = params.entityType;
    if (params.action) query.action = params.action;
    if (params.actorType) query.actorType = params.actorType;
    if (params.search) query.search = params.search;
    if (params.page) query.page = params.page;
    if (params.pageSize) query.pageSize = params.pageSize;
    return (await apiClient.get<PagedAuditLogs>('/audit-logs', { params: query })).data;
  },
};
