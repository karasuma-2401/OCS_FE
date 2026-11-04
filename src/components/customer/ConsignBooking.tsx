import { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { appointmentApi } from '@/api/appointmentApi';
import type { TimeSlot, Appointment } from '@/types';
import { Button, Modal } from '@/components/shared';

interface ConsignBookingProps {
  onBookingSuccess?: (appointment: Appointment) => void;
  onViewHistory?: () => void;
}

export function ConsignBooking({
  onBookingSuccess,
  onViewHistory,
}: ConsignBookingProps) {
  const [today] = useState(() => new Date());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const getFormattedDate = (year: number, month: number, day: number) => {
    const m = month < 10 ? `0${month}` : `${month}`;
    const d = day < 10 ? `0${day}` : `${day}`;
    return `${year}-${m}-${d}`;
  };

  const selectedDateString = getFormattedDate(currentYear, currentMonth, selectedDay);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [itemCount, setItemCount] = useState<number>(1);
  const [submissionMethod, setSubmissionMethod] = useState<string>('Mang trực tiếp tại cửa hàng');
  const [note, setNote] = useState<string>('');

  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<Appointment | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    setSelectedDay(1);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(1);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7; // Monday = 0, Sunday = 6

  // Fetch slots for selected date
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setErrorMsg(null);
      setSelectedSlotId('');
      try {
        const slots = await appointmentApi.getAvailableSlots(selectedDateString);
        if (isMounted) {
          setTimeSlots(slots);
          setSelectedSlotId(slots.find((slot) => slot.isAvailable)?.id ?? '');
        }
      } catch {
        if (isMounted) {
          setTimeSlots([]);
          setErrorMsg('Không thể tải khung giờ. Vui lòng thử lại sau.');
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDateString]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setErrorMsg('Vui lòng chọn khung giờ hẹn.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await appointmentApi.createAppointment({
        appointmentDate: selectedDateString,
        timeSlotId: selectedSlotId,
        estimatedItemCount: itemCount,
        note: note.trim() || undefined,
        submissionMethod: submissionMethod.includes('chuyển phát') ? 1 : 0,
      });

      setSuccessAppointment(created);
      if (onBookingSuccess) onBookingSuccess(created);
    } catch {
      setErrorMsg('Không thể đặt lịch. Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableCountNumber = timeSlots.filter((s) => s.isAvailable).length;

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Main 2-Column Grid (Exact Figma 529-10373) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Step 1 & Step 2 */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* Block 1: Chọn ngày ký gửi */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B83280] text-xs font-bold text-white">
                  1
                </span>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Chọn ngày ký gửi
                </h3>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-2 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-800">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="text-gray-500 hover:text-gray-900 transition"
                  aria-label="Tháng trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  Tháng {currentMonth} năm {currentYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="text-gray-500 hover:text-gray-900 transition"
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Interactive Month Calendar Grid */}
            <div>
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 pb-3 border-b border-gray-100">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span className="text-red-500">CN</span>
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-y-2.5 pt-3 text-center text-xs">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDay === day;
                  const date = new Date(currentYear, currentMonth - 1, day);
                  const firstAllowed = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const lastAllowed = new Date(firstAllowed);
                  lastAllowed.setDate(lastAllowed.getDate() + 14);
                  const isPast = date < firstAllowed || date > lastAllowed;

                  return (
                    <div key={day} className="flex justify-center">
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => setSelectedDay(day)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${isSelected
                          ? 'bg-[#E53E8A] text-white shadow-md ring-4 ring-pink-100 scale-105'
                          : isPast
                            ? 'text-gray-400 hover:text-gray-700'
                            : 'text-gray-800 hover:bg-gray-100'
                          }`}
                      >
                        {day}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Block 2: Khung giờ ngày DD/MM */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B83280] text-xs font-bold text-white">
                  2
                </span>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Khung giờ ngày {selectedDay}/{currentMonth < 10 ? `0${currentMonth}` : currentMonth}
                </h3>
              </div>

              <span className="rounded-full bg-pink-50 border border-pink-100 px-3 py-1 text-[11px] font-bold text-[#E53E8A]">
                Còn {availableCountNumber} khung khả dụng
              </span>
            </div>

            <div className="space-y-3">

              {loadingSlots ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  Đang tải khung giờ...
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    const isAvailable = slot.isAvailable;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`flex flex-col items-center justify-center py-3.5 px-4 rounded-2xl border text-center transition-all ${!isAvailable
                          ? 'border-gray-100 bg-[#F4F6F9] text-gray-400 cursor-not-allowed opacity-80'
                          : isSelected
                            ? 'border-[#E53E8A] bg-[#E53E8A] text-white shadow-md ring-2 ring-pink-200'
                            : 'border-blue-100 bg-[#F0F7FF] hover:border-blue-300 text-gray-800'
                          }`}
                      >
                        <span className="text-xs font-bold">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span
                          className={`mt-1 text-[11px] font-semibold ${!isAvailable
                            ? 'text-gray-400'
                            : isSelected
                              ? 'text-pink-100'
                              : 'text-blue-600'
                            }`}
                        >
                          {!isAvailable
                            ? 'Hết chỗ'
                            : isSelected
                              ? 'Đang chọn'
                              : `Còn ${slot.availableCount} chỗ`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column (5 cols): "Thông tin mang đồ" (Exact Figma 529-10373) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
            <h3 className="font-extrabold text-gray-900 text-lg">
              Thông tin mang đồ
            </h3>

            {/* Field 1: Số món dự kiến */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Số món dự kiến *
              </label>
              <input
                type="text"
                value={`${itemCount} món`}
                onChange={(e) => {
                  const num = parseInt(e.target.value.replace(/\D/g, '')) || 1;
                  setItemCount(Math.min(50, Math.max(1, num)));
                }}
                className="w-full rounded-2xl border border-gray-100 bg-[#F2F6FC] px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-pink-300 focus:bg-white"
                required
              />
            </div>

            {/* Field 2: Hình thức tiếp nhận */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Hình thức tiếp nhận
              </label>
              <select
                value={submissionMethod}
                onChange={(e) => setSubmissionMethod(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-[#F2F6FC] px-4 py-3 text-xs font-semibold text-gray-900 outline-none focus:border-pink-300 focus:bg-white"
              >
                <option value="Mang trực tiếp tại cửa hàng">
                  Mang trực tiếp tại cửa hàng
                </option>
                <option value="Gửi chuyển phát qua bưu điện">
                  Gửi chuyển phát qua bưu điện
                </option>
              </select>
            </div>

            {/* Field 3: Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quần áo và một túi xách..."
                className="w-full rounded-2xl border border-gray-100 bg-[#F2F6FC] px-4 py-3 text-xs font-medium text-gray-900 outline-none focus:border-pink-300 focus:bg-white"
              />
            </div>

            <p className="text-[11px] text-gray-500">
              Mức giá cuối cùng được thỏa thuận sau khi cửa hàng kiểm định thực tế.
            </p>

            {/* Action Button: Pink Pill Button (Exact Figma 529-10373) */}
            <button
              type="submit"
              disabled={submitting || !selectedSlotId}
              className="w-full rounded-full bg-[#E53E8A] py-3.5 text-center text-sm font-extrabold text-white shadow-md transition hover:bg-[#D42A77] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
            </button>

            {/* Checklist Before Bringing Clothes */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <Sparkles size={14} className="text-[#E53E8A]" />
                Chuẩn bị trước khi mang đồ đến
              </p>

              <div className="space-y-2 text-[11px] text-gray-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-[#E53E8A] shrink-0 mt-0.5" />
                  <span>Giặt ủi sạch sẽ, đảm bảo khóa kéo và khuy áo nguyên vẹn.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-[#E53E8A] shrink-0 mt-0.5" />
                  <span>Mang kèm phụ kiện, túi bọc hoặc hóa đơn mua gốc (nếu là đồ hiệu).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-[#E53E8A] shrink-0 mt-0.5" />
                  <span>Được nhận tiền mặt hoặc chuyển khoản ngay khi hoàn tất đợt bán.</span>
                </div>
              </div>

              <a
                href="/consign"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#E53E8A] hover:underline pt-1"
              >
                Xem quy chuẩn các đợt ký gửi <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </form>

      {/* Booking Success Modal */}
      {successAppointment && (
        <Modal
          open={Boolean(successAppointment)}
          onClose={() => setSuccessAppointment(null)}
          title="Đặt lịch hẹn thành công!"
          description="Lịch hẹn ký gửi của bạn đã được ghi nhận vào hệ thống."
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSuccessAppointment(null)}
              >
                Đặt thêm lịch
              </Button>
              {onViewHistory && (
                <Button
                  onClick={() => {
                    setSuccessAppointment(null);
                    onViewHistory();
                  }}
                >
                  Xem danh sách lịch hẹn
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-[#E53E8A]">
                <CheckCircle2 size={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-[#F9FBFD] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã phiếu hẹn:</span>
                <span className="font-extrabold text-[#E53E8A]">
                  {successAppointment.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ngày hẹn:</span>
                <span className="font-bold text-gray-900">
                  {successAppointment.appointmentDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Khung giờ:</span>
                <span className="font-bold text-gray-900">
                  {successAppointment.timeSlotDisplay}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số lượng đồ dự kiến:</span>
                <span className="font-bold text-gray-900">
                  {successAppointment.estimatedItemCount} món
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500">
              Dữ liệu đã được lưu trữ bền vững trên máy chủ. Tải lại trang (F5) lịch hẹn vẫn còn nguyên vẹn trong tài khoản của bạn.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
