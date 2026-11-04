import { apiClient } from './client';
import type {
  Appointment,
  TimeSlot,
  CreateAppointmentRequest,
  UpdateAppointmentStatusRequest,
  StartReceptionResponse,
  AppointmentStatus,
} from '@/types';

export const appointmentApi = {
  /**
   * Lấy danh sách khung giờ và số chỗ còn trống theo ngày
   */
  async getAvailableSlots(date: string): Promise<TimeSlot[]> {
    const response = await apiClient.get<TimeSlot[]>('/appointments/available-slots', {
      params: { date },
    });
    return response.data;
  },

  /**
   * Khách hàng đặt lịch hẹn ký gửi mới
   */
  async createAppointment(request: CreateAppointmentRequest): Promise<Appointment> {
    const response = await apiClient.post<Appointment>('/appointments', request);
    return response.data;
  },

  /**
   * Khách hàng xem lịch sử các lịch hẹn của mình (lưu DB, không mất khi reload)
   */
  async getMyHistory(): Promise<Appointment[]> {
    const response = await apiClient.get<Appointment[]>('/appointments/my-history');
    return response.data;
  },

  /**
   * Xem chi tiết một lịch hẹn
   */
  async getById(id: string): Promise<Appointment> {
    const response = await apiClient.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  /**
   * Khách hàng hủy lịch hẹn theo quy định (trước giờ hẹn 2 tiếng)
   */
  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const response = await apiClient.put<Appointment>(`/appointments/${id}/cancel`, {
      reason,
    });
    return response.data;
  },

  /**
   * Nhân viên xem danh sách lịch hẹn với bộ lọc
   */
  async getStaffAppointments(params: {
    date?: string;
    timeSlotId?: string;
    status?: AppointmentStatus;
    search?: string;
  }): Promise<Appointment[]> {
    const response = await apiClient.get<Appointment[]>('/appointments', {
      params: {
        date: params.date || undefined,
        timeSlotId: params.timeSlotId || undefined,
        status: params.status || undefined,
        search: params.search?.trim() || undefined,
      },
    });
    return response.data;
  },

  /**
   * Nhân viên cập nhật trạng thái lịch hẹn: CheckedIn, NoShow, Cancelled
   */
  async updateStatus(
    id: string,
    request: UpdateAppointmentStatusRequest,
  ): Promise<Appointment> {
    const response = await apiClient.patch<Appointment>(
      `/appointments/${id}/status`,
      request,
    );
    return response.data;
  },

  /**
   * Bắt đầu tiếp nhận từ lịch hẹn hợp lệ để sang luồng kiểm định & lập hợp đồng
   */
  async startReception(id: string): Promise<StartReceptionResponse> {
    const response = await apiClient.post<StartReceptionResponse>(
      `/appointments/${id}/start-reception`,
    );
    return response.data;
  },
};
