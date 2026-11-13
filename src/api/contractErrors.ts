import { parseProblemDetails } from './auth';

/** Thông báo theo tài nguyên và trạng thái, không hiển thị dữ liệu lỗi nội bộ. */
export function contractLoadError(resource: string, error: unknown): string {
  const { status } = parseProblemDetails(error);
  if (status === 0) return `Không thể kết nối để tải ${resource}. Vui lòng kiểm tra kết nối tới máy chủ.`;
  if (status === 401) return `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem ${resource}.`;
  if (status === 403) return `Bạn không có quyền xem ${resource}.`;
  if (status === 404) return `Không tìm thấy ${resource}.`;
  if (status && status >= 500) return `Không thể tải ${resource} (HTTP ${status}). Vui lòng kiểm tra API và cơ sở dữ liệu.`;
  return `Không thể tải ${resource}${status ? ` (HTTP ${status})` : ''}. Vui lòng thử lại.`;
}

export async function loadContractPart<T>(resource: string, operation: Promise<T>): Promise<T> {
  try { return await operation; }
  catch (error) { throw new Error(contractLoadError(resource, error)); }
}
