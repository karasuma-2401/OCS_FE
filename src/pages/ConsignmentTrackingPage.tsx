import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, RotateCcw, Search } from 'lucide-react';
import { getMyConsignments, type Consignment } from '@/api/consignments';
import { ConsignmentDetailsModal } from '@/components/customer/ConsignmentDetailsModal';
import { Badge, Button, Combobox, EmptyState, ErrorState, Input, PageHeaderCard, Pagination, SkeletonLoading, Table, TableDetailButton, type BadgeVariant, type TableColumn } from '@/components/shared';

const CONTRACTS_PER_PAGE = 5;

const contractStatuses: Record<string, [string, BadgeVariant]> = {
  Active: ['Đang hiệu lực', 'success'], Completed: ['Đã hoàn tất', 'info'], Cancelled: ['Đã hủy', 'danger'],
};
const money = (value: number | null) => value == null ? 'Chưa có thông tin' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ₫`;
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN');
};
export function ConsignmentTrackingPage() {
  const [items, setItems] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const overview = useMemo(() => ({
    active: items.filter(item => item.status === 'Active').length,
    onSale: items.reduce((total, item) => total + item.products.filter(product => product.status === 'OnSale').length, 0),
    sold: items.reduce((total, item) => total + item.products.filter(product => product.status === 'Sold').length, 0),
    settled: items.reduce((total, item) => total + item.settledAmount, 0),
  }), [items]);
  const filteredItems = useMemo(() => items.filter(item =>
    (status === 'all' || item.status === status) &&
    `${item.contractNumber} ${item.products.map(product => `${product.name} ${product.barcode}`).join(' ')}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')),
  ), [items, query, status]);
  const totalPages = Math.ceil(filteredItems.length / CONTRACTS_PER_PAGE);
  const visibleItems = filteredItems.slice((page - 1) * CONTRACTS_PER_PAGE, page * CONTRACTS_PER_PAGE);
  const hasFilters = Boolean(query || status !== 'all');
  const selectedItem = detailsOpen ? items.find(item => item.contractId === selectedContractId) ?? null : null;
  const openContract = (contractId: string) => { setSelectedContractId(contractId); setDetailsOpen(true); };
  const columns: TableColumn<Consignment>[] = [
    { key: 'contractNumber', header: 'Hợp đồng', render: item => <div><p className="font-bold text-brand-highlight">{item.contractNumber}</p><p className="mt-0.5 text-xs text-muted">Ký {date(item.signedAt)}</p></div> },
    { key: 'status', header: 'Trạng thái', render: item => <Badge variant={(contractStatuses[item.status] ?? ['', 'neutral'])[1]}>{(contractStatuses[item.status] ?? [item.status || 'Chưa có thông tin'])[0]}</Badge> },
    { key: 'products', header: 'Sản phẩm', render: item => <span className="font-semibold text-ink">{item.products.length} món</span> },
    { key: 'endsAt', header: 'Hết hạn', render: item => date(item.endsAt), cellClassName: 'whitespace-nowrap' },
    { key: 'estimatedPayout', header: 'Dự kiến nhận', render: item => <strong className="whitespace-nowrap text-brand-highlight">{money(item.estimatedPayout)}</strong> },
    { key: 'settledAmount', header: 'Đã quyết toán', render: item => <strong className="whitespace-nowrap text-state-success-strong">{money(item.settledAmount)}</strong> },
    { key: 'action', header: 'Chi tiết', render: item => <TableDetailButton onClick={() => openContract(item.contractId)} /> },
  ];
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await getMyConsignments()); }
    catch (err: unknown) { setError((err as { response?: { status?: number } }).response?.status ?? 0); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] py-8 max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] sm:py-12">
    <h1 className="sr-only">Theo dõi ký gửi</h1>
    <div className="mb-6 [&_h2]:!mt-0 [&_h2]:!text-lg [&_h2]:!leading-normal [&_h2]:!tracking-normal">
      <PageHeaderCard
        icon={<Package size={22} aria-hidden="true" />}
        title="Theo dõi ký gửi"
        description="Theo dõi hợp đồng và tình trạng sản phẩm ký gửi của bạn."
        actions={!loading && error === null ? <Button variant="outline" size="sm" onClick={() => void load()} startIcon={<RotateCcw size={14} />}>Làm mới</Button> : undefined}
      />
    </div>
    {loading ? <SkeletonLoading variant="cards" count={3} label="Đang tải các đợt ký gửi..." /> : error !== null ? <ErrorState title={error === 403 ? 'Bạn không có quyền truy cập' : 'Không thể tải các đợt ký gửi'} description={error === 403 ? 'Tài khoản hoặc hồ sơ khách hàng của bạn không đủ điều kiện truy cập.' : 'Vui lòng kiểm tra kết nối và thử lại.'} onRetry={error === 403 ? undefined : () => void load()} /> : items.length === 0 ? <EmptyState title="Chưa có đợt ký gửi nào" description="Các hợp đồng ký gửi của bạn sẽ xuất hiện tại đây khi được tạo." action={<Link to="/consign" className="inline-flex rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-brand-ink">Tìm hiểu ký gửi</Link>} /> : <>
      <section aria-label="Tổng quan ký gửi" className="mb-5 grid grid-cols-2 divide-x-0 divide-y divide-border rounded-2xl border border-brand-lavender/40 bg-paper px-4 py-2 shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:px-2">
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đợt ký gửi</p><p className="mt-1 text-xl font-bold text-brand-ink">{items.length} <span className="text-xs font-medium text-muted">· {overview.active} hiệu lực</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đang bán</p><p className="mt-1 text-xl font-bold text-brand-ink">{overview.onSale} <span className="text-xs font-medium text-muted">sản phẩm</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đã bán</p><p className="mt-1 text-xl font-bold text-state-success-strong">{overview.sold} <span className="text-xs font-medium text-muted">sản phẩm</span></p></div>
        <div className="px-3 py-3"><p className="text-xs font-semibold text-text-secondary">Đã quyết toán</p><p className="mt-1 text-xl font-bold text-brand-highlight">{money(overview.settled)}</p></div>
      </section>
      <section aria-label="Danh sách đợt ký gửi" className="min-w-0 overflow-hidden rounded-card bg-white">
        <div className="border-b border-border px-4 py-5 sm:px-6">
          <h2 className="!mt-0 !text-base !tracking-normal text-brand-ink">Danh sách đợt ký gửi</h2>
          <p className="mt-1 text-sm text-text-secondary">Chọn dòng để đánh dấu, nhấn Chi tiết để xem hợp đồng và sản phẩm.</p>
          <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); setQuery(searchInput.trim()); setPage(1); }}><div className="min-w-0 flex-1"><Input aria-label="Tìm đợt ký gửi" placeholder="Mã hợp đồng, tên hoặc mã sản phẩm…" value={searchInput} onChange={event => setSearchInput(event.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} /></div><Button type="submit" size="sm" className="min-h-10 px-4">Tìm kiếm</Button></form>
          <div className="mt-4 max-w-xs"><Combobox label="Trạng thái hợp đồng" value={status} onChange={value => { setStatus(value); setPage(1); }} options={[{ value: 'all', label: 'Tất cả trạng thái' }, { value: 'Active', label: 'Đang hiệu lực' }, { value: 'Completed', label: 'Đã hoàn tất' }, { value: 'Cancelled', label: 'Đã hủy' }]} /></div>
          {hasFilters && <button type="button" onClick={() => { setQuery(''); setSearchInput(''); setStatus('all'); setPage(1); }} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-highlight hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"><RotateCcw size={14} aria-hidden="true" /> Xóa bộ lọc</button>}
        </div>
        {filteredItems.length === 0 ? <div className="p-5"><EmptyState title="Không tìm thấy đợt ký gửi" description="Thử từ khóa khác hoặc xóa bộ lọc." /></div> : <><div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-text-secondary sm:px-6"><p><strong className="tabular-nums text-brand-ink">{filteredItems.length}</strong> đợt ký gửi{hasFilters ? ' phù hợp' : ''}</p><p className="text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p></div><Table className="rounded-none border-0 !bg-white [&_thead]:!bg-surface-dashboard/70 [&_thead]:!text-text-secondary" columns={columns} data={visibleItems} rowKey="contractId" selectedRowKey={selectedContractId} onRowClick={item => setSelectedContractId(item.contractId)} />{totalPages > 1 && <div className="border-t border-border px-4 py-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} aria-label="Phân trang đợt ký gửi" /></div>}</>}
      </section>
    </>}
    {selectedItem && <ConsignmentDetailsModal key={selectedItem.contractId} item={selectedItem} onClose={() => setDetailsOpen(false)} />}
  </div>;
}
