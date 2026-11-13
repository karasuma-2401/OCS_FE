import { apiClient } from './client';
import type { Notification } from '@/types';

export interface NotificationResponse {
  data: Notification[];
  unreadCount: number;
}

export interface FcmStatusResponse {
  configured: boolean;
  registeredDeviceCount: number;
  devices: Array<{ deviceType: string; lastUsedAt: string }>;
}

export const notificationApi = {
  async getMyNotifications(limit = 50): Promise<NotificationResponse> {
    const response = await apiClient.get<NotificationResponse>('/notifications', {
      params: { limit },
    });
    return response.data;
  },

  async markAsRead(id: string): Promise<boolean> {
    const response = await apiClient.patch<boolean>(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<boolean> {
    const response = await apiClient.patch<boolean>('/notifications/read-all');
    return response.data;
  },

  async getFcmStatus(): Promise<FcmStatusResponse> {
    const response = await apiClient.get<FcmStatusResponse>('/notifications/fcm/status');
    return response.data;
  },

  async registerFcmToken(
    token: string,
    deviceType = 'Web',
  ): Promise<{ registered: boolean; configured: boolean; registeredDeviceCount: number }> {
    const response = await apiClient.post<{
      registered: boolean;
      configured: boolean;
      registeredDeviceCount: number;
    }>('/notifications/fcm/register-token', {
      token,
      deviceType,
    });
    return response.data;
  },

  async unregisterFcmToken(token: string): Promise<{ unregistered: boolean }> {
    const response = await apiClient.delete<{ unregistered: boolean }>(
      '/notifications/fcm/unregister-token',
      {
        data: { token },
      },
    );
    return response.data;
  },

  async sendTestNotification(): Promise<Notification> {
    const response = await apiClient.post<Notification>('/notifications/fcm/test');
    return response.data;
  },
};
