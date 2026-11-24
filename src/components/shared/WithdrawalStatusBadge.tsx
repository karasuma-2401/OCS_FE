import { Badge, type BadgeVariant } from './Badge';
import { withdrawalLabels } from '@/utils/earlyWithdrawals';
const variants: Record<string, BadgeVariant> = {
  Pending: 'warning', Approved: 'info', Rejected: 'danger', Cancelled: 'neutral', Completed: 'success', Legacy: 'neutral',
};
export function WithdrawalStatusBadge({ status }: { status: string }) {
  return <Badge variant={variants[status] ?? 'neutral'}>{withdrawalLabels[status] ?? 'Chưa xác định'}</Badge>;
}
