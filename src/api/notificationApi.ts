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

export interface TestNotificationResponse extends Notification {
  pushDelivery: {
    targetedDeviceCount: number;
    successCount: number;
    failureCount: number;
    firebaseConfigured: boolean;
  } | null;
}

export interface GetNotificationsQuery {
  limit?: number;
  unreadOnly?: boolean;
  category?: string;
}

export const notificationApi = {
  async getMyNotifications(
    limitOrQuery: number | GetNotificationsQuery = 50,
  ): Promise<NotificationResponse> {
    const params: GetNotificationsQuery =
      typeof limitOrQuery === 'number'
        ? { limit: limitOrQuery }
        : { limit: 50, ...limitOrQuery };

    const response = await apiClient.get<NotificationResponse>('/notifications', {
      params,
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

  async sendTestNotification(category?: string): Promise<TestNotificationResponse> {
    const response = await apiClient.post<TestNotificationResponse>(
      '/notifications/fcm/test',
      null,
      {
        params: category ? { category } : undefined,
      },
    );
    return response.data;
  },
};
