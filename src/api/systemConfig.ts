import { apiClient } from './client';

export interface CommissionTierRates {
  noBrand: number;
  localBrand: number;
  commercial: number;
  luxury: number;
}

export interface SystemConfig {
  consignmentDurationDays: number;
  commissionTierRates: CommissionTierRates;
  earlyWithdrawalFeeRate: number;
  payoutAutoConfirmHours: number;
  version: string;
}

export interface ReceptionDefaults {
  consignmentDurationDays: number;
  commissionTierRates: CommissionTierRates;
}

export type UpdateSystemConfigPayload = SystemConfig;

export const systemConfigApi = {
  async defaults(): Promise<ReceptionDefaults> {
    return (await apiClient.get<ReceptionDefaults>('/system-config/defaults')).data;
  },
  async get(): Promise<SystemConfig> {
    return (await apiClient.get<SystemConfig>('/system-config')).data;
  },
  async update(payload: UpdateSystemConfigPayload): Promise<SystemConfig> {
    return (await apiClient.put<SystemConfig>('/system-config', payload)).data;
  },
};
