import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, ClipboardCheck, FileText, Plus, Printer, RefreshCw, Search, Settings, X, Clock3, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { buyoutsApi, type Buyout, type BuyoutReceipt } from '@/api/buyouts';
import { inventoryApi, type InventoryLocation } from '@/api/inventory';
import { parseProblemDetails } from '@/api/auth';
import { Badge, Button, Card, Combobox, EmptyState, ErrorState, Input, Modal, PageHeaderCard, Pagination, SkeletonLoading, Table, TableDetailButton, Toast, type BadgeVariant, type TableColumn } from '@/components/shared';
import { ShopSummaryStrip, type ShopSummaryCard } from './ShopSummaryStrip';
import { ListFilterChips, type ListFilterChip } from './ListFilterChips';
import { useAuth } from '@/context/AuthContext';
import { BuyoutApprovalConfigModal } from './buyout/BuyoutApprovalConfigModal';

const PAGE_SIZE = 10;
const labels: Record<Buyout['status'], [string, BadgeVariant]> = {
  Pending: ['Chờ duyệt', 'warning'], Approved: ['Đã duyệt · Chờ chi', 'info'],
  Rejected: ['Đã từ chối', 'danger'], Paid: ['Đã chi tiền', 'success'],
};
const money = (amount: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(amount)} ₫`;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const errorText = (error: unknown) => { const problem = parseProblemDetails(error); return (problem.status ?? 0) >= 500 ? 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại hoặc liên hệ quản trị viên.' : problem.detail || problem.title || 'Không thể thực hiện thao tác. Vui lòng thử lại.'; };
const decisionLabels = { Disabled: 'Tự duyệt chưa được bật', BelowPurchasePrice: 'Giá bán dự kiến thấp hơn giá mua', WithinThreshold: 'Giá mua trong ngưỡng tự duyệt', AboveThreshold: 'Giá mua vượt ngưỡng tự duyệt' } as const;
const statusLabel = (item: Buyout) => item.status === 'Approved' && item.isAutoApproved ? 'Tự duyệt · Chờ chi' : (labels[item.status] ?? [item.status])[0];

export function BuyoutManagement() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requestedBuyoutId = params.get('buyoutId');
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('products.create');
  const canReview = hasPermission('products.approve') && Boolean(user?.roles?.some(role => role === 'Manager' || role === 'Admin'));
  const [view, setView] = useState<'history' | 'review'>(params.get('view') === 'history' || requestedBuyoutId ? 'history' : canReview ? 'review' : 'history');
  const [items, setItems] = useState<Buyout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Buyout | null>(null);
  const [receipt, setReceipt] = useState<BuyoutReceipt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'pay' | 'print' | null>(null);
  const [reason, setReason] = useState('');
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'BankTransfer'>('Cash');
  const [reference, setReference] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [paid, setPaid] = useState(false);
  const [notice, setNotice] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const openedFromLink = useRef<string | null>(null);

  const load = useCallback(async (background = false) => {
    const requestId = ++listRequestId.current;
    if (!background) setLoading(true);
    try { const result = await buyoutsApi.list(); if (requestId === listRequestId.current) { setItems(result); setLoadError(''); } }
    catch (error) { if (!background && requestId === listRequestId.current) setLoadError(errorText(error)); }
    finally { if (requestId === listRequestId.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(true); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi-VN');
    return items.filter(item => (view !== 'review' || item.status === 'Pending') && (status === 'all' || item.status === status) &&
      `${item.buyoutNumber} ${item.inspection.name} ${item.customerName} ${item.customerId} ${item.productBarcode ?? ''}`.toLocaleLowerCase('vi-VN').includes(term));
  }, [items, query, status, view]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  useEffect(() => { if (page > Math.max(1, totalPages)) setPage(Math.max(1, totalPages)); }, [page, totalPages]);
  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetFilters = () => { setSearch(''); setQuery(''); setStatus('all'); setView('history'); setPage(1); setSelectedId(null); };
  const effectiveStatus = view === 'review' ? 'Pending' : status;
  const summaryCards: ShopSummaryCard[] = [
    { id: 'all', label: 'Tổng phiếu', value: items.length, hint: 'Tất cả phiếu thu mua', icon: FileText, tone: 'bg-brand-pink-light text-brand-highlight' },
    { id: 'Pending', label: 'Chờ duyệt', value: items.filter(item => item.status === 'Pending').length, hint: 'Cần kiểm tra & xét duyệt', icon: Clock3, tone: 'bg-state-warning-soft text-state-warning' },
    { id: 'Approved', label: 'Chờ chi tiền', value: items.filter(item => item.status === 'Approved').length, hint: 'Đã duyệt phiếu thu mua', icon: Banknote, tone: 'bg-state-info-soft text-state-info' },
    { id: 'Paid', label: 'Đã chi tiền', value: items.filter(item => item.status === 'Paid').length, hint: 'Đã tạo sản phẩm trong kho', icon: CheckCircle2, tone: 'bg-state-success-soft text-state-success' },
  ].map(card => ({ ...card, value: loading || loadError ? undefined : card.value }));
  const chips: ListFilterChip[] = [
    ...(query ? [{ id: 'query', label: `Từ khóa: “${query}”`, onRemove: () => { setSearch(''); setQuery(''); setPage(1); } }] : []),
    ...(effectiveStatus !== 'all' ? [{ id: 'status', label: `Trạng thái: ${labels[effectiveStatus as Buyout['status']]?.[0] ?? effectiveStatus}`, onRemove: () => { setStatus('all'); setView('history'); setPage(1); } }] : []),
  ];
  const selectStatus = (value: string) => { setStatus(value); setView('history'); setPage(1); setSelectedId(null); };
  const updateItem = (item: Buyout) => { listRequestId.current++; setLoading(false); setItems(current => [item, ...current.filter(entry => entry.id !== item.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))); };
  const refreshDetail = async (id: string) => {
    const latest = await buyoutsApi.detail(id);
    setDetail(latest); updateItem(latest); setNeedsReload(false);
    return latest;
  };
  const openDetail = async (id: string) => {
    const requestId = ++detailRequestId.current;
    setSelectedId(id); setDetail(null); setReceipt(null); setAction(null); setDetailError(''); setNeedsReload(false); setDetailLoading(true);
    try { const latest = await buyoutsApi.detail(id); if (requestId === detailRequestId.current) { setDetail(latest); updateItem(latest); } }
    catch (error) { if (requestId === detailRequestId.current) setDetailError(errorText(error)); }
    finally { if (requestId === detailRequestId.current) setDetailLoading(false); }
  };
  useEffect(() => {
    if (!requestedBuyoutId) { openedFromLink.current = null; return; }
    if (loading || openedFromLink.current === requestedBuyoutId) return;
    openedFromLink.current = requestedBuyoutId;
    setView('history');
    void openDetail(requestedBuyoutId);
  }, [requestedBuyoutId, loading]);
  const closeDetail = () => { if (!busy) { detailRequestId.current++; setDetail(null); setDetailError(''); setDetailLoading(false); setSelectedId(null); setAction(null); if (requestedBuyoutId) setParams(current => { const next = new URLSearchParams(current); next.delete('buyoutId'); return next; }, { replace: true }); } };
  const startPayment = async () => {
    setDetailError(''); setAction('pay'); setLocationId(''); setReference(''); setAgreed(false); setPaid(false); setPaymentMethod('Cash');
    setBusy(true);
    try { setLocations(await inventoryApi.locations()); } catch (error) { setLocations([]); setDetailError(`Không thể tải vị trí kho. ${errorText(error)}`); }
    finally { setBusy(false); }
  };
  const openReceipt = async () => {
    if (!detail || busy) return;
    setBusy(true); setDetailError('');
    try { setReceipt(await buyoutsApi.receipt(detail.id)); setAction('print'); }
    catch (error) { setDetailError(`Không thể tải chứng từ. ${errorText(error)}`); }
    finally { setBusy(false); }
  };
  const submitAction = async (event: FormEvent) => {
    event.preventDefault();
    if (!detail || busy || needsReload) return;
    if (action === 'reject' && !reason.trim()) { setDetailError('Vui lòng nhập lý do từ chối.'); return; }
    if (action === 'pay' && (!locationId || !agreed || !paid || (paymentMethod === 'BankTransfer' && !reference.trim()))) {
      setDetailError('Vui lòng chọn vị trí kho, xác nhận khách đồng ý và khoản tiền đã được chi; chuyển khoản cần mã giao dịch.'); return;
    }
    setBusy(true); setDetailError('');
    try {
      const result = action === 'pay'
        ? await buyoutsApi.pay(detail.id, { expectedVersion: detail.version, storageLocationId: locationId, paymentMethod, bankTransactionReference: paymentMethod === 'BankTransfer' ? reference.trim() : null, customerAgreed: true })
        : await buyoutsApi.review(detail.id, detail.version, action === 'approve', action === 'reject' ? reason.trim() : null);
      setDetail(result); updateItem(result); setAction(null); setReason('');
      setNotice(result.status === 'Paid' ? 'Đã ghi nhận chi tiền và tạo sản phẩm trong kho.' : result.status === 'Approved' ? 'Đã duyệt phiếu mua đứt.' : 'Đã từ chối phiếu mua đứt.');
    } catch (error) {
      const problem = parseProblemDetails(error);
      if (action === 'pay' || problem.status === 409 || problem.status === 0) {
        setNeedsReload(true); setAction(null);
        setDetailError(action === 'pay' ? 'Chưa xác định được kết quả ghi nhận chi. Hãy tải lại phiếu và kiểm tra trạng thái trước khi thao tác tiếp.' : 'Phiếu có thể đã thay đổi. Hãy tải lại trước khi thao tác tiếp.');
      } else setDetailError(errorText(error));
    } finally { setBusy(false); }
  };

  const columns: TableColumn<Buyout>[] = [
    { key: 'number', header: 'Phiếu mua đứt', render: item => <div><p className="font-bold text-brand-highlight">{item.buyoutNumber}</p><p className="mt-1 text-xs text-muted">{dateTime(item.createdAt)}</p></div> },
    { key: 'product', header: 'Sản phẩm', render: item => <div><p className="font-semibold text-ink">{item.inspection.name}</p><p className="mt-1 text-xs text-muted">{item.inspection.size} · {item.inspection.conditionPercentage}%</p></div> },
    { key: 'customer', header: 'Khách hàng', render: item => item.customerName },
    { key: 'status', header: 'Trạng thái', render: item => <Badge variant={(labels[item.status] ?? [item.status, 'neutral'])[1]}>{statusLabel(item)}</Badge> },
    { key: 'cost', header: 'Giá mua / vốn', render: item => <strong className="whitespace-nowrap text-brand-highlight">{money(item.purchasePrice)}</strong> },
    { key: 'price', header: 'Giá bán dự kiến', render: item => <span className="whitespace-nowrap">{money(item.listedPrice)}</span> },
    { key: 'action', header: 'Thao tác', render: item => <TableDetailButton onClick={() => void openDetail(item.id)} /> },
  ];

  return <div className="space-y-5">
    <PageHeaderCard icon={<Banknote size={23} />} title="Thu mua đứt" description="Lập phiếu, xét duyệt và theo dõi việc chi tiền thu mua." actions={<div className="flex flex-wrap items-center gap-2">{canReview && <Button variant="outline" onClick={() => setConfigOpen(true)} startIcon={<Settings size={18} />}>Cấu hình tự duyệt</Button>}{canCreate && <Button onClick={() => navigate('/shop/reception/new?direct=1&type=buyout&from=buyouts')} startIcon={<Plus size={18} />}>Lập phiếu</Button>}</div>} />
    {canReview && <BuyoutApprovalConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />}
    {notice && typeof document !== 'undefined' && createPortal(<div className="fixed right-4 top-4 z-[3000] w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none"><Toast variant="success" title="Thành công" message={notice} onClose={() => setNotice('')} /></div>, document.body)}
    <ShopSummaryStrip cards={summaryCards} loading={loading} activeQuickFilter={query ? null : effectiveStatus} onSelectQuickFilter={value => { setSearch(''); setQuery(''); selectStatus(value); }} gridClassName="grid-cols-2 xl:grid-cols-4" ariaLabel="Thống kê nhanh thu mua đứt" loadingLabel="Đang tải thống kê thu mua…" />
    <Card className="min-w-0 !bg-white !p-0">
      <div className="border-b border-border px-4 py-5 sm:px-6">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border" role="group" aria-label="Chức năng thu mua đứt">
        {([{ id: 'review', label: 'Chờ duyệt', show: canReview }, { id: 'history', label: 'Lịch sử thu mua', show: true }] as const).filter(tab => tab.show).map(tab => <button key={tab.id} type="button" aria-pressed={view === tab.id} onClick={() => { setView(tab.id); setPage(1); setStatus('all'); setNotice(''); }} className={`border-b-2 px-4 py-3 text-sm font-semibold disabled:opacity-50 ${view === tab.id ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight'}`}>{tab.label}</button>)}
      </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-brand-ink">{view === 'review' ? 'Phiếu chờ xét duyệt' : 'Lịch sử thu mua'}</h2>{!loading && !loadError && <p className="mt-0.5 text-xs text-text-secondary">Hiển thị <span className="font-semibold tabular-nums text-brand-ink">{displayed.length}</span> / <span className="font-semibold tabular-nums text-brand-ink">{filtered.length.toLocaleString('vi-VN')}</span> phiếu{chips.length ? ' phù hợp bộ lọc' : ''}</p>}</div>
          <Button variant="outline" size="sm" aria-label="Làm mới danh sách thu mua" disabled={loading} onClick={() => void load()} startIcon={<RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />}>Làm mới</Button>
        </div>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); setSelectedId(null); }}>
          <div className="min-w-[220px] flex-1"><Input aria-label="Tìm phiếu thu mua" placeholder="Mã phiếu, sản phẩm hoặc khách hàng…" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} endAdornment={search ? <button type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={() => { setSearch(''); setQuery(''); setPage(1); }} className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"><X size={15} aria-hidden="true" /></button> : undefined} /></div>
          <Button type="submit" size="md">Tìm kiếm</Button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Combobox label="Trạng thái phiếu" value={effectiveStatus} onChange={selectStatus} options={[{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(labels).map(([value, [label]]) => ({ value, label }))]} /></div>
        <ListFilterChips filters={chips} onReset={resetFilters} />
      </div>
        {loading ? <SkeletonLoading variant="table" className="p-5 sm:p-6" label="Đang tải phiếu thu mua..." /> : loadError ? <ErrorState title="Không thể tải phiếu thu mua" description={loadError} onRetry={() => void load()} /> : displayed.length === 0 ? <EmptyState className="border-0" title="Không có phiếu phù hợp" description="Thử đổi bộ lọc hoặc lập phiếu mới." /> : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem bảng</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={displayed} rowKey="id" selectedRowKey={selectedId} onRowClick={item => setSelectedId(item.id)} />{totalPages > 1 && <div className="border-t border-border p-4"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}</>}
    </Card>
    <Modal open={Boolean(selectedId && (detailLoading || detail || detailError))} onClose={closeDetail} disabled={busy} title={detail ? `Phiếu ${detail.buyoutNumber}` : 'Chi tiết phiếu thu mua'} description="Kiểm tra thông tin trước khi xét duyệt hoặc ghi nhận chi tiền." className="!max-w-3xl" footer={detail && !action ? <div className="flex flex-wrap justify-end gap-2">{detail.status === 'Paid' && <Button variant="outline" loading={busy} onClick={() => void openReceipt()} startIcon={<FileText size={16} />}>Xem / in chứng từ</Button>}{detail.status === 'Pending' && canReview && <><Button variant="outline" disabled={needsReload} onClick={() => { setReason(''); setAction('reject'); setDetailError(''); }}>Từ chối</Button><Button disabled={needsReload} onClick={() => { setAction('approve'); setDetailError(''); }} startIcon={<ClipboardCheck size={16} />}>Duyệt phiếu</Button></>}{detail.status === 'Approved' && canCreate && <Button disabled={needsReload} onClick={() => void startPayment()} startIcon={<Banknote size={16} />}>Ghi nhận đã chi</Button>}</div> : undefined}>
      {detailLoading ? <SkeletonLoading variant="cards" count={2} label="Đang tải chi tiết..." /> : !detail ? <ErrorState title="Không thể tải chi tiết" description={detailError} onRetry={selectedId ? () => void openDetail(selectedId) : undefined} /> : <>
        {detailError && <div role="alert" className="mb-4 rounded-xl border border-state-danger/30 bg-paper p-3 text-sm text-state-danger">{detailError}{needsReload && <Button className="ml-2" variant="outline" size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await refreshDetail(detail.id); setDetailError(''); } catch (error) { setDetailError(`Không thể tải lại phiếu. ${errorText(error)}`); } finally { setBusy(false); } }}>Tải lại phiếu</Button>}</div>}
        {action === 'print' && receipt ? <BuyoutPrint receipt={receipt} onBack={() => setAction(null)} /> : action ? <form onSubmit={event => void submitAction(event)} className="space-y-4">
          <p className="rounded-xl bg-brand-pink-surface p-4 text-sm font-semibold text-brand-ink">{action === 'approve' ? 'Xác nhận duyệt phiếu này?' : action === 'reject' ? 'Ghi lý do để nhân viên có thể xem và lập lại phiếu.' : 'Chỉ ghi nhận sau khi khách đồng ý và nhân viên đã chi tiền thực tế. Hệ thống không tự chuyển khoản.'}</p>
          {action === 'reject' && <Input label="Lý do từ chối" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} required />}
          {action === 'pay' && <><Combobox label="Vị trí kho" value={locationId} onChange={setLocationId} options={locations.map(location => ({ value: location.id, label: `${location.code} · ${location.name}` }))} placeholder="Chọn vị trí kho" />{locations.length === 0 && <p className="text-sm text-muted">Chưa có vị trí kho khả dụng. Hãy tạo vị trí trong trang Quản lý kho.</p>}<Combobox label="Hình thức đã chi" value={paymentMethod} onChange={value => setPaymentMethod(value as 'Cash' | 'BankTransfer')} options={[{ value: 'Cash', label: 'Tiền mặt' }, { value: 'BankTransfer', label: 'Chuyển khoản' }]} />{paymentMethod === 'BankTransfer' && <Input label="Mã giao dịch chuyển khoản" value={reference} onChange={event => setReference(event.target.value)} maxLength={100} required />}<label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} className="mt-1 accent-brand-highlight" />Khách hàng đã đồng ý với việc thu mua.</label><label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} className="mt-1 accent-brand-highlight" />Tôi xác nhận đã chi đủ {money(detail.purchasePrice)} cho khách.</label></>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => { setAction(null); setDetailError(''); }}>Quay lại</Button><Button type="submit" loading={busy} disabled={action === 'pay' && (!locationId || !agreed || !paid)}>{action === 'approve' ? 'Xác nhận duyệt' : action === 'reject' ? 'Xác nhận từ chối' : 'Xác nhận đã chi tiền'}</Button></div>
        </form> : <BuyoutDetails item={detail} />}
      </>}
    </Modal>
  </div>;
}

