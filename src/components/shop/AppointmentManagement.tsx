import { useState, useEffect, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  FileSignature,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { appointmentApi } from "@/api/appointmentApi";
import type {
  Appointment,
  AppointmentStatus,
  StartReceptionResponse,
} from "@/types";
import {
  Button,
  Combobox,
  Modal,
  SkeletonLoading,
  Toast,
} from "@/components/shared";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { useAuth } from "@/context/AuthContext";

interface AppointmentManagementProps {
  onSwitchRole?: () => void;
}

export function AppointmentManagement({
  onSwitchRole,
}: AppointmentManagementProps = {}) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("appointments.staff.update");
  const canReceive = hasPermission("appointments.staff.reception");
  const [today] = useState(() => new Date());
  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth() + 1;
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const selectedDateFormatted = [
    calendarYear,
    String(calendarMonth).padStart(2, "0"),
    String(selectedDay).padStart(2, "0"),
  ].join("-");

  // Filter dropdowns
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Appointments data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    message: string;
    variant: "success" | "error";
  } | null>(null);

  // Status Action Modal
  const [actionModalType, setActionModalType] = useState<
    "checkin" | "noshow" | "cancel" | null
  >(null);
  const [actionReason, setActionReason] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Start Reception UC-02 Modal
  const [receptionData, setReceptionData] =
    useState<StartReceptionResponse | null>(null);
  const contractCreatedSuccess = false;

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const data = await appointmentApi.getStaffAppointments({
        date: selectedDateFormatted,
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
  }, [selectedDateFormatted, statusFilter]);

  // Filter in memory for instant search
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

  // Active appointment
  const activeAppointment = useMemo(() => {
    return (
      appointments.find((a) => a.id === selectedAppointmentId) ||
      appointments[0] ||
      null
    );
  }, [appointments, selectedAppointmentId]);

  // Handle Quick Status Update (CheckedIn, NoShow, Cancel)
  const handleExecuteStatusUpdate = async () => {
    if (!activeAppointment || !actionModalType) return;
    setActionLoading(true);
    try {
      let targetStatus: AppointmentStatus;
      if (actionModalType === "checkin") targetStatus = "CheckedIn";
      else if (actionModalType === "noshow") targetStatus = "NoShow";
      else if (actionModalType === "cancel") targetStatus = "Cancelled";
      else return;

      const updated = await appointmentApi.updateStatus(activeAppointment.id, {
        status: targetStatus,
        reason: actionReason.trim() || undefined,
      });

      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a)),
      );

      setToastMessage({
        title: "Thành công",
        message: `Đã cập nhật trạng thái lịch hẹn ${updated.trackingNumber}.`,
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

  // Handle Start Reception
  const handleStartReception = async () => {
    if (!activeAppointment) return;
    setActionLoading(true);
    try {
      const response = await appointmentApi.startReception(
        activeAppointment.id,
      );
      setReceptionData(response);
    } catch {
      setToastMessage({
        title: "Không thể bắt đầu tiếp nhận",
        message: "Vui lòng thử lại sau.",
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Contract creation requires a dedicated endpoint.
  const handleCompleteContract = () => {
    setToastMessage({
      title: "Chưa hỗ trợ",
      message: "Tạo hợp đồng chưa sẵn sàng.",
      variant: "error",
    });
  };

  // Render Badge matching Figma 39-1220
  const renderFigmaBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-block rounded-full bg-[#E6F4EA] px-3 py-1 text-[11px] font-bold text-[#1E7E34]">
            Đã tiếp nhận
          </span>
        );
      case "CheckedIn":
        return (
          <span className="inline-block rounded-full bg-[#EBF3FF] px-3 py-1 text-[11px] font-bold text-[#2563EB]">
            Chờ đến
          </span>
        );
      case "Scheduled":
        return (
          <span className="inline-block rounded-full bg-[#EDF2FE] px-3 py-1 text-[11px] font-bold text-[#4F46E5]">
            Đã đặt lịch
          </span>
        );
      case "NoShow":
        return (
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
            Vắng mặt
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

  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const firstDayOffset =
    (new Date(calendarYear, calendarMonth - 1, 1).getDay() + 6) % 7;

  return (
    <div className="w-full">
      {/* Toast alert */}
      {toastMessage && (
        <Toast
          variant={toastMessage.variant}
          title={toastMessage.title}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Header Row: Title on the left, NotificationBell & Đổi vai trò on the right */}
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

      {/* Main 2-Column*/}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols ~ 66% width) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Row */}
          <div className="flex flex-wrap sm:flex-nowrap items-end gap-3">
            <Combobox
              className="w-full shrink-0 sm:w-44"
              label="Ngày hẹn"
              value={String(selectedDay)}
              onChange={(value) => setSelectedDay(Number(value))}
              options={Array.from({ length: daysInMonth }, (_, i) => ({
                value: String(i + 1),
                label: `${String(i + 1).padStart(2, "0")}/${String(calendarMonth).padStart(2, "0")}/${calendarYear}`,
              }))}
            />
            <Combobox
              className="w-full shrink-0 sm:w-48"
              label="Trạng thái lịch hẹn"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                { value: "CheckedIn", label: "Chờ đến" },
                { value: "Scheduled", label: "Đã đặt lịch" },
                { value: "Completed", label: "Đã tiếp nhận" },
                { value: "NoShow", label: "Vắng mặt" },
                { value: "Cancelled", label: "Đã hủy" },
              ]}
            />

            {/* Input 3: Tìm lịch hẹn (Fills remaining width of Left Column) */}
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

          {/* Main Card: Lịch tiếp nhận */}
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
                          className={`cursor-pointer transition-all ${
                            isSelected
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

          {/* Banner Card below Table: Có thể tiếp nhận khách đến trực tiếp */}
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

        {/* Right Column (4 cols ~ 34% width) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Mini Calendar "Lịch tiếp nhận" */}
          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-gray-900 text-sm">
              Lịch tiếp nhận
            </h3>

            <div>
              <p className="text-xs font-bold text-gray-900 mb-3">
                Tháng {calendarMonth} năm {calendarYear}
              </p>

              {/* Day headers */}
              <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 pb-2">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-gray-700">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`offset-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const isDay28 = d === selectedDay;

                  return (
                    <div key={d} className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                          isDay28
                            ? "bg-[#F472B6] text-white font-bold shadow"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {d}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: "Lịch đang chọn" (Active Appointment Details) */}
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
                    {selectedDateFormatted} •{" "}
                    {activeAppointment.timeSlotDisplay ||
                      `${activeAppointment.startTime} - ${activeAppointment.endTime}`}{" "}
                    • {activeAppointment.estimatedItemCount} món dự kiến
                  </p>
                </div>

                <div>{renderFigmaBadge(activeAppointment.status)}</div>

                <p className="text-[11px] text-gray-500">
                  Mang trực tiếp • Tra cứu hồ sơ trước tiếp nhận.
                </p>

                {/* Cancel Button (Figma 39-1195) */}
                {canUpdate &&
                  activeAppointment.status !== "Completed" &&
                  activeAppointment.status !== "Cancelled" &&
                  activeAppointment.status !== "NoShow" && (
                    <button
                      type="button"
                      onClick={() => setActionModalType("cancel")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition"
                    >
                      <XCircle size={14} /> Hủy hẹn
                    </button>
                  )}

                {/* Big Pill Button: "Bắt đầu tiếp nhận" (Exact Figma 39-1195) */}
                {canReceive && (
                  <button
                    type="button"
                    onClick={handleStartReception}
                    disabled={
                      activeAppointment.status === "Cancelled" ||
                      activeAppointment.status === "NoShow"
                    }
                    className="w-full rounded-2xl bg-button-pastel py-3 px-4 text-center text-sm font-bold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus enabled:active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Bắt đầu tiếp nhận
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

      {/* Bottom Button Bar: Both buttons in 1 row with equal size (Exact Image / Figma) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {canReceive && (
          <button
            type="button"
            onClick={handleStartReception}
            disabled={loading || !activeAppointment}
            className="w-full rounded-2xl bg-button-pastel py-3.5 px-6 text-center text-sm font-bold text-brand-ink shadow-sm transition enabled:hover:bg-button-pastel-hover enabled:hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink-focus enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tiếp nhận lịch đã chọn
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            setToastMessage({
              title: "Chưa hỗ trợ",
              message: "Tiếp nhận khách trực tiếp chưa sẵn sàng.",
              variant: "error",
            })
          }
          className="w-full rounded-2xl border border-white/80 bg-white py-3.5 px-6 text-center text-sm font-bold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
        >
          Tiếp nhận khách trực tiếp
        </button>
      </div>

      {/* Confirmation Modal for Quick Status Updates */}
      {actionModalType && activeAppointment && (
        <Modal
          open={Boolean(actionModalType)}
          onClose={() => setActionModalType(null)}
          title={
            actionModalType === "checkin"
              ? "Xác nhận khách đã đến quầy"
              : actionModalType === "noshow"
                ? "Đánh dấu khách vắng mặt"
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
              {actionModalType === "checkin"
                ? 'Hệ thống sẽ cập nhật trạng thái lịch hẹn sang "Chờ đến (CheckedIn)" và gửi thông báo xác nhận tới khách hàng.'
                : actionModalType === "noshow"
                  ? "Đánh dấu khách hàng không đến đúng giờ hẹn (NoShow)."
                  : "Bạn đang thực hiện hủy lịch hẹn này theo yêu cầu khách hoặc do cửa hàng bận đột xuất."}
            </p>

            {actionModalType !== "checkin" && (
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Lý do ghi nhận
                </label>
                <textarea
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Nhập lý do..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:border-pink-300"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* UC-02 Inspection & Contract Creation Modal */}
      {receptionData && (
        <Modal
          open={Boolean(receptionData)}
          onClose={() => setReceptionData(null)}
          title="Tiếp Nhận Đồ Ký Gửi & Kiểm Định (UC-02)"
          description={`Lịch hẹn: ${receptionData.trackingNumber} — ${receptionData.customerName}`}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={() => setReceptionData(null)}
              >
                Hủy bỏ
              </Button>
              <Button
                loading={actionLoading}
                onClick={handleCompleteContract}
                startIcon={<FileSignature size={15} />}
              >
                Tạo hợp đồng & Cấp mã Barcode
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-1 text-xs">
            {contractCreatedSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-green-600" />
                <p className="text-sm font-bold text-gray-900">
                  Hợp đồng ký gửi đã được tạo thành công!
                </p>
                <p className="text-gray-500">
                  Lịch hẹn đã chuyển sang trạng thái "Đã tiếp nhận (Completed)".
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-400">Khách hàng:</span>
                    <p className="font-bold text-gray-900 text-sm">
                      {receptionData.customerName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {receptionData.customerPhone}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Số lượng mang đến:</span>
                    <p className="font-bold text-[#E53E8A] text-sm">
                      {receptionData.estimatedItemCount} món
                    </p>
                    <p className="text-[11px] text-gray-500 italic">
                      "{receptionData.note || "Không có ghi chú"}"
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                    Kiểm định tiêu chuẩn tại quầy:
                  </p>
                  <div className="space-y-1.5 rounded-xl border border-gray-100 p-3 bg-white">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="accent-pink-500"
                      />
                      <span>
                        Độ mới đạt chuẩn $\ge 80\%$, không ố mốc, không sờn rách
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="accent-pink-500"
                      />
                      <span>
                        Tem mác nguyên vẹn, phân hạng thương hiệu chuẩn xác
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="accent-pink-500"
                      />
                      <span>
                        Khách đồng ý phương án hoa hồng và hoàn trả/quyên góp
                      </span>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl bg-pink-50 p-3 text-pink-900 flex items-start gap-2">
                  <AlertCircle
                    size={16}
                    className="text-[#E53E8A] shrink-0 mt-0.5"
                  />
                  <p className="text-[11px] leading-relaxed">
                    Chức năng tạo hợp đồng và mã vạch chưa sẵn sàng.
                  </p>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
