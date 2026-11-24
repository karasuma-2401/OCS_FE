import type { EarlyWithdrawal, EligibleWithdrawalProduct } from '@/api/earlyWithdrawals';

export const withdrawalLabels: Record<string, string> = {
  Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Bị từ chối',
  Cancelled: 'Đã hủy', Completed: 'Đã bàn giao', Legacy: 'Phiếu trước đây',
};
export const withdrawalMoney = (value: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ₫`;
export const withdrawalDate = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
}) : '—';
export function withdrawalError(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { title?: string; detail?: string } } })?.response;
  if (response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này hoặc hồ sơ không còn hoạt động.';
  return response?.data?.detail || response?.data?.title || 'Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.';
}
export function withdrawalActions(item: EarlyWithdrawal) {
  return {
    cancel: item.status === 'Pending', approve: item.status === 'Pending',
    reject: (item.status === 'Pending' || item.status === 'Approved') && !item.paidAt,
    pay: item.status === 'Approved' && item.paymentStatus !== 'Paid' && item.totalPenaltyAmount > 0,
    handover: item.status === 'Approved' && item.paymentStatus === 'Paid',
  };
}
// Sum the server-rounded item amounts in minor units; do not recalculate the fee rate in the browser.
export function withdrawalEstimate(items: EligibleWithdrawalProduct[]) {
  return items.reduce((total, item) => total + Math.round(item.penaltyAmount * 100), 0) / 100;
}
