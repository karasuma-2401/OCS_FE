import { useEffect, useState } from 'react';
import { RefreshCw, Search, X, FileText, Clock3, PackageMinus, CheckCircle2, CircleX } from 'lucide-react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type WithdrawalSummary } from '@/api/earlyWithdrawals';
import { AlertBanner, Badge, Button, Card, Combobox, EmptyState, ErrorState, Input, Pagination, SkeletonLoading, Table, TableDetailButton, type TableColumn } from '@/components/shared';
import { ShopSummaryStrip, type ShopSummaryCard } from '@/components/shop/ShopSummaryStrip';
import { ListFilterChips, type ListFilterChip } from '@/components/shop/ListFilterChips';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';
import { withdrawalDate, withdrawalError, withdrawalMoney, withdrawalLabels } from '@/utils/earlyWithdrawals';

const PAGE_SIZE = 20;
export function WithdrawalRequestsTable({ customer, refresh, onSelect }: {
  customer: boolean; refresh: number; onSelect: (item: EarlyWithdrawal) => void;
}) {
  const [rows, setRows] = useState<EarlyWithdrawal[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ status: '', paymentStatus: '', sort: 'newest' });
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  useEffect(() => { setPage(1); setSelectedId(null); }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setSummaryLoading(true); setSummaryError('');
    earlyWithdrawalsApi.summary(customer, controller.signal)
      .then(result => { if (!controller.signal.aborted) setSummary(result); })
      .catch(err => { if (!controller.signal.aborted) { setSummary(null); setSummaryError(withdrawalError(err)); } })
      .finally(() => { if (!controller.signal.aborted) setSummaryLoading(false); });
    return () => controller.abort();
  }, [customer, refresh, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    earlyWithdrawalsApi.search(customer, { page, pageSize: PAGE_SIZE, q: query || undefined, status: filters.status || undefined, paymentStatus: filters.paymentStatus || undefined, sort: filters.sort }, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setRows(result.items); setTotal(result.totalCount); if (page > Math.max(1, result.totalPages)) setPage(Math.max(1, result.totalPages)); } })
      .catch(err => { if (!controller.signal.aborted) setError(withdrawalError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer, page, refresh, retry, query, filters]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible') setRetry(x => x + 1); };
    const interval = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', update); };
  }, []);
  const setFilter = (key: keyof typeof filters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); setSelectedId(null); };
  const clearQuery = () => { setSearch(''); setQuery(''); setPage(1); setSelectedId(null); };
  const resetFilters = (status = '') => { clearQuery(); setFilters({ status, paymentStatus: '', sort: 'newest' }); };
  const paymentLabels: Record<string, string> = { Unpaid: 'Chưa thu phí', Partial: 'Đã thu một phần', Paid: 'Đã xử lý phí' };
  const summaryCards: ShopSummaryCard[] = [
    { id: 'all', label: 'Tổng yêu cầu', value: summary?.totalCount, hint: customer ? 'Tất cả yêu cầu của bạn' : 'Tất cả yêu cầu rút hàng', icon: FileText, tone: 'bg-brand-pink-light text-brand-highlight' },
    { id: 'Pending', label: 'Chờ duyệt', value: summary?.pendingCount, hint: 'Cần kiểm tra & xét duyệt', icon: Clock3, tone: 'bg-state-warning-soft text-state-warning' },
    { id: 'Approved', label: 'Đang xử lý', value: summary?.approvedCount, hint: 'Thu phí & bàn giao hàng', icon: PackageMinus, tone: 'bg-state-info-soft text-state-info' },
    { id: 'Completed', label: 'Đã bàn giao', value: summary?.completedCount, hint: 'Đã giao đủ hàng cho khách', icon: CheckCircle2, tone: 'bg-state-success-soft text-state-success' },
    { id: 'Rejected', label: 'Đã từ chối', value: summary?.rejectedCount, hint: 'Đã ghi nhận lý do từ chối', icon: CircleX, tone: 'bg-state-danger-soft text-state-danger' },
  ];
  const chips: ListFilterChip[] = [
    ...(query ? [{ id: 'q', label: `Từ khóa: “${query}”`, onRemove: clearQuery }] : []),
    ...(filters.status ? [{ id: 'status', label: `Trạng thái: ${withdrawalLabels[filters.status]}`, onRemove: () => setFilter('status', '') }] : []),
    ...(filters.paymentStatus ? [{ id: 'payment', label: `Phí: ${paymentLabels[filters.paymentStatus]}`, onRemove: () => setFilter('paymentStatus', '') }] : []),
    ...(filters.sort !== 'newest' ? [{ id: 'sort', label: 'Sắp xếp: Cũ nhất trước', onRemove: () => setFilter('sort', 'newest') }] : []),
  ];
  const openDetail = (row: EarlyWithdrawal) => { setSelectedId(row.id); onSelect(row); };
  const columns: TableColumn<EarlyWithdrawal>[] = [
    { key: 'request', header: 'Yêu cầu', render: row => <div><p className="font-bold text-brand-highlight">{row.id.slice(0, 8).toUpperCase()}</p><p className="mt-1 whitespace-nowrap text-xs text-muted">{withdrawalDate(row.requestedAt)}</p><p className="mt-1 text-xs text-muted">{row.items.length} món</p></div> },
    ...(!customer ? [{ key: 'customer', header: 'Khách hàng', render: (row: EarlyWithdrawal) => <div><p className="font-semibold">{row.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-xs text-muted">{row.customerPhone || 'Chưa có số điện thoại'}</p></div> }] : []),
    { key: 'status', header: 'Kết quả xử lý', render: row => <div className="space-y-2"><WithdrawalStatusBadge status={row.status} />{row.status === 'Rejected' && <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-state-danger"><strong>Lý do: </strong>{row.decisionNote || 'Vui lòng liên hệ cửa hàng.'}</p>}</div> },
    { key: 'fee', header: 'Phí rút hàng', render: row => <div className="space-y-1 whitespace-nowrap"><p className="font-bold text-brand-highlight">{withdrawalMoney(row.totalPenaltyAmount)}</p><Badge variant={row.paymentStatus === 'Paid' ? 'success' : 'neutral'}>{row.totalPenaltyAmount === 0 ? 'Miễn phí' : row.paymentStatus === 'Paid' ? 'Đã thu phí' : 'Chưa thu đủ'}</Badge></div> },
    { key: 'handover', header: 'Bàn giao', render: row => row.handedOverAt ? <span className="whitespace-nowrap text-sm">{withdrawalDate(row.handedOverAt)}</span> : <span className="text-sm text-muted">{row.status === 'Approved' ? 'Chờ giao hàng' : '—'}</span> },
    { key: 'actions', header: 'Thao tác', render: row => <TableDetailButton onClick={() => openDetail(row)} /> },
  ];
  return <div className="space-y-5">
    <ShopSummaryStrip cards={summaryCards} loading={summaryLoading} activeQuickFilter={query || filters.paymentStatus ? null : filters.status || 'all'} onSelectQuickFilter={id => resetFilters(id === 'all' ? '' : id)} ariaLabel="Thống kê nhanh rút hàng sớm" loadingLabel="Đang tải thống kê rút hàng sớm…" />
    {summaryError && <AlertBanner variant="error" title="Không thể tải thống kê" message={summaryError} action={{ label: 'Thử lại', onClick: () => setRetry(x => x + 1) }} />}
    <Card aria-label={customer ? 'Yêu cầu rút hàng của tôi' : 'Danh sách yêu cầu rút hàng'} className="min-w-0 !bg-white !p-0">
    <div className="border-b border-border px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="!mt-0 !text-base !tracking-normal font-bold text-brand-ink">{customer ? 'Theo dõi yêu cầu đã gửi' : 'Danh sách yêu cầu rút hàng'}</h2>{!loading && !error && <p className="mt-0.5 text-xs text-text-secondary">Hiển thị <span className="font-semibold tabular-nums text-brand-ink">{rows.length}</span> / <span className="font-semibold tabular-nums text-brand-ink">{total.toLocaleString('vi-VN')}</span> yêu cầu{chips.length ? ' phù hợp bộ lọc' : ''}</p>}</div>
        <Button size="sm" variant="outline" aria-label="Làm mới danh sách rút hàng" startIcon={<RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />} disabled={loading} onClick={() => setRetry(x => x + 1)}>Làm mới</Button>
      </div>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelectedId(null); }}>
        <div className="min-w-[220px] flex-1"><Input aria-label="Tìm yêu cầu rút hàng" placeholder={customer ? 'Mã yêu cầu, tên món, barcode hoặc hợp đồng…' : 'Mã yêu cầu, sản phẩm, hợp đồng hoặc khách hàng…'} maxLength={200} value={search} autoComplete="off" onChange={e => setSearch(e.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} endAdornment={search ? <button type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={clearQuery} className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"><X size={15} aria-hidden="true" /></button> : undefined} /></div>
        <Button type="submit" size="md">Tìm kiếm</Button>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Combobox label="Trạng thái yêu cầu" value={filters.status} onChange={value => setFilter('status', value)} options={[{ value: '', label: 'Tất cả trạng thái' }, ...Object.entries(withdrawalLabels).map(([value, label]) => ({ value, label }))]} />
        <Combobox label="Tình trạng phí" value={filters.paymentStatus} onChange={value => setFilter('paymentStatus', value)} options={[{ value: '', label: 'Tất cả tình trạng phí' }, ...Object.entries(paymentLabels).map(([value, label]) => ({ value, label }))]} />
        <Combobox label="Sắp xếp" value={filters.sort} onChange={value => setFilter('sort', value)} options={[{ value: 'newest', label: 'Mới nhất trước' }, { value: 'oldest', label: 'Cũ nhất trước' }]} />
      </div>
      <ListFilterChips filters={chips} onReset={() => resetFilters()} />
    </div>
    {loading ? <SkeletonLoading variant="table" columns={columns.length} count={4} className="p-5" label="Đang tải yêu cầu rút hàng..." />
      : error ? <ErrorState title="Không thể tải yêu cầu" description={error} onRetry={() => setRetry(x => x + 1)} />
      : !rows.length ? <EmptyState className="border-0" title={chips.length ? 'Không có yêu cầu phù hợp' : 'Chưa có yêu cầu rút hàng'} description={chips.length ? 'Thử thay đổi hoặc xóa bộ lọc để xem kết quả.' : customer ? 'Yêu cầu và kết quả xử lý của cửa hàng sẽ xuất hiện ở đây.' : 'Các yêu cầu khách gửi sẽ xuất hiện ở đây để duyệt và bàn giao.'} />
      : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={rows} rowKey="id" selectedRowKey={selectedId} selectionAppearance="accent" onRowClick={row => setSelectedId(row.id)} /></>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4"><p className="text-xs text-muted">Tự cập nhật mỗi 30 giây</p>{!error && total > PAGE_SIZE && <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={next => { setPage(next); setSelectedId(null); }} />}</div>
    </Card>
  </div>;
}
