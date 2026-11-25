import type { BadgeVariant } from "@/components/shared";

export const UNASSIGNED_LOCATION_VALUE = "__unassigned__";

export const statusLabels: Record<string, string> = {
  PendingProcessing: "Chờ xử lý",
  OnSale: "Đang bán",
  IncidentPending: "Tạm giữ · chờ xác minh sự cố",
  Sold: "Đã bán",
  Expired: "Hết hạn",
  Donated: "Đã quyên góp",
  Returned: "Đã trả",
  EarlyWithdrawn: "Rút trước hạn",
  Compensated: "Đã bồi thường",
  Cancelled: "Đã hủy",
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Từ chối",
};

export const saleStatuses = [
  "PendingProcessing",
  "OnSale",
  "IncidentPending",
  "Sold",
  "Expired",
  "Returned",
  "Donated",
  "EarlyWithdrawn",
  "Compensated",
  "Cancelled",
] as const;

export const approvalStatuses = ["Pending", "Approved"] as const;

export const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp → cao" },
  { value: "price_desc", label: "Giá cao → thấp" },
  { value: "condition_desc", label: "Tình trạng cao nhất" },
  { value: "name_asc", label: "Tên A → Z" },
] as const;

export function statusLabel(value: string | null | undefined): string {
  return value ? (statusLabels[value] ?? value) : "—";
}

export function statusBadgeVariant(value: string): BadgeVariant {
  if (value === "Approved" || value === "OnSale") return "success";
  if (value === "Sold") return "payment";
  if (value === "Pending" || value === "PendingProcessing" || value === "IncidentPending") return "warning";
  if (value === "Rejected" || value === "Cancelled" || value === "Expired")
    return "danger";
  if (value === "Donated" || value === "Compensated") return "info";
  return "neutral";
}

export function inventoryErrorText(error: unknown): string {
  const problem = error as {
    response?: { status?: number; data?: { title?: string; detail?: string } };
  };
  if (problem.response?.status === 403)
    return "Tài khoản không có quyền thực hiện thao tác này.";
  return (
    problem.response?.data?.detail ||
    problem.response?.data?.title ||
    "Không thể hoàn tất thao tác. Vui lòng thử lại."
  );
}

interface ProductDetailsSnapshot {
  Name?: string;
  Size?: string;
  Description?: string | null;
  ConditionPercentage?: number;
}

/** Parses serialized product detail snapshots into readable field diffs. */
export function parseDetailsDiff(
  previousValue: string | null,
  newValue: string | null,
): string[] {
  if (!previousValue || !newValue) return [];
  try {
    const prev = JSON.parse(previousValue) as ProductDetailsSnapshot;
    const next = JSON.parse(newValue) as ProductDetailsSnapshot;
    const changes: string[] = [];
    if (prev.Name !== next.Name && next.Name !== undefined) {
      changes.push(`Tên: "${prev.Name ?? "—"}" → "${next.Name}"`);
    }
    if (prev.Size !== next.Size && next.Size !== undefined) {
      changes.push(`Size: ${prev.Size ?? "—"} → ${next.Size}`);
    }
    if (
      prev.ConditionPercentage !== next.ConditionPercentage &&
      next.ConditionPercentage !== undefined
    ) {
      changes.push(
        `Tình trạng: ${prev.ConditionPercentage ?? "—"}% → ${next.ConditionPercentage}%`,
      );
    }
    if ((prev.Description ?? "") !== (next.Description ?? "")) {
      changes.push("Mô tả sản phẩm đã được cập nhật");
    }
    return changes;
  } catch {
    return [];
  }
}
