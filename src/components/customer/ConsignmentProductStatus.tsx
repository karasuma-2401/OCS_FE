import type { ConsignmentProduct } from '@/api/consignments';
import { Badge, type BadgeVariant } from '@/components/shared';

export const consignmentProductStatuses: Record<string, [string, BadgeVariant]> = {
  PendingProcessing: ['Chờ xử lý', 'warning'], OnSale: ['Đang bán', 'info'], Sold: ['Đã bán', 'success'], IncidentPending: ['Đang xác minh sự cố', 'warning'],
  Expired: ['Hết hạn, chờ xử lý', 'warning'], Donated: ['Đã quyên góp', 'neutral'], Returned: ['Đã trả lại', 'neutral'],
  EarlyWithdrawn: ['Đã rút trước hạn', 'neutral'], Compensated: ['Đã bồi thường', 'success'], Cancelled: ['Đã hủy', 'danger'],
};
export function withdrawalProgress(product: ConsignmentProduct): [string, BadgeVariant] | null {
  const request = product.withdrawal;
  if (!request) return null;
  if (request.status === 'Pending') return ['Rút hàng: chờ duyệt', 'warning'];
  if (request.status === 'Approved') return request.paymentStatus === 'Paid'
    ? ['Rút hàng: đã thu phí, chờ bàn giao', 'info'] : ['Rút hàng: đã duyệt, chờ thu phí', 'warning'];
  if (request.status === 'Rejected') return ['Yêu cầu rút bị từ chối', 'danger'];
  if (request.status === 'Cancelled') return ['Đã hủy yêu cầu rút', 'neutral'];
  if (request.status === 'Completed') return ['Rút hàng: đã bàn giao', 'success'];
  return null;
}
export function ConsignmentProductStatus({ product }: { product: ConsignmentProduct }) {
  const [label, variant] = consignmentProductStatuses[product.status] ?? [product.status || 'Chưa có thông tin', 'neutral'];
  const progress = withdrawalProgress(product);
  return <div className="space-y-1.5"><Badge variant={variant}>{label}</Badge>
    {progress && <div><Badge variant={progress[1]}>{progress[0]}</Badge></div>}
    {product.withdrawal?.status === 'Rejected' && product.withdrawal.decisionNote && <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-state-danger">Lý do: {product.withdrawal.decisionNote}</p>}
  </div>;
}
export function ConsignmentProductStatusSummary({ products }: { products: ConsignmentProduct[] }) {
  const groups = new Map<string, { count: number; variant: BadgeVariant }>();
  for (const product of products) {
    const statuses = [consignmentProductStatuses[product.status] ?? [product.status, 'neutral'] as [string, BadgeVariant], withdrawalProgress(product)];
    for (const status of statuses) {
      if (!status) continue;
      const current = groups.get(status[0]);
      groups.set(status[0], { count: (current?.count ?? 0) + 1, variant: status[1] });
    }
  }
  return <div className="mt-1.5 flex max-w-xs flex-wrap gap-1.5">{[...groups].map(([label, group]) => <Badge key={label} variant={group.variant}>{group.count} {label.toLocaleLowerCase('vi')}</Badge>)}</div>;
}
