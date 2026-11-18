import { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Store,
} from 'lucide-react';
import { appointmentApi } from '@/api/appointmentApi';
import type { TimeSlot, Appointment } from '@/types';
import { Button, Modal, SkeletonLoading } from '@/components/shared';

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
  const [itemCount, setItemCount] = useState<string>('');
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

    const parsedCount = parseInt(itemCount, 10);
    const safeCount = Number.isNaN(parsedCount) || parsedCount < 1 ? 1 : Math.min(50, parsedCount);

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await appointmentApi.createAppointment({
        appointmentDate: selectedDateString,
        timeSlotId: selectedSlotId,
        estimatedItemCount: safeCount,
        note: note.trim() || undefined,
        submissionMethod: 0, // Mang trực tiếp tại cửa hàng
      });

      setSuccessAppointment(created);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ocs:notification:refresh'));
      }
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
        <div className="rounded-2xl border border-danger/20 bg-state-danger-soft p-4 text-xs text-state-danger flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Step 1 & Step 2 */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* Block 1: Chọn ngày ký gửi */}
          <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E53E8A] text-xs font-bold text-white shadow-xs">
                  1
                </span>
                <h3 className="font-extrabold text-brand-ink text-base">
                  Chọn ngày ký gửi
                </h3>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-2 rounded-full bg-brand-pink-surface/80 border border-brand-pink-light/80 px-3 py-1 text-xs font-semibold text-brand-ink">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="text-text-muted hover:text-brand-ink transition"
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
                  className="text-text-muted hover:text-brand-ink transition"
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Interactive Month Calendar Grid */}
            <div>
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-text-muted pb-3 border-b border-border/60">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span className="text-brand-highlight font-extrabold">CN</span>
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
                            ? 'bg-brand-pink text-brand-ink font-extrabold shadow-sm ring-4 ring-brand-pink-light scale-105'
                            : isPast
                              ? 'text-text-muted/40 cursor-not-allowed'
                              : 'text-brand-ink hover:bg-brand-pink-surface font-semibold'
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
          <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E53E8A] text-xs font-bold text-white shadow-xs">
                  2
                </span>
                <h3 className="font-extrabold text-brand-ink text-base">
                  Khung giờ ngày {selectedDay}/{currentMonth < 10 ? `0${currentMonth}` : currentMonth}
                </h3>
              </div>

              {!loadingSlots && (
                <span className="rounded-full bg-brand-pink-surface border border-brand-pink-light px-3 py-1 text-[11px] font-bold text-brand-highlight">
                  Còn {availableCountNumber} khung khả dụng
                </span>
              )}
            </div>

            <div className="space-y-3">
              {loadingSlots ? (
                <SkeletonLoading variant="slots" label="Đang tải khung giờ..." />
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
                            ? 'border-border/60 bg-surface text-text-muted/60 cursor-not-allowed opacity-80'
                            : isSelected
                              ? 'border-brand-pink bg-brand-pink-light text-brand-highlight shadow-2xs ring-2 ring-brand-pink-focus/30 font-bold'
                              : 'border-border/80 bg-white hover:border-brand-pink hover:bg-brand-pink-surface/60 text-brand-ink'
                          }`}
                      >
                        <span className="text-xs font-bold">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span
                          className={`mt-1 text-[11px] font-semibold ${!isAvailable
                              ? 'text-text-muted/60'
                              : isSelected
                                ? 'text-brand-highlight font-bold'
                                : 'text-text-muted'
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

        {/* Right Column (5 cols): "Thông tin mang đồ" */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-xs space-y-5">
            <h3 className="font-extrabold text-brand-ink text-lg">
              Thông tin mang đồ
            </h3>

            {/* Field 1: Số món dự kiến (chỉ nhập và hiển thị số, ban đầu để hint) */}
            <div>
              <label className="block text-xs font-bold text-brand-ink mb-1.5">
                Số món dự kiến *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={itemCount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setItemCount(val);
                }}
                onBlur={() => {
                  if (!itemCount.trim()) return;
                  const num = parseInt(itemCount, 10);
                  if (Number.isNaN(num) || num < 1) {
                    setItemCount('1');
                  } else if (num > 50) {
                    setItemCount('50');
                  } else {
                    setItemCount(String(num));
                  }
                }}
                placeholder="Ví dụ: 1"
                className="w-full rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm font-bold text-brand-ink outline-none transition placeholder:text-muted/70 focus:border-brand-pink-focus focus:ring-2 focus:ring-brand-pink/25"
              />
            </div>

            {/* Field 2: Hình thức tiếp nhận (Chỉ hiển thị 1 hình thức trực tiếp tại shop, bỏ combobox) */}
            <div>
              <label className="block text-xs font-bold text-brand-ink mb-1.5">
                Hình thức tiếp nhận
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm font-semibold text-brand-ink">
                <Store size={18} className="text-brand-highlight shrink-0" />
                <span>Mang trực tiếp tại cửa hàng</span>
              </div>
            </div>

            {/* Field 3: Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-brand-ink mb-1.5">
                Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quần áo và một túi xách..."
                className="w-full rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm font-medium text-brand-ink outline-none transition placeholder:text-muted/70 focus:border-brand-pink-focus focus:ring-2 focus:ring-brand-pink/25"
              />
            </div>

            <p className="text-[11px] text-text-muted">
              Mức giá cuối cùng được thỏa thuận sau khi cửa hàng kiểm định thực tế.
            </p>

            {/* Action Button: Nút màu hồng pastel chuẩn dự án */}
            <button
              type="submit"
              disabled={submitting || !selectedSlotId}
              className="w-full rounded-full bg-button-pastel hover:bg-button-pastel-hover text-brand-ink py-3.5 text-center text-sm font-extrabold shadow-sm transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang đặt lịch...' : 'Xác nhận đặt lịch'}
            </button>

            {/* Checklist Before Bringing Clothes */}
            <div className="pt-4 border-t border-border/60 space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-brand-ink">
                <Sparkles size={14} className="text-brand-highlight" />
                Chuẩn bị trước khi mang đồ đến
              </p>

              <div className="space-y-2 text-[11px] text-text-secondary leading-relaxed">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-brand-highlight shrink-0 mt-0.5" />
                  <span>Giặt ủi sạch sẽ, đảm bảo khóa kéo và khuy áo nguyên vẹn.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-brand-highlight shrink-0 mt-0.5" />
                  <span>Mang kèm phụ kiện, túi bọc hoặc hóa đơn mua gốc (nếu là đồ hiệu).</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-brand-highlight shrink-0 mt-0.5" />
                  <span>Được nhận tiền mặt hoặc chuyển khoản ngay khi hoàn tất đợt bán.</span>
                </div>
              </div>

              <a
                href="/consign"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-highlight hover:text-brand-ink hover:underline pt-1 transition"
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight">
                <CheckCircle2 size={32} />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-brand-pink-surface/50 p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Mã phiếu hẹn:</span>
                <span className="font-extrabold text-brand-highlight">
                  {successAppointment.trackingNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Ngày hẹn:</span>
                <span className="font-bold text-brand-ink">
                  {successAppointment.appointmentDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Khung giờ:</span>
                <span className="font-bold text-brand-ink">
                  {successAppointment.timeSlotDisplay}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Số lượng đồ dự kiến:</span>
                <span className="font-bold text-brand-ink">
                  {successAppointment.estimatedItemCount} món
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-text-muted">
              Dữ liệu đã được lưu trữ bền vững trên máy chủ. Tải lại trang (F5) lịch hẹn vẫn còn nguyên vẹn trong tài khoản của bạn.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}