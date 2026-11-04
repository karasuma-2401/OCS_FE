import { apiClient } from './client';
import type { Notification } from '@/types';

export interface NotificationResponse {
  data: Notification[];
  unreadCount: number;
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
};

