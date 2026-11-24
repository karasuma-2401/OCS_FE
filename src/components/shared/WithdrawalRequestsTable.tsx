import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { earlyWithdrawalsApi, type EarlyWithdrawal } from '@/api/earlyWithdrawals';
import { Badge, Button, EmptyState, ErrorState, SkeletonLoading, Table, TableDetailButton, type TableColumn } from '@/components/shared';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';
import { withdrawalDate, withdrawalError, withdrawalMoney } from '@/utils/earlyWithdrawals';

const PAGE_SIZE = 20;
export function WithdrawalRequestsTable({ customer, refresh, onSelect }: {
  customer: boolean; refresh: number; onSelect: (item: EarlyWithdrawal) => void;
}) {
  const [rows, setRows] = useState<EarlyWithdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(1); }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    earlyWithdrawalsApi.list(customer, page, PAGE_SIZE, controller.signal)
      .then(result => { if (!controller.signal.aborted) setRows(result); })
      .catch(err => { if (!controller.signal.aborted) setError(withdrawalError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer, page, refresh, retry]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') setRetry(x => x + 1); };
    const interval = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, []);
  const columns: TableColumn<EarlyWithdrawal>[] = [
    { key: 'request', header: 'Yêu cầu', render: row => <div><p className="font-bold text-brand-highlight">{row.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 whitespace-nowrap text-xs text-muted">{withdrawalDate(row.requestedAt)}</p><p className="mt-1 text-xs text-muted">{row.items.length} món</p></div> },
    ...(!customer ? [{ key: 'customer', header: 'Khách hàng', render: (row: EarlyWithdrawal) => <div><p className="font-semibold">{row.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-xs text-muted">{row.customerPhone || 'Chưa có số điện thoại'}</p></div> }] : []),
    { key: 'status', header: 'Kết quả xử lý', render: row => <div className="space-y-2"><WithdrawalStatusBadge status={row.status} />{row.status === 'Rejected' && <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-state-danger"><strong>Lý do: </strong>{row.decisionNote || 'Vui lòng liên hệ cửa hàng.'}</p>}</div> },
    { key: 'fee', header: 'Phí rút hàng', render: row => <div className="space-y-1 whitespace-nowrap"><p className="font-bold text-brand-highlight">{withdrawalMoney(row.totalPenaltyAmount)}</p><Badge variant={row.paymentStatus === 'Paid' ? 'success' : 'neutral'}>{row.totalPenaltyAmount === 0 ? 'Miễn phí' : row.paymentStatus === 'Paid' ? 'Đã thu phí' : 'Chưa thu đủ'}</Badge></div> },
    { key: 'handover', header: 'Bàn giao', render: row => row.handedOverAt ? <span className="whitespace-nowrap text-sm">{withdrawalDate(row.handedOverAt)}</span> : <span className="text-sm text-muted">{row.status === 'Approved' ? 'Chờ giao hàng' : '—'}</span> },
    { key: 'actions', header: 'Thao tác', render: row => <TableDetailButton onClick={() => onSelect(row)} /> },
  ];
  return <section aria-label={customer ? 'Yêu cầu rút hàng của tôi' : 'Danh sách yêu cầu rút hàng'} className="min-w-0 overflow-hidden rounded-card border border-brand-lavender/40 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6"><h2 className="!mt-0 !text-base !tracking-normal font-bold text-brand-ink">{customer ? 'Theo dõi yêu cầu đã gửi' : 'Danh sách yêu cầu rút hàng'}</h2><Button size="sm" variant="outline" startIcon={<RotateCcw size={15} />} disabled={loading} onClick={() => setRetry(x => x + 1)}>Làm mới</Button></div>
    {loading ? <SkeletonLoading variant="table" columns={columns.length} count={4} className="p-5" label="Đang tải yêu cầu rút hàng..." />
      : error ? <ErrorState title="Không thể tải yêu cầu" description={error} onRetry={() => setRetry(x => x + 1)} />
      : !rows.length ? <EmptyState className="border-0" title={page > 1 ? 'Đã hết danh sách yêu cầu' : 'Chưa có yêu cầu rút hàng'} description={customer ? 'Yêu cầu và kết quả xử lý của cửa hàng sẽ xuất hiện ở đây.' : 'Các yêu cầu khách gửi sẽ xuất hiện ở đây để duyệt và bàn giao.'} />
      : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={rows} rowKey="id" onRowClick={onSelect} /></>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4"><p className="text-xs text-muted">Trang {page} · Tự cập nhật mỗi 30 giây</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={loading || page <= 1} onClick={() => setPage(x => x - 1)}>Trang trước</Button><Button size="sm" variant="outline" disabled={loading || !!error || rows.length < PAGE_SIZE || page >= 100000} onClick={() => setPage(x => x + 1)}>Trang sau</Button></div></div>
  </section>;
}
