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
  if (response?.status && response.status >= 500) return 'Hệ thống chưa thể hoàn tất thao tác. Vui lòng kiểm tra lại yêu cầu và thử lại sau.';
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

export function withdrawalFeeState(item: EarlyWithdrawal): { label: string; tone: 'neutral' | 'success' | 'warning'; caption: string } {
  const ended = item.status === 'Cancelled' || item.status === 'Rejected';
  if (item.totalPenaltyAmount > 0 && item.paymentStatus === 'Paid')
    return { label: 'Đã thu đủ phí', tone: 'success', caption: item.paidAt ? `Thu ngày ${withdrawalDate(item.paidAt)}` : 'Đã ghi nhận thanh toán' };
  if (item.paymentStatus === 'Partial')
    return { label: 'Đã thu một phần', tone: 'warning', caption: ended ? 'Liên hệ cửa hàng để đối chiếu phí đã thu' : 'Cần đối chiếu phần phí còn lại' };
  if (ended) return { label: 'Không cần đóng phí', tone: 'neutral', caption: 'Phí trên phiếu cũ · yêu cầu đã kết thúc' };
  if (item.totalPenaltyAmount === 0) return { label: 'Miễn phí', tone: 'success', caption: 'Theo thỏa thuận trên hợp đồng' };
  if (item.status === 'Pending') return { label: 'Chưa đến bước thu phí', tone: 'neutral', caption: 'Chỉ thu sau khi cửa hàng duyệt' };
  if (item.status === 'Approved') return { label: 'Chờ thu phí', tone: 'warning', caption: 'Thu đủ phí trước khi bàn giao' };
  return { label: 'Chưa ghi nhận đủ phí', tone: 'neutral', caption: 'Liên hệ cửa hàng để đối chiếu' };
}

export function withdrawalNextStep(item: EarlyWithdrawal, customer: boolean) {
  switch (item.status) {
    case 'Pending': return customer ? 'Cửa hàng đang xét duyệt. Bạn vẫn có thể hủy yêu cầu.' : 'Kiểm tra sản phẩm để duyệt hoặc từ chối yêu cầu.';
    case 'Approved': return item.paymentStatus === 'Paid'
      ? customer ? 'Phí đã được xử lý. Liên hệ cửa hàng để nhận hàng.' : 'Kiểm tra và xác nhận bàn giao đủ hàng cho khách.'
      : customer ? 'Liên hệ cửa hàng để thanh toán phí và nhận hàng.' : 'Xác nhận thu đủ phí, sau đó bàn giao hàng.';
    case 'Completed': return item.handedOverAt ? `Đã nhận đủ hàng · ${withdrawalDate(item.handedOverAt)}` : 'Đã hoàn tất bàn giao hàng.';
    case 'Cancelled': return customer ? 'Bạn đã hủy. Có thể gửi lại nếu món còn đủ điều kiện.' : 'Khách đã hủy yêu cầu. Không cần xử lý tiếp.';
    case 'Rejected': return customer ? 'Xem lý do bên dưới; có thể gửi lại khi món đủ điều kiện.' : 'Yêu cầu đã kết thúc. Lý do được hiển thị cho khách.';
    default: return 'Phiếu trước đây. Mở chi tiết để đối chiếu thông tin.';
  }
}
// Sum the server-rounded item amounts in minor units; do not recalculate the fee rate in the browser.
export function withdrawalEstimate(items: EligibleWithdrawalProduct[]) {
  return items.reduce((total, item) => total + Math.round(item.penaltyAmount * 100), 0) / 100;
}
