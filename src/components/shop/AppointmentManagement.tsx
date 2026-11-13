import { useState, useEffect, useMemo } from "react";
import { Search, XCircle, UserX, RotateCcw } from "lucide-react";
import { appointmentApi } from "@/api/appointmentApi";
import type { Appointment, AppointmentStatus } from "@/types";
import {
  Button,
  Combobox,
  Modal,
  PageHeaderCard,
  SkeletonLoading,
  Toast,
} from "@/components/shared";
import { InlineCalendar, calendarISO } from "@/components/shared/calendar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConsignmentReceptionModal } from "./reception";
import { useAuth } from "@/context/AuthContext";

interface AppointmentManagementProps {
  onSwitchRole?: () => void;
}

export function AppointmentManagement({
  onSwitchRole,
}: AppointmentManagementProps = {}) {
  const { hasPermission, isStaffOrAdmin, hasRole } = useAuth();
  const canUpdate =
    hasPermission("appointments.staff.update") ||
    isStaffOrAdmin ||
    hasRole("Staff") ||
    hasRole("Manager") ||
    hasRole("Admin");
  const canReceive =
    hasPermission("appointments.staff.reception") ||
    isStaffOrAdmin ||
    hasRole("Staff") ||
    hasRole("Manager") ||
    hasRole("Admin");
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    calendarISO(new Date()),
  );

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    message: string;
    variant: "success" | "error";
  } | null>(null);

  const [actionModalType, setActionModalType] = useState<
    "noshow" | "cancel" | "restore" | null
  >(null);
  const [actionReason, setActionReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const [receptionModalOpen, setReceptionModalOpen] = useState(false);
  const [receptionAppointment, setReceptionAppointment] =
    useState<Appointment | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await appointmentApi.getStaffAppointments({
        date: selectedDate,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as AppointmentStatus),
        search: searchKeyword || undefined,
      });

      setAppointments(data);
      setSelectedAppointmentId((current) =>
        data.some((item) => item.id === current)
          ? current
          : (data[0]?.id ?? ""),
      );
    } catch {
      setAppointments([]);
      setSelectedAppointmentId("");
      setToastMessage({
        title: "Không tải được lịch hẹn",
        message: "Vui lòng thử lại sau.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 15000);
    const handleFocus = () => fetchAppointments();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedDate, statusFilter]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchesSearch =
        !searchKeyword.trim() ||
        a.customerName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        a.customerPhone.includes(searchKeyword) ||
        a.trackingNumber.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchKeyword, statusFilter]);

  const activeAppointment = useMemo(() => {
    return (
      appointments.find((a) => a.id === selectedAppointmentId) ||
      appointments[0] ||
      null
    );
  }, [appointments, selectedAppointmentId]);

  const handleExecuteStatusUpdate = async () => {
    if (!activeAppointment || !actionModalType) return;
    setActionLoading(true);
    try {
      let targetStatus: AppointmentStatus;
      if (actionModalType === "noshow") targetStatus = "NoShow";
      else if (actionModalType === "cancel") targetStatus = "Cancelled";
      else if (actionModalType === "restore") targetStatus = "Scheduled";
      else return;

      const updated = await appointmentApi.updateStatus(activeAppointment.id, {
        status: targetStatus,
        reason: actionReason.trim() || undefined,
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );

      const actionText =
        targetStatus === "Cancelled"
          ? "đã hủy"
          : targetStatus === "NoShow"
            ? "không đến"
            : "đã đặt lịch";

      setToastMessage({
        title: "Thành công",
        message: `Đã cập nhật trạng thái lịch hẹn ${updated.trackingNumber} (${actionText}).`,
        variant: "success",
      });

      setActionModalType(null);
      setActionReason("");
    } catch {
      setToastMessage({
        title: "Không thể cập nhật",
        message: "Vui lòng thử lại sau.",
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReception = () => {
    if (!activeAppointment) return;
    setReceptionAppointment(activeAppointment);
    setReceptionModalOpen(true);
  };

  const handleDirectReception = () => {
    setReceptionAppointment(null);
    setReceptionModalOpen(true);
  };

  const renderFigmaBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-block rounded-full bg-[#E6F4EA] px-3 py-1 text-[11px] font-bold text-[#1E7E34]">
            Đã tiếp nhận
          </span>
        );
      case "Scheduled":
        return (
          <span className="inline-block rounded-full bg-[#EDF2FE] px-3 py-1 text-[11px] font-bold text-[#4F46E5]">
            Đã đặt lịch
          </span>
        );
      case "CheckedIn":
        return (
          <span className="inline-block rounded-full bg-cyan-50 border border-cyan-200/60 px-3 py-1 text-[11px] font-bold text-cyan-800">
            Đã đến quầy
          </span>
        );
      case "NoShow":
        return (
          <span className="inline-block rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-[11px] font-bold text-amber-700">
            Không đến
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full">
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm pointer-events-auto shadow-xl">
          <Toast
            variant={toastMessage.variant}
            title={toastMessage.title}
            message={toastMessage.message}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      <ConsignmentReceptionModal
        open={receptionModalOpen}
        onClose={() => setReceptionModalOpen(false)}
        initialAppointment={receptionAppointment}
        onSuccess={(contract) => {
          setToastMessage({
            title: "Tiếp nhận thành công",
            message: `Phiếu tiếp nhận ${contract.contractNumber} (${contract.totalApprovedItems} món) đã được lưu.`,
            variant: "success",
          });
          fetchAppointments();
          setReceptionModalOpen(false);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-gray-900 tracking-tight">
          Lịch hẹn và tiếp nhận
        </h1>

        <div className="flex items-center gap-3">
          <NotificationBell />
          {onSwitchRole && (
            <button
              type="button"
              onClick={onSwitchRole}
              className="rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2 text-xs font-bold text-gray-800 shadow-sm transition hover:bg-white hover:border-gray-200"
            >
              Đổi vai trò
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap sm:flex-nowrap items-end gap-3">
            <Combobox
              className="w-full shrink-0 sm:w-48"
              label="Trạng thái lịch hẹn"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "Scheduled", label: "Đã đặt lịch" },
                { value: "Completed", label: "Đã tiếp nhận" },
                { value: "NoShow", label: "Không đến" },
                { value: "Cancelled", label: "Đã hủy" },
              ]}
            />

            <div className="flex-1 w-full sm:w-auto min-w-[200px]">
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Tìm lịch hẹn
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tên, SĐT hoặc mã hẹn..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/95 pl-9 pr-4 py-2.5 text-xs text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-pink-200"
                />
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-base">
              Lịch tiếp nhận
            </h3>

            {loading ? (
              <SkeletonLoading variant="table" columns={5} label="Đang tải lịch hẹn..." />
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Không tìm thấy lịch hẹn nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 pb-2.5">
                      <th className="pb-3 pl-3 font-bold w-32">Khung giờ</th>
                      <th className="pb-3 px-3 font-bold">Mã hẹn</th>
                      <th className="pb-3 px-3 font-bold">Khách hàng</th>
                      <th className="pb-3 px-3 font-bold text-center w-20">
                        Số món
                      </th>
                      <th className="pb-3 pr-3 font-bold text-center w-36">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/60">
                    {filteredAppointments.map((appt) => {
                      const isSelected = activeAppointment?.id === appt.id;

                      return (
                        <tr
                          key={appt.id}
                          onClick={() => setSelectedAppointmentId(appt.id)}
                          className={`cursor-pointer transition-all ${isSelected
                              ? "bg-[#EEF5FF] font-bold"
                              : "hover:bg-gray-50/70"
                            }`}
                        >
                          <td className="py-4 pl-3 pr-3 font-semibold text-gray-800 rounded-l-2xl">
                            {appt.startTime} - {appt.endTime}
                          </td>

                          <td className="py-4 px-3">
                            <span className="font-mono text-gray-500 text-[11px] whitespace-nowrap">
                              {appt.trackingNumber}
                            </span>
                          </td>

                          <td className="py-4 px-3 font-bold text-gray-900">
                            {appt.customerName}
                          </td>

                          <td className="py-4 px-3 text-center font-bold text-gray-800">
                            {appt.estimatedItemCount}
                          </td>

                          <td className="py-4 pr-3 pl-3 text-center rounded-r-2xl">
                            {renderFigmaBadge(appt.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-blue-100/70 bg-[#EAF2FC] p-4 sm:p-5 shadow-sm space-y-0.5">
            <h4 className="text-sm font-bold text-gray-900">
              Có thể tiếp nhận khách đến trực tiếp
            </h4>
            <p className="text-xs text-gray-600">
              Tra cứu số điện thoại trước khi tạo hồ sơ mới để tránh trùng
              khách.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-sm">
              Lịch tiếp nhận
            </h3>

            <InlineCalendar
              value={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-3.5">
            <h3 className="font-extrabold text-gray-900 text-sm">
              Lịch đang chọn
            </h3>

            {loading ? <SkeletonLoading variant="list" count={2} label="Đang tải lịch đang chọn..." /> : activeAppointment ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    {activeAppointment.customerName} •{" "}
                    {activeAppointment.trackingNumber}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedDate} •{" "}
                    {activeAppointment.timeSlotDisplay ||
                      `${activeAppointment.startTime} - ${activeAppointment.endTime}`}{" "}
                    • {activeAppointment.estimatedItemCount} món dự kiến
                  </p>
                </div>

                <div>{renderFigmaBadge(activeAppointment.status)}</div>

                <p className="text-[11px] text-gray-500">
                  Mang trực tiếp • Tra cứu hồ sơ trước tiếp nhận.
                </p>

                {canUpdate &&
                  activeAppointment.status !== "Completed" && (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {(activeAppointment.status === "Scheduled" ||
                        activeAppointment.status === "CheckedIn" ||
                        activeAppointment.status === "NoShow") && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionReason("");
                              setActionModalType("cancel");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition"
                          >
                            <XCircle size={15} className="text-red-500" /> Hủy hẹn
                          </button>
                        )}

                      {(activeAppointment.status === "Scheduled" ||
                        activeAppointment.status === "CheckedIn" ||
                        activeAppointment.status === "Cancelled") && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionReason("");
                              setActionModalType("noshow");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition"
                          >
                            <UserX size={15} className="text-amber-600" /> Không đến
                          </button>
                        )}

                      {(activeAppointment.status === "Cancelled" ||
                        activeAppointment.status === "NoShow") && (
                          <button
                            type="button"
                            onClick={() => {
                              setActionReason("");
                              setActionModalType("restore");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                          >
                            <RotateCcw size={15} className="text-blue-600" /> Đặt lại lịch
                          </button>
                        )}
                    </div>
                  )}

                {canReceive && (
                  <button
                    type="button"
                    onClick={handleStartReception}
                    disabled={
                      activeAppointment.status === "Cancelled" ||
                      activeAppointment.status === "NoShow" ||
                      activeAppointment.status === "Completed"
                    }
                    className="w-full rounded-2xl bg-button-pastel py-3 px-4 text-center text-sm font-bold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus enabled:active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activeAppointment.status === "Completed"
                      ? "Đã tiếp nhận hoàn tất"
                      : "Bắt đầu tiếp nhận"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">
                Chọn một lịch hẹn để xem chi tiết
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {canReceive && (
          <button
            type="button"
            onClick={handleStartReception}
            disabled={
              loading ||
              !activeAppointment ||
              activeAppointment.status === "Cancelled" ||
              activeAppointment.status === "NoShow" ||
              activeAppointment.status === "Completed"
            }
            className="w-full rounded-2xl bg-button-pastel py-3.5 px-6 text-center text-sm font-bold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tiếp nhận lịch đã chọn
          </button>
        )}

        <button
          type="button"
          onClick={handleDirectReception}
          className="w-full rounded-2xl border border-white/80 bg-white py-3.5 px-6 text-center text-sm font-bold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
        >
          Tiếp nhận khách trực tiếp
        </button>
      </div>

      {actionModalType && activeAppointment && (
        <Modal
          open={Boolean(actionModalType)}
          onClose={() => setActionModalType(null)}
          title={
            actionModalType === "noshow"
              ? "Xác nhận khách không đến"
              : actionModalType === "restore"
                ? "Khôi phục lịch hẹn"
                : "Xác nhận hủy lịch hẹn"
          }
          description={`Mã lịch hẹn: ${activeAppointment.trackingNumber} — Khách: ${activeAppointment.customerName}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setActionModalType(null)}
              >
                Đóng
              </Button>
              <Button
                variant={actionModalType === "cancel" ? "danger" : "primary"}
                loading={actionLoading}
                onClick={handleExecuteStatusUpdate}
              >
                Xác nhận
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <p className="text-xs text-gray-600">
              {actionModalType === "noshow"
                ? 'Đánh dấu khách hàng không đến theo lịch hẹn (Trạng thái: "Không đến"). Khách hàng sẽ nhận được thông báo qua hệ thống.'
                : actionModalType === "restore"
                  ? 'Khôi phục lịch hẹn này về trạng thái "Đã đặt lịch".'
                  : "Bạn đang thực hiện hủy lịch hẹn này theo yêu cầu của khách hoặc do cửa hàng bận đột xuất."}
            </p>

            {actionModalType !== "restore" && (
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Lý do ghi nhận (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionModalType === "noshow"
                      ? "Nhập ghi chú hoặc lý do khách không đến..."
                      : "Nhập lý do hủy lịch hẹn..."
                  }
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:border-pink-300"
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
