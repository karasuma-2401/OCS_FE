import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, RotateCcw, Search } from 'lucide-react';
import { searchMyConsignments, type Consignment, type ConsignmentSearchResponse } from '@/api/consignments';
import { ConsignmentDetailsModal } from '@/components/customer/ConsignmentDetailsModal';
import { Badge, Button, Combobox, DatePicker, EmptyState, ErrorState, Input, PageHeaderCard, Pagination, SkeletonLoading, Table, TableDetailButton, type BadgeVariant, type TableColumn } from '@/components/shared';
import { nextThirtyDays } from '@/utils/consignmentDateFilters';

const CONTRACTS_PER_PAGE = 5;
const REFRESH_INTERVAL_MS = 30_000;
const emptyFilters = { query: '', status: 'all', signedFrom: '', signedTo: '', expiresFrom: '', expiresTo: '' };
type Filters = typeof emptyFilters;

const contractStatuses: Record<string, [string, BadgeVariant]> = {
  Active: ['Đang hiệu lực', 'success'], Completed: ['Đã hoàn tất', 'info'], Cancelled: ['Đã hủy', 'danger'],
};
const money = (value: number | null) => value == null ? 'Chưa có thông tin' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ₫`;
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};
export function ConsignmentTrackingPage() {
  const [data, setData] = useState<ConsignmentSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateKey, setDateKey] = useState(0);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasFilters = Boolean(filters.query || filters.status !== 'all' || filters.signedFrom || filters.signedTo || filters.expiresFrom || filters.expiresTo || draft.query || draft.status !== 'all' || draft.signedFrom || draft.signedTo || draft.expiresFrom || draft.expiresTo);
  const selectedItem = detailsOpen ? data?.items.find(item => item.contractId === selectedContractId) ?? null : null;
  const openContract = (contractId: string) => { setSelectedContractId(contractId); setDetailsOpen(true); };
  const updateDraft = (field: keyof Filters, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const clearFilters = () => { setDraft(emptyFilters); setFilters({ ...emptyFilters }); setDateKey(key => key + 1); setPage(1); setDetailsOpen(false); setSelectedContractId(null); };
  const columns: TableColumn<Consignment>[] = [
    { key: 'contractNumber', header: 'Hợp đồng', render: item => <div><p className="font-bold text-brand-highlight">{item.contractNumber}</p><p className="mt-0.5 text-xs text-muted">Ký {date(item.signedAt)}</p></div> },
    { key: 'status', header: 'Trạng thái', render: item => <Badge variant={(contractStatuses[item.status] ?? ['', 'neutral'])[1]}>{(contractStatuses[item.status] ?? [item.status || 'Chưa có thông tin'])[0]}</Badge> },
    { key: 'products', header: 'Sản phẩm', render: item => <span className="font-semibold text-ink">{item.products.length} món</span> },
    { key: 'endsAt', header: 'Hết hạn', render: item => date(item.endsAt), cellClassName: 'whitespace-nowrap' },
    { key: 'estimatedPayout', header: 'Dự kiến nhận', render: item => <strong className="whitespace-nowrap text-brand-highlight">{money(item.estimatedPayout)}</strong> },
    { key: 'settledAmount', header: 'Đã quyết toán', render: item => <strong className="whitespace-nowrap text-state-success-strong">{money(item.settledAmount)}</strong> },
    { key: 'action', header: 'Thao tác', render: item => <TableDetailButton onClick={() => openContract(item.contractId)} /> },
  ];
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const load = async (background = false) => {
      if (inFlight || controller.signal.aborted) return;
      inFlight = true;
      if (!background) { setLoading(true); setError(null); }
      try {
        const result = await searchMyConsignments({
          query: filters.query || undefined, status: filters.status === 'all' ? undefined : filters.status,
          signedFrom: filters.signedFrom || undefined, signedTo: filters.signedTo || undefined,
          expiresFrom: filters.expiresFrom || undefined, expiresTo: filters.expiresTo || undefined,
          page, pageSize: CONTRACTS_PER_PAGE,
        }, controller.signal);
        if (controller.signal.aborted) return;
        if (result.totalPages > 0 && page > result.totalPages) { setPage(result.totalPages); return; }
        setData(current => JSON.stringify(current) === JSON.stringify(result) ? current : result);
        setError(null);
      } catch (err: unknown) {
        if (!controller.signal.aborted && !background) setError((err as { response?: { status?: number } }).response?.status ?? 0);
      } finally {
        inFlight = false;
        if (!controller.signal.aborted && !background) setLoading(false);
      }
    };
    void load();
    const refreshVisible = () => { if (document.visibilityState === 'visible') void load(true); };
    const timer = window.setInterval(refreshVisible, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refreshVisible); document.removeEventListener('visibilitychange', refreshVisible); };
  }, [filters, page, refreshKey]);
  return <div className="landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] py-8 max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] sm:py-12">
    <h1 className="sr-only">Theo dõi ký gửi</h1>
    <div className="mb-6 [&_h2]:!mt-0 [&_h2]:!text-lg [&_h2]:!leading-normal [&_h2]:!tracking-normal">
      <PageHeaderCard
        icon={<Package size={22} aria-hidden="true" />}
        title="Theo dõi ký gửi"
        description="Theo dõi hợp đồng và tình trạng sản phẩm ký gửi của bạn."
        actions={<Button variant="outline" size="sm" onClick={() => setRefreshKey(key => key + 1)} disabled={loading} startIcon={<RotateCcw size={14} />}>Làm mới</Button>}
      />
    </div>
    {!data ? loading ? <SkeletonLoading variant="cards" count={3} label="Đang tải các đợt ký gửi..." /> : <ErrorState title={error === 403 ? 'Bạn không có quyền truy cập' : 'Không thể tải các đợt ký gửi'} description={error === 403 ? 'Tài khoản hoặc hồ sơ khách hàng của bạn không đủ điều kiện truy cập.' : 'Vui lòng kiểm tra kết nối và thử lại.'} onRetry={error === 403 ? undefined : () => setRefreshKey(key => key + 1)} /> : data.overview.totalContracts === 0 && !loading && error === null ? <EmptyState title="Chưa có đợt ký gửi nào" description="Các hợp đồng ký gửi của bạn sẽ xuất hiện tại đây khi được tạo." action={<Link to="/consign" className="inline-flex rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-brand-ink">Tìm hiểu ký gửi</Link>} /> : <>
      <section aria-label="Tổng quan ký gửi" className="mb-5 grid grid-cols-2 divide-x-0 divide-y divide-border rounded-2xl border border-brand-lavender/40 bg-paper px-4 py-2 shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-2">
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đợt ký gửi</p><p className="mt-1 text-xl font-bold text-brand-ink">{data.overview.totalContracts} <span className="text-xs font-medium text-muted">· {data.overview.activeContracts} hiệu lực</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đang bán</p><p className="mt-1 text-xl font-bold text-brand-ink">{data.overview.onSaleProducts} <span className="text-xs font-medium text-muted">sản phẩm</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đã bán</p><p className="mt-1 text-xl font-bold text-state-success-strong">{data.overview.soldProducts} <span className="text-xs font-medium text-muted">sản phẩm</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đã quyết toán</p><p className="mt-1 text-xl font-bold text-brand-highlight">{money(data.overview.settledAmount)}</p></div>
      </section>
      <section aria-label="Danh sách đợt ký gửi" className="min-w-0 rounded-card bg-white">
        <div className="border-b border-border px-4 py-5 sm:px-6">
          <h2 className="!mt-0 !text-base !tracking-normal text-brand-ink">Danh sách đợt ký gửi</h2>
          <form className="mt-4 space-y-4" onSubmit={event => { event.preventDefault(); setFilters({ ...draft, query: draft.query.trim() }); setPage(1); setDetailsOpen(false); setSelectedContractId(null); }}>
            <Input aria-label="Tìm đợt ký gửi" placeholder="Mã hợp đồng, tên hoặc mã sản phẩm…" value={draft.query} onChange={event => updateDraft('query', event.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Combobox label="Trạng thái hợp đồng" value={draft.status} onChange={value => updateDraft('status', value)} options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hiệu lực' }, { value: 'Completed', label: 'Đã hoàn tất' }, { value: 'Cancelled', label: 'Đã hủy' }]} />
              <DatePicker key={`signed-from-${dateKey}`} label="Ngày ký từ" value={draft.signedFrom} onChange={value => updateDraft('signedFrom', value)} max={draft.signedTo || undefined} />
              <DatePicker key={`signed-to-${dateKey}`} label="Ngày ký đến" value={draft.signedTo} onChange={value => updateDraft('signedTo', value)} min={draft.signedFrom || undefined} />
              <DatePicker key={`expires-from-${dateKey}`} label="Hết hạn từ" value={draft.expiresFrom} onChange={value => updateDraft('expiresFrom', value)} max={draft.expiresTo || undefined} />
              <DatePicker key={`expires-to-${dateKey}`} label="Hết hạn đến" value={draft.expiresTo} onChange={value => updateDraft('expiresTo', value)} min={draft.expiresFrom || undefined} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" className="min-h-10 px-4" startIcon={<Search size={16} aria-hidden="true" />}>Áp dụng bộ lọc</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => { setDraft(current => ({ ...current, ...nextThirtyDays() })); setDateKey(key => key + 1); }}>Sắp hết hạn trong 30 ngày</Button>
              {hasFilters && <Button type="button" variant="ghost" size="sm" className="min-h-10" onClick={clearFilters} startIcon={<RotateCcw size={14} aria-hidden="true" />}>Xóa bộ lọc</Button>}
            </div>
            <p className="text-xs text-muted">Chọn điều kiện rồi nhấn Áp dụng bộ lọc để xem kết quả.</p>
          </form>
        </div>
        {loading ? <div className="p-5"><SkeletonLoading variant="table" label="Đang tải các đợt ký gửi..." /></div> : error !== null ? <div className="p-5"><ErrorState title={error === 403 ? 'Bạn không có quyền truy cập' : 'Không thể tải các đợt ký gửi'} description={error === 403 ? 'Tài khoản hoặc hồ sơ khách hàng của bạn không đủ điều kiện truy cập.' : 'Vui lòng kiểm tra kết nối và thử lại.'} onRetry={error === 403 ? undefined : () => setRefreshKey(key => key + 1)} /></div> : data.items.length === 0 ? <div className="p-5"><EmptyState title="Không tìm thấy đợt ký gửi" description="Thử thay đổi hoặc xóa bộ lọc." /></div> : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white [&_thead]:!bg-surface-dashboard/70 [&_thead]:!text-text-secondary" columns={columns} data={data.items} rowKey="contractId" selectedRowKey={selectedContractId} onRowClick={item => setSelectedContractId(item.contractId)} />{data.totalPages > 1 && <div className="border-t border-border px-4 py-4"><Pagination page={page} totalPages={data.totalPages} onPageChange={nextPage => { setPage(nextPage); setSelectedContractId(null); setDetailsOpen(false); }} aria-label="Phân trang đợt ký gửi" /></div>}</>}
      </section>
    </>}
    {selectedItem && <ConsignmentDetailsModal key={selectedItem.contractId} item={selectedItem} onClose={() => setDetailsOpen(false)} />}
  </div>;
}
