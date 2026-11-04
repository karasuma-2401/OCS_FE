import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Package,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { appointmentApi } from '@/api/appointmentApi';
import type { Appointment, AppointmentStatus } from '@/types';
import { Badge, Button, Modal, Loading, EmptyState } from '@/components/shared';

interface MyBookingsProps {
  onNewBookingClick?: () => void;
}

export function MyBookings({ onNewBookingClick }: MyBookingsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cancellation state
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await appointmentApi.getMyHistory();
      setAppointments(data);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'Không tải được lịch sử lịch hẹn. Vui lòng thử lại sau.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;

    setCancelling(true);
    setCancelError(null);
    try {
      await appointmentApi.cancelAppointment(
        cancellingAppointment.id,
        cancelReason.trim() || undefined,
      );

      // Update local state
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === cancellingAppointment.id
            ? {
                ...item,
                status: 'Cancelled',
                cancellationReason: cancelReason || 'Khách hàng hủy trên ứng dụng.',
                canCancel: false,
              }
            : item,
        ),
      );

      setCancellingAppointment(null);
      setCancelReason('');
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        'Không thể hủy lịch hẹn này. Có thể đã quá giờ quy định.';
      setCancelError(message);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Scheduled':
        return <Badge variant="warning">Chờ tiếp nhận</Badge>;
      case 'CheckedIn':
        return <Badge variant="info">Đã đến quầy</Badge>;
      case 'Completed':
        return <Badge variant="success">Đã hoàn tất</Badge>;
      case 'Cancelled':
        return <Badge variant="danger">Đã hủy</Badge>;
      case 'NoShow':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">
            Vắng mặt
          </span>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loading label="Đang tải lịch hẹn từ hệ thống OCS..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink">
            Lịch hẹn ký gửi của bạn
          </h2>
          <p className="mt-1 text-xs text-muted">
            Theo dõi trạng thái các cuộc hẹn tiếp nhận đồ và quản lý lịch hẹn trực tiếp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchHistory} startIcon={<RotateCcw size={14} />}>
            Làm mới
          </Button>
          {onNewBookingClick && (
            <Button size="sm" onClick={onNewBookingClick} startIcon={<Sparkles size={14} />}>
              Đặt lịch mới
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-state-danger/30 bg-state-danger-soft p-4 text-xs text-state-danger flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchHistory} className="font-bold underline hover:no-underline">
            Thử lại
          </button>
        </div>
      )}

      {appointments.length === 0 ? (
        <EmptyState
          title="Chưa có lịch hẹn nào"
          description="Bạn chưa đặt lịch hẹn ký gửi quần áo nào tại OCS. Đặt lịch ngay hôm nay để được tiếp nhận nhanh chóng!"
          action={
            onNewBookingClick ? (
              <Button onClick={onNewBookingClick}>Đặt lịch ký gửi ngay</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="rounded-2xl border border-border bg-paper p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-accent-dark">
                      {appt.trackingNumber}
                    </span>
                  </div>
                  {getStatusBadge(appt.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Calendar size={15} className="text-muted" />
                    <span>
                      {new Date(appt.appointmentDate).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock size={15} className="text-muted" />
                    <span>{appt.timeSlotDisplay || `${appt.startTime} - ${appt.endTime}`}</span>
                  </div>

                  <div className="flex items-center gap-2 text-text-secondary">
                    <Package size={15} className="text-muted" />
                    <span>Ước tính: {appt.estimatedItemCount} món</span>
                  </div>

                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-muted">
                      {appt.submissionMethod === 'Shipping' ? 'Chuyển phát' : 'Tại quầy OCS'}
                    </span>
                  </div>
                </div>

                {appt.note && (
                  <p className="rounded-xl bg-surface p-2.5 text-xs text-text-secondary italic">
                    "{appt.note}"
                  </p>
                )}

                {appt.cancellationReason && (
                  <div className="rounded-xl bg-state-danger-soft p-2.5 text-xs text-state-danger">
                    <span className="font-bold">Lý do hủy:</span> {appt.cancellationReason}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-[11px] text-muted">
                  Tạo lúc: {new Date(appt.createdAt).toLocaleDateString('vi-VN')}
                </span>

                {appt.canCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingAppointment(appt);
                      setCancelReason('');
                      setCancelError(null);
                    }}
                    className="text-xs font-semibold text-state-danger hover:underline hover:text-state-danger-strong"
                  >
                    Hủy lịch hẹn
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingAppointment && (
        <Modal
          open={Boolean(cancellingAppointment)}
          onClose={() => setCancellingAppointment(null)}
          title="Xác nhận hủy lịch hẹn"
          description={`Bạn có chắc chắn muốn hủy lịch hẹn ${cancellingAppointment.trackingNumber} vào ngày ${cancellingAppointment.appointmentDate}?`}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => setCancellingAppointment(null)}
              >
                Giữ lịch
              </Button>
              <Button
                variant="danger"
                loading={cancelling}
                onClick={handleConfirmCancel}
              >
                Xác nhận hủy
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            {cancelError && (
              <div className="rounded-xl border border-state-danger/30 bg-state-danger-soft p-3 text-xs text-state-danger">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
                Lý do hủy (không bắt buộc)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Bận đột xuất, muốn đổi sang ngày khác..."
                className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-ink outline-none focus:border-brand-pink-focus"
              />
            </div>

            <div className="rounded-xl bg-surface p-3 text-xs text-muted space-y-1">
              <p>• Theo quy định, chỉ được hủy trước giờ hẹn tối thiểu 2 tiếng.</p>
              <p>• Sau khi hủy, slot sẽ được mở lại cho khách hàng khác.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
