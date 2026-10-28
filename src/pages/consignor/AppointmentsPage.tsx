import React, { useState } from 'react';
import { Calendar, Clock, Package, CheckCircle2 } from 'lucide-react';
import type { Appointment } from '@/types';

export const AppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-001',
      consignorName: 'Nguyễn Văn A',
      consignorPhone: '0901234567',
      scheduledDate: '2026-11-02',
      timeSlot: '09:00 - 11:00',
      expectedItemCount: 5,
      status: 'Confirmed',
      note: 'Mang theo áo blazer dạ và váy thiết kế',
    },
  ]);

  const [formData, setFormData] = useState({
    consignorName: '',
    consignorPhone: '',
    scheduledDate: '',
    timeSlot: '09:00 - 11:00',
    expectedItemCount: 3,
    note: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      ...formData,
      status: 'Pending',
    };
    setAppointments([newAppointment, ...appointments]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setFormData({
      consignorName: '',
      consignorPhone: '',
      scheduledDate: '',
      timeSlot: '09:00 - 11:00',
      expectedItemCount: 3,
      note: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold text-[#18211D]">Đặt Lịch Ký Gửi Quần Áo</h1>
        <p className="text-sm text-[#6B7C72] mt-1">
          Hẹn lịch tiếp nhận tại cửa hàng để chuyên viên OCS kiểm định chất lượng, phân hạng thương hiệu và lập hợp đồng ký gửi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-5 bg-[#FFFDF8] rounded-2xl p-6 sm:p-8 border border-[#E2DBD0] shadow-sm space-y-6">
          <div className="border-b border-[#E2DBD0] pb-4">
            <h2 className="text-lg font-bold text-[#18211D]">Thông tin lịch hẹn mới</h2>
            <p className="text-xs text-[#6B7C72]">Vui lòng điền thông tin chính xác để nhận tin nhắn xác nhận.</p>
          </div>

          {submitted && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>Đặt lịch hẹn thành công! Cửa hàng sẽ liên hệ xác nhận sớm nhất.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Họ và tên người ký gửi</label>
              <input
                type="text"
                required
                value={formData.consignorName}
                onChange={(e) => setFormData({ ...formData, consignorName: e.target.value })}
                placeholder="Ví dụ: Lê Minh"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Số điện thoại liên hệ</label>
              <input
                type="tel"
                required
                value={formData.consignorPhone}
                onChange={(e) => setFormData({ ...formData, consignorPhone: e.target.value })}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Ngày hẹn</label>
                <input
                  type="date"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Khung giờ</label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                >
                  <option value="09:00 - 11:00">09:00 - 11:00</option>
                  <option value="11:00 - 13:00">11:00 - 13:00</option>
                  <option value="14:00 - 16:00">14:00 - 16:00</option>
                  <option value="16:00 - 18:00">16:00 - 18:00</option>
                  <option value="18:00 - 20:00">18:00 - 20:00</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Số lượng món dự kiến</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.expectedItemCount}
                onChange={(e) => setFormData({ ...formData, expectedItemCount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18211D] mb-1.5 uppercase">Ghi chú (Tùy chọn)</label>
              <textarea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Loại trang phục, nhãn hiệu hoặc yêu cầu đặc biệt..."
                className="w-full px-4 py-2 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#EF9F45] text-[#18211D] font-extrabold text-sm hover:bg-[#F3AF62] transition-colors shadow-md"
            >
              Xác nhận Đặt lịch hẹn
            </button>
          </form>
        </div>

        {/* Existing Appointments List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-lg font-bold text-[#18211D]">Danh sách lịch hẹn gần đây</h2>

          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-[#FFFDF8] rounded-2xl p-5 border border-[#E2DBD0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#18211D]">{apt.consignorName}</span>
                    <span className="text-xs text-[#6B7C72]">({apt.consignorPhone})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7C72]">
                    <span className="flex items-center gap-1 font-medium text-[#18211D]">
                      <Calendar className="w-3.5 h-3.5 text-[#EF9F45]" />
                      {apt.scheduledDate}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-[#18211D]">
                      <Clock className="w-3.5 h-3.5 text-[#EF9F45]" />
                      {apt.timeSlot}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      {apt.expectedItemCount} món
                    </span>
                  </div>
                  {apt.note && (
                    <div className="text-xs text-[#6B7C72] italic pt-1">
                      "{apt.note}"
                    </div>
                  )}
                </div>

                <div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      apt.status === 'Confirmed'
                        ? 'bg-green-100 text-green-800'
                        : apt.status === 'Completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {apt.status === 'Confirmed' ? 'Đã xác nhận' : apt.status === 'Completed' ? 'Đã tiếp nhận' : 'Chờ duyệt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

