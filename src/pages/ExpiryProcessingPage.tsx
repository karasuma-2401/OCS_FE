import { useEffect, useState } from 'react';
import { CalendarClock, Search, RefreshCw, X, FileText, Clock3, Handshake, CheckCircle2 } from 'lucide-react';
import { expiryApi, type ExpiryProcessing } from '@/api/expiry';
import { AlertBanner, Badge, Button, Card, Combobox, DatePicker, EmptyState, ErrorState, Input, PageHeaderCard, Pagination, SkeletonLoading, Table, TableDetailButton, type TableColumn } from '@/components/shared';
import { ShopSummaryStrip } from '@/components/shop/ShopSummaryStrip';
import { ListFilterChips, type ListFilterChip } from '@/components/shop/ListFilterChips';
import { ExpiryDetailsModal, ExpiryTypeBadge, expiryDate, expiryLabel, expiryError } from '@/components/shop/ExpiryDetailsModal';

const initialFilters = { q: '', customer: '', status: 'Pending', type: '', from: '', to: '' };
const summaryCards = [
  { status: '', label: 'Tổng phiếu hết hạn', hint: 'Tất cả phiếu xử lý', icon: FileText, tone: 'bg-brand-pink-light text-brand-highlight' },
  { status: 'Pending', label: 'Phiếu chờ xử lý', hint: 'Cần trả khách / quyên góp', icon: Clock3, tone: 'bg-state-warning-soft text-state-warning' },
  { status: 'OverdueDonated', label: 'Chờ quyên góp', hint: 'Đã duyệt hàng không nhận', icon: Handshake, tone: 'bg-state-info-soft text-state-info' },
  { status: 'Completed', label: 'Phiếu hoàn tất', hint: 'Đã bàn giao đủ sản phẩm', icon: CheckCircle2, tone: 'bg-state-success-soft text-state-success' },
];
const PAGE_SIZE = 10;
export function ExpiryProcessingPage() {
  const [rows, setRows] = useState<ExpiryProcessing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpiryProcessing | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [dateKey, setDateKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [summary, setSummary] = useState<number[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const updateDraft = (key: keyof typeof draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const applyField = (key: keyof typeof filters, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
    setFilters(current => ({ ...current, [key]: value }));
    setPage(1); setSelectedId(null); setDetail(null);
  };
  const resetFilters = (status = '') => {
    const empty = { ...initialFilters, status };
    setDraft(empty); setFilters(empty); setDateKey(x => x + 1); setPage(1); setSelectedId(null); setDetail(null);
  };
  const chips: ListFilterChip[] = Object.entries(filters).filter(([, value]) => value).map(([key, value]) => ({
    id: key, label: key === 'q' ? `Từ khóa: “${value}”` : key === 'customer' ? `Khách hàng: “${value}”`
      : key === 'status' ? `Trạng thái: ${summaryCards.find(card => card.status === value)?.label ?? value}`
      : key === 'type' ? `Hướng xử lý: ${value === 'Return' ? 'Hoàn trả' : 'Quyên góp'}`
      : `${key === 'from' ? 'Hạn nhận từ' : 'Hạn nhận đến'}: ${expiryDate(value)}`,
    onRemove: () => { applyField(key as keyof typeof filters, ''); if (key === 'from' || key === 'to') setDateKey(x => x + 1); },
  }));
  const activeQuickFilter = filters.q || filters.customer || filters.type || filters.from || filters.to ? null : filters.status || 'all';
  useEffect(() => {
    let active = true;
    setSummaryLoading(true); setSummaryError('');
    Promise.all(summaryCards.map(card => expiryApi.list({ page: 1, pageSize: 1, status: card.status || undefined })))
      .then(results => { if (active) setSummary(results.map(result => result.totalCount)); })
      .catch(err => { if (active) { setSummary([]); setSummaryError(expiryError(err)); } })
      .finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    expiryApi.list({ page, pageSize: PAGE_SIZE, q: filters.q.trim() || undefined, customerQuery: filters.customer.trim() || undefined,
      status: filters.status || undefined, type: filters.type || undefined,
      deadlineFrom: filters.from ? `${filters.from}T00:00:00+07:00` : undefined,
      deadlineTo: filters.to ? `${filters.to}T23:59:59.999+07:00` : undefined })
      .then(result => { if (active) { setRows(result.items); setTotal(result.totalCount); if (page > 1 && !result.items.length) setPage(Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE))); } })
      .catch(err => { if (active) { setRows([]); setError(expiryError(err)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filters, refresh]);
  const columns: TableColumn<ExpiryProcessing>[] = [
    { key: 'contract', header: 'Hợp đồng', render: row => <div><p className="font-bold text-brand-highlight">{row.contractNumber}</p><p className="mt-1 text-xs text-muted">Hết hạn {expiryDate(row.endsAt)}</p></div> },
    { key: 'customer', header: 'Khách hàng', render: row => <div><p className="font-semibold">{row.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-xs text-muted">{row.customerPhone || 'Chưa có số điện thoại'}</p></div> },
    { key: 'deadline', header: 'Hạn nhận hàng', render: row => row.type === 'Return' ? <div><span className="whitespace-nowrap">{expiryDate(row.collectionDeadline)}</span>{row.status !== 'Completed' && row.collectionDeadline && new Date(row.collectionDeadline).getTime() <= Date.now() && <p className="mt-1 text-xs text-state-danger">Đã đến hạn nhận</p>}</div> : <span className="text-muted">Không áp dụng</span> },
    { key: 'type', header: 'Hình thức', render: row => <ExpiryTypeBadge type={row.type} /> },
    { key: 'status', header: 'Trạng thái', render: row => <Badge variant={row.status === 'Completed' ? 'success' : 'warning'}>{expiryLabel(row)}</Badge> },
    { key: 'progress', header: 'Sản phẩm', render: row => <div><p className="font-semibold">{row.products.filter(p => p.status !== 'Expired').length}/{row.products.length} đã xử lý</p><p className="mt-1 text-xs text-muted">{row.products.filter(p => p.status === 'Expired').length} món còn chờ</p></div> },
    { key: 'action', header: 'Thao tác', render: row => <TableDetailButton onClick={() => { setSelectedId(row.id); setDetail(row); }} /> },
  ];
  return <section className="space-y-5 text-ink">
    <PageHeaderCard icon={<CalendarClock size={24} aria-hidden="true" />} title="Xử lý hàng ký gửi hết hạn" description="Theo dõi hàng cần trả khách hoặc bàn giao quyên góp." />
    <ShopSummaryStrip cards={summaryCards.map((card, index) => ({ ...card, id: card.status || 'all', value: summary[index] }))} loading={summaryLoading} activeQuickFilter={activeQuickFilter} onSelectQuickFilter={id => resetFilters(id === 'all' ? '' : id)} gridClassName="grid-cols-2 xl:grid-cols-4" ariaLabel="Thống kê nhanh hàng hết hạn" loadingLabel="Đang tải thống kê hàng hết hạn…" />
    {summaryError && <AlertBanner variant="error" title="Không thể tải thống kê" message={summaryError} action={{ label: 'Thử lại', onClick: () => setRefresh(x => x + 1) }} />}
    <Card aria-label="Danh sách hàng hết hạn" className="min-w-0 !bg-white !p-0">
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-brand-ink">Danh sách hàng hết hạn</h2>{!loading && !error && <p className="mt-0.5 text-xs text-text-secondary">Hiển thị <span className="font-semibold tabular-nums text-brand-ink">{rows.length}</span> / <span className="font-semibold tabular-nums text-brand-ink">{total.toLocaleString('vi-VN')}</span> phiếu{chips.length ? ' phù hợp bộ lọc' : ''}</p>}</div>
          <Button variant="outline" size="sm" aria-label="Làm mới danh sách hàng hết hạn" disabled={loading} onClick={() => setRefresh(x => x + 1)} startIcon={<RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />}>Làm mới</Button>
        </div>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setFilters(current => ({ ...current, q: draft.q.trim(), customer: draft.customer.trim() })); setPage(1); setSelectedId(null); setDetail(null); }}>
          <div className="min-w-[220px] flex-1">
            <Input aria-label="Tìm hợp đồng hoặc sản phẩm" placeholder="Mã hợp đồng, tên hoặc barcode sản phẩm…" autoComplete="off" value={draft.q} onChange={e => updateDraft('q', e.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} endAdornment={draft.q ? <button type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={() => applyField('q', '')} className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"><X size={15} aria-hidden="true" /></button> : undefined} />
          </div>
          <div className="min-w-[220px] flex-1">
            <Input aria-label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại khách hàng…" autoComplete="off" maxLength={200} value={draft.customer} onChange={e => updateDraft('customer', e.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} endAdornment={draft.customer ? <button type="button" aria-label="Xóa từ khóa khách hàng" onClick={() => applyField('customer', '')} className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"><X size={15} aria-hidden="true" /></button> : undefined} />
          </div>
          <Button type="submit" size="md">Tìm kiếm</Button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Combobox label="Trạng thái" value={filters.status} onChange={value => applyField('status', value)} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'Pending', label: 'Chờ xử lý' }, { value: 'OverdueDonated', label: 'Đã duyệt quyên góp' }, { value: 'Completed', label: 'Hoàn tất' }]} />
          <Combobox label="Hướng xử lý" value={filters.type} onChange={value => applyField('type', value)} options={[{ value: '', label: 'Tất cả hình thức' }, { value: 'Return', label: 'Hoàn trả' }, { value: 'Donate', label: 'Quyên góp' }]} />
          <DatePicker key={`from-${dateKey}`} label="Hạn nhận từ" value={filters.from} max={filters.to || undefined} onChange={value => applyField('from', value)} />
          <DatePicker key={`to-${dateKey}`} label="Hạn nhận đến" value={filters.to} min={filters.from || undefined} onChange={value => applyField('to', value)} />
        </div>
        <ListFilterChips filters={chips} onReset={() => resetFilters()} />
      </div>
      {loading ? <SkeletonLoading variant="table" columns={7} count={5} className="p-5" label="Đang tải danh sách hàng hết hạn..." /> : error ? <ErrorState title="Không thể tải danh sách" description={error} onRetry={() => setRefresh(x => x + 1)} /> : !rows.length ? <EmptyState className="border-0 !bg-white" title="Không có phiếu phù hợp" description="Thử thay đổi hoặc xóa bộ lọc." /> : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={rows} rowKey="id" selectedRowKey={selectedId} selectionAppearance="accent" onRowClick={row => setSelectedId(row.id)} />{total > PAGE_SIZE && <div className="border-t border-border p-4"><Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={next => { setPage(next); setSelectedId(null); }} /></div>}</>}
    </Card>
    {detail && <ExpiryDetailsModal key={detail.id} item={detail} onClose={() => setDetail(null)} onUpdated={() => setRefresh(x => x + 1)} />}
  </section>;
}