function BuyoutDetails({ item }: { item: Buyout }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-pink-surface p-4">
      <div><p className="text-xs font-semibold uppercase text-muted">Sản phẩm đã kiểm định</p><p className="mt-1 text-lg font-bold text-brand-ink">{item.inspection.name}</p><p className="mt-1 text-sm text-text-secondary">{item.inspection.brandName} · {item.inspection.categoryName} · {item.inspection.size} · Tình trạng {item.inspection.conditionPercentage}%</p></div>
      <Badge variant={(labels[item.status] ?? [item.status, 'neutral'])[1]}>{statusLabel(item)}</Badge>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><p className="text-xs text-muted">Giá mua / giá vốn</p><p className="mt-1 text-xl font-bold text-brand-highlight">{money(item.purchasePrice)}</p></div><div className="rounded-xl border border-border p-4"><p className="text-xs text-muted">Giá bán dự kiến</p><p className="mt-1 text-xl font-bold text-ink">{money(item.listedPrice)}</p></div></div>
    <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-muted">Khách hàng</dt><dd className="font-semibold">{item.customerName}</dd></div>
      <div><dt className="text-muted">Ngày lập</dt><dd className="font-semibold">{dateTime(item.createdAt)}</dd></div>
      {item.approvalDecisionReason && <div><dt className="text-muted">Kết quả xét duyệt ban đầu</dt><dd>{decisionLabels[item.approvalDecisionReason] || item.approvalDecisionReason}{item.isAutoApproved && ' · Hệ thống tự duyệt'}</dd></div>}
      {item.appliedApprovalThreshold != null && <div><dt className="text-muted">Ngưỡng áp dụng khi lập phiếu</dt><dd>{money(item.appliedApprovalThreshold)}</dd></div>}
      <div><dt className="text-muted">Ghi chú kiểm định</dt><dd className="whitespace-pre-wrap">{item.inspection.inspectionNotes}</dd></div>
      <div><dt className="text-muted">Ngày ghi nhận chi</dt><dd>{dateTime(item.paidAt)}</dd></div>
      {item.inspection.description && <div className="sm:col-span-2"><dt className="text-muted">Mô tả sản phẩm</dt><dd className="whitespace-pre-wrap">{item.inspection.description}</dd></div>}
      {item.rejectionReason && <div className="sm:col-span-2"><dt className="text-muted">Lý do từ chối</dt><dd className="whitespace-pre-wrap">{item.rejectionReason}</dd></div>}
      {item.productBarcode && <div className="sm:col-span-2"><dt className="text-muted">Sản phẩm trong kho</dt><dd className="font-semibold">{item.productBarcode} · <Link to="/shop/inventory" className="text-brand-highlight underline">Mở quản lý kho</Link></dd></div>}
    </dl>
    <p className="text-xs text-muted">Giá mua được lưu riêng làm giá vốn khi ghi nhận chi tiền; chênh lệch so với giá niêm yết chưa phải lợi nhuận thực tế.</p>
  </div>;
}

