import { useEffect, useState } from 'react';
import { CalendarClock, Search, RotateCcw } from 'lucide-react';
import { expiryApi, type ExpiryProcessing } from '@/api/expiry';
import { AlertBanner, Badge, Button, Card, Combobox, DatePicker, EmptyState, ErrorState, Input, PageHeaderCard, Pagination, Skeleton, SkeletonLoading, Table, TableDetailButton, type TableColumn } from '@/components/shared';
import { ExpiryDetailsModal, ExpiryTypeBadge, expiryDate, expiryLabel, expiryError } from '@/components/shop/ExpiryDetailsModal';

const initialFilters = { q: '', customer: '', status: 'Pending', type: '', from: '', to: '' };
const summaryCards = [
  { status: '', label: 'Tổng phiếu hết hạn' },
  { status: 'Pending', label: 'Phiếu chờ xử lý' },
  { status: 'OverdueDonated', label: 'Đã duyệt, chờ quyên góp' },
  { status: 'Completed', label: 'Phiếu hoàn tất' },
];
const PAGE_SIZE = 10;
export function ExpiryProcessingPage() {
  const [rows, setRows] = useState<ExpiryProcessing[]>([]);
  const [selected, setSelected] = useState<ExpiryProcessing | null>(null);
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
    { key: 'action', header: 'Thao tác', render: row => <TableDetailButton onClick={() => setSelected(row)} /> },
  ];
  return <section className="space-y-5 text-ink">
    <PageHeaderCard icon={<CalendarClock size={24} aria-hidden="true" />} title="Xử lý hàng ký gửi hết hạn" description="Theo dõi hàng cần trả khách hoặc bàn giao quyên góp." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={summaryLoading}>
      {summaryLoading && <span className="sr-only" role="status">Đang tải thống kê...</span>}
      {summaryCards.map((card, index) => <Card key={card.label} className="!bg-white !p-4">{summaryLoading ? <><Skeleton className="h-4 w-28 max-w-full" /><div className="mt-1 flex h-7 items-center"><Skeleton className="h-5 w-14" /></div></> : <><p className="text-xs font-semibold text-text-secondary">{card.label}</p><p className="mt-1 flex h-7 items-center text-xl font-bold tabular-nums text-brand-ink">{summary[index]?.toLocaleString('vi-VN') ?? '—'}</p></>}</Card>)}
    </div>
    {summaryError && <AlertBanner variant="error" title="Không thể tải thống kê" message={summaryError} action={{ label: 'Thử lại', onClick: () => setRefresh(x => x + 1) }} />}
    <section aria-label="Danh sách hàng hết hạn" className="min-w-0 rounded-card border border-brand-lavender/40 bg-white shadow-sm">
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <h2 className="text-base font-bold text-brand-ink">Danh sách hàng hết hạn</h2>
        <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); setFilters({ ...draft }); setPage(1); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input aria-label="Tìm hợp đồng hoặc sản phẩm" placeholder="Mã hợp đồng, tên hoặc barcode sản phẩm…" value={draft.q} onChange={e => updateDraft('q', e.target.value)} startAdornment={<Search size={18} />} />
            <Input aria-label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại khách hàng…" maxLength={200} value={draft.customer} onChange={e => updateDraft('customer', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Combobox label="Trạng thái" value={draft.status} onChange={value => updateDraft('status', value)} options={[{ value: '', label: 'Tất cả trạng thái' }, { value: 'Pending', label: 'Chờ xử lý' }, { value: 'OverdueDonated', label: 'Đã duyệt quyên góp' }, { value: 'Completed', label: 'Hoàn tất' }]} />
            <Combobox label="Hướng xử lý" value={draft.type} onChange={value => updateDraft('type', value)} options={[{ value: '', label: 'Tất cả hình thức' }, { value: 'Return', label: 'Hoàn trả' }, { value: 'Donate', label: 'Quyên góp' }]} />
            <DatePicker key={`from-${dateKey}`} label="Hạn nhận từ" value={draft.from} max={draft.to || undefined} onChange={value => updateDraft('from', value)} />
            <DatePicker key={`to-${dateKey}`} label="Hạn nhận đến" value={draft.to} min={draft.from || undefined} onChange={value => updateDraft('to', value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2"><Button type="submit" size="sm" className="min-h-10" startIcon={<Search size={16} />}>Áp dụng bộ lọc</Button><Button variant="ghost" size="sm" className="min-h-10" startIcon={<RotateCcw size={16} />} onClick={() => { const empty = { ...initialFilters, status: '' }; setDraft(empty); setFilters(empty); setDateKey(x => x + 1); setPage(1); }}>Xóa bộ lọc</Button>{!loading && !error && <p className="ml-auto text-xs text-muted">{total.toLocaleString('vi-VN')} phiếu</p>}</div>
        </form>
      </div>
      {loading ? <SkeletonLoading variant="table" columns={7} count={5} className="p-5" label="Đang tải danh sách hàng hết hạn..." /> : error ? <ErrorState title="Không thể tải danh sách" description={error} onRetry={() => setRefresh(x => x + 1)} /> : !rows.length ? <EmptyState className="border-0 !bg-white" title="Không có phiếu phù hợp" description="Thử thay đổi hoặc xóa bộ lọc." /> : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={rows} rowKey="id" selectedRowKey={selected?.id} onRowClick={setSelected} />{total > PAGE_SIZE && <div className="border-t border-border p-4"><Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} /></div>}</>}
    </section>
    {selected && <ExpiryDetailsModal key={selected.id} item={selected} onClose={() => setSelected(null)} onUpdated={() => setRefresh(x => x + 1)} />}
  </section>;
}