function BuyoutPrint({ receipt, onBack }: { receipt: BuyoutReceipt; onBack: () => void }) {
  return <div className="space-y-4"><style>{`@media print { body * { visibility: hidden !important; } #buyout-print, #buyout-print * { visibility: visible !important; } #buyout-print { position: absolute; inset: 0; width: 100%; background: white; color: black; padding: 12mm; } .buyout-print-actions { display: none !important; } }`}</style><div id="buyout-print" className="space-y-4 rounded-xl border border-border bg-white p-6"><h3 className="text-center text-xl font-bold text-ink">PHIẾU GHI NHẬN CHI THU MUA</h3><p className="text-center text-sm text-muted">{receipt.buyoutNumber} · Đã chi tiền</p><dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">Khách hàng</dt><dd className="font-semibold">{receipt.customerName}</dd></div><div><dt className="text-muted">Sản phẩm</dt><dd className="font-semibold">{receipt.productName} · {receipt.size} · {receipt.conditionPercentage}%</dd></div><div><dt className="text-muted">Số tiền đã chi / giá vốn</dt><dd className="font-bold">{money(receipt.purchasePrice)}</dd></div><div><dt className="text-muted">Hình thức</dt><dd>{receipt.paymentMethod === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản'}</dd></div><div><dt className="text-muted">Mã giao dịch ngân hàng</dt><dd className="break-all">{receipt.bankTransactionReference || '—'}</dd></div><div><dt className="text-muted">Mã giao dịch hệ thống</dt><dd className="break-all">{receipt.transactionId}</dd></div><div><dt className="text-muted">Thời điểm ghi nhận</dt><dd>{dateTime(receipt.paidAt)}</dd></div><div><dt className="text-muted">Nhân viên ghi nhận</dt><dd>{receipt.paidByEmployeeName}</dd></div><div><dt className="text-muted">Mã sản phẩm</dt><dd>{receipt.productBarcode || '—'}</dd></div></dl><p className="text-xs text-muted">Thông tin được ghi nhận trong hệ thống sau khi nhân viên xác nhận đã chi tiền.</p></div><div className="buyout-print-actions flex justify-end gap-2"><Button variant="outline" onClick={onBack}>Quay lại</Button><Button onClick={() => window.print()} startIcon={<Printer size={16} />}>In chứng từ</Button></div></div>;
}
