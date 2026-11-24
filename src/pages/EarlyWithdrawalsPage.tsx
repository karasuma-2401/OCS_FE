import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, PackageMinus, RefreshCw, Search, X } from 'lucide-react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type EligibleWithdrawalProduct } from '@/api/earlyWithdrawals';
import { AlertBanner, Button, Card, EmptyState, ErrorState, Input, PageHeaderCard, SkeletonLoading, Table, type TableColumn } from '@/components/shared';
import { ListFilterChips } from '@/components/shop/ListFilterChips';
import { WithdrawalRequestsTable } from '@/components/shared/WithdrawalRequestsTable';
import { WithdrawalDetailsModal } from '@/components/shared/WithdrawalDetailsModal';
import { CreateWithdrawalModal } from '@/components/customer/CreateWithdrawalModal';
import { withdrawalDate, withdrawalError, withdrawalEstimate, withdrawalMoney } from '@/utils/earlyWithdrawals';

export function CustomerEarlyWithdrawalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'requests' ? 'requests' : 'withdraw';
  const targetProductId = params.get('productId');
  const targetContractId = params.get('contractId');
  const targetRequestId = params.get('requestId');
  const appliedTarget = useRef('');
  const [products, setProducts] = useState<EligibleWithdrawalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [draftItems, setDraftItems] = useState<EligibleWithdrawalProduct[] | null>(null);
  const [selected, setSelected] = useState<EarlyWithdrawal | null>(null);
  const [notice, setNotice] = useState('');
  const [requestError, setRequestError] = useState('');
  const retryProductIds = useRef<string[] | null>(null);
  const [retryNotice, setRetryNotice] = useState('');
  const setTab = (value: 'withdraw' | 'requests') => setParams(current => {
    const next = new URLSearchParams(current); next.set('tab', value); next.delete('requestId'); return next;
  });
  const clearTarget = () => {
    setParams(current => { const next = new URLSearchParams(current); next.delete('productId'); next.delete('contractId'); return next; }, { replace: true });
    setSearch(''); setQuery('');
  };
  const closeDetail = () => {
    setSelected(null);
    setParams(current => { const next = new URLSearchParams(current); next.delete('requestId'); return next; }, { replace: true });
  };
  const update = () => { setRefresh(x => x + 1); };
  useEffect(() => {
    if (tab !== 'withdraw') return;
    const controller = new AbortController();
    setLoading(true); setError('');
    earlyWithdrawalsApi.eligible(controller.signal)
      .then(items => {
        if (controller.signal.aborted) return;
        setProducts(items);
        const retryIds = retryProductIds.current;
        if (retryIds) {
          const available = items.filter(p => retryIds.includes(p.productId));
          setChosen(available.map(p => p.productId));
          setRetryNotice(available.length === retryIds.length
            ? 'Đã chọn lại các món còn đủ điều kiện. Kiểm tra phí và chọn lý do trước khi gửi yêu cầu mới.'
            : `Có ${available.length}/${retryIds.length} món còn đủ điều kiện và đã được chọn. Các món còn lại có thể đã bán, hết hạn hoặc có yêu cầu khác đang xử lý.`);
          retryProductIds.current = null;
        } else setChosen(current => current.filter(id => items.some(p => p.productId === id)));
      })
      .catch(err => { if (!controller.signal.aborted) setError(withdrawalError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, tab]);
  useEffect(() => {
    if (tab !== 'withdraw' || loading || error || !targetProductId) return;
    const key = `${targetContractId ?? ''}/${targetProductId}`;
    if (appliedTarget.current === key) return;
    const target = products.find(p => p.productId === targetProductId && (!targetContractId || p.contractId === targetContractId));
    if (!target) return;
    appliedTarget.current = key;
    setChosen([target.productId]); setSearch(target.barcode); setQuery(target.barcode);
  }, [tab, loading, error, targetProductId, targetContractId, products]);
  useEffect(() => {
    if (tab !== 'requests' || !targetRequestId) return;
    const controller = new AbortController(); setRequestError('');
    earlyWithdrawalsApi.detail(true, targetRequestId, controller.signal)
      .then(row => { if (!controller.signal.aborted) setSelected(row); })
      .catch(err => { if (!controller.signal.aborted) setRequestError(withdrawalError(err)); });
    return () => controller.abort();
  }, [tab, targetRequestId]);
  useEffect(() => {
    if (tab !== 'withdraw') return;
    const refreshVisible = () => { if (document.visibilityState === 'visible') setRefresh(x => x + 1); };
    window.addEventListener('focus', refreshVisible);
    return () => window.removeEventListener('focus', refreshVisible);
  }, [tab]);
  const targetProduct = products.find(p => p.productId === targetProductId && (!targetContractId || p.contractId === targetContractId));
  const selectedProducts = products.filter(p => chosen.includes(p.productId));
  const visible = products.filter(p => `${p.name} ${p.barcode} ${p.contractNumber}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const columns: TableColumn<EligibleWithdrawalProduct>[] = [
    { key: 'choose', header: 'Chọn', render: p => <input type="checkbox" aria-label={`Chọn ${p.name}, ${p.barcode}`} checked={chosen.includes(p.productId)} disabled={!chosen.includes(p.productId) && chosen.length >= 100} onChange={e => setChosen(current => e.target.checked ? [...new Set([...current, p.productId])] : current.filter(id => id !== p.productId))} className="size-4 accent-brand-highlight" /> },
    { key: 'product', header: 'Sản phẩm', render: p => <div><p className="whitespace-normal font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted">{p.barcode}</p></div> },
    { key: 'contract', header: 'Hợp đồng', render: p => <div><p className="font-semibold text-brand-highlight">{p.contractNumber}</p><p className="mt-1 whitespace-nowrap text-xs text-muted">Hết hạn {withdrawalDate(p.endsAt)}</p></div> },
    { key: 'price', header: 'Giá niêm yết', render: p => <span className="whitespace-nowrap">{withdrawalMoney(p.listedPrice)}</span> },
    { key: 'fee', header: 'Phí rút dự kiến', render: p => <div className="whitespace-nowrap"><p className="font-bold text-brand-highlight">{withdrawalMoney(p.penaltyAmount)}</p><p className="mt-1 text-xs text-muted">{p.penaltyRate === 0 ? 'Miễn phí theo hợp đồng' : `${p.penaltyRate}% theo hợp đồng`}</p></div> },
  ];
  return <div className="landing-container mx-auto w-[min(calc(100%_-_5rem),1320px)] space-y-5 py-8 max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)] sm:py-12 [&_h2]:!mt-0 [&_h2]:!text-lg [&_h2]:!tracking-normal">
    <h1 className="sr-only">Rút hàng sớm</h1>
    <PageHeaderCard icon={<PackageMinus size={24} />} title="Rút hàng sớm" description="Phí rút mỗi món bằng giá niêm yết nhân với tỷ lệ hoa hồng của món trên hợp đồng." />
    {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
    <div role="tablist" aria-label="Rút hàng và theo dõi yêu cầu" className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-lavender/40 bg-white p-2 shadow-sm">
      {([{ id: 'withdraw', label: 'Rút hàng', icon: PackageMinus }, { id: 'requests', label: 'Theo dõi yêu cầu muốn rút', icon: ClipboardList }] as const).map(({ id, label, icon: Icon }) => <Button key={id} id={`withdrawal-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls={`withdrawal-panel-${id}`} tabIndex={tab === id ? 0 : -1} variant={tab === id ? 'primary' : 'ghost'} className="min-h-12 whitespace-normal px-2 sm:px-4" startIcon={<Icon size={18} className="shrink-0" aria-hidden="true" />} onClick={() => setTab(id)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 'withdraw' : event.key === 'End' ? 'requests' : id === 'withdraw' ? 'requests' : 'withdraw'; setTab(next); document.getElementById(`withdrawal-tab-${next}`)?.focus();
      }}>{label}</Button>)}
    </div>
    {tab === 'withdraw' ? <section id="withdrawal-panel-withdraw" role="tabpanel" aria-labelledby="withdrawal-tab-withdraw" className="space-y-4">
    {retryNotice && <AlertBanner variant="info" message={retryNotice} onClose={() => setRetryNotice('')} />}
    {targetProductId && !loading && !error && (targetProduct ? <AlertBanner variant="info" title={`Rút ${targetProduct.name} · ${targetProduct.barcode}`} message={`Hợp đồng ${targetProduct.contractNumber}. Món đã được chọn sẵn; kiểm tra phí rồi tiếp tục gửi yêu cầu.`} action={{ label: 'Xem tất cả món', onClick: clearTarget }} /> : <AlertBanner variant="warning" title="Món được chọn không còn đủ điều kiện rút" message="Món có thể đã có yêu cầu xử lý, đã bán hoặc hết thời hạn hợp đồng. Bạn có thể kiểm tra tại tab Theo dõi yêu cầu muốn rút hoặc chọn món khác." action={{ label: 'Xem tất cả món', onClick: clearTarget }} />)}
    <Card className="min-w-0 !bg-white !p-0" aria-label="Chọn món đủ điều kiện rút">
      <div className="border-b border-border px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="!text-base font-bold text-brand-ink">Chọn món muốn rút</h2>{!loading && !error && <p className="mt-0.5 text-xs text-text-secondary">Hiển thị <span className="font-semibold tabular-nums text-brand-ink">{visible.length}</span> / <span className="font-semibold tabular-nums text-brand-ink">{products.length}</span> món đủ điều kiện</p>}</div><Button variant="outline" size="sm" disabled={loading} onClick={update} startIcon={<RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />}>Cập nhật</Button></div>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}><div className="min-w-[220px] flex-1"><Input aria-label="Tìm món đủ điều kiện rút" placeholder="Tên món, barcode hoặc mã hợp đồng…" autoComplete="off" value={search} onChange={e => setSearch(e.target.value)} startAdornment={<Search size={18} aria-hidden="true" />} endAdornment={search ? <button type="button" aria-label="Xóa từ khóa tìm món" onClick={() => { setSearch(''); setQuery(''); }} className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"><X size={15} aria-hidden="true" /></button> : undefined} /></div><Button type="submit">Tìm kiếm</Button></form>
        <ListFilterChips filters={query ? [{ id: 'q', label: `Từ khóa: “${query}”`, onRemove: () => { setSearch(''); setQuery(''); } }] : []} onReset={() => { setSearch(''); setQuery(''); }} />
        <p className="mt-3 text-xs text-muted">Chỉ hiển thị hàng còn bán, hợp đồng còn hạn và có tỷ lệ hoa hồng đã thỏa thuận. Món đang có yêu cầu xử lý sẽ không được chọn lại.</p>
      </div>
      {loading ? <SkeletonLoading variant="table" columns={5} count={4} className="p-5" label="Đang kiểm tra món đủ điều kiện..." /> : error ? <ErrorState title="Không thể kiểm tra sản phẩm" description={error} onRetry={update} />
        : !products.length ? <EmptyState className="border-0" title="Chưa có món đủ điều kiện rút sớm" description="Kiểm tra yêu cầu đã gửi tại tab Theo dõi yêu cầu muốn rút, hoặc xem lại trạng thái món trong đợt ký gửi." action={<Link to="/my-consignments" className="font-semibold text-brand-highlight underline">Xem hàng ký gửi của tôi</Link>} />
        : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem phí từng món</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={visible} rowKey="productId" emptyTitle="Không tìm thấy món phù hợp" emptyMessage="Thử tên món hoặc mã hợp đồng khác." />
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-brand-pink-surface p-4 sm:px-6"><div aria-live="polite"><p className="text-sm font-semibold">Đã chọn {selectedProducts.length}/100 món</p><p className="mt-1 text-sm text-muted">Tổng phí dự kiến <strong className="ml-1 text-lg text-brand-highlight">{withdrawalMoney(withdrawalEstimate(selectedProducts))}</strong></p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={!chosen.length} onClick={() => setChosen([])}>Bỏ chọn</Button><Button disabled={loading || !selectedProducts.length || selectedProducts.length > 100} onClick={() => setDraftItems(selectedProducts)}>Tiếp tục gửi yêu cầu</Button></div></div></>}
    </Card>
    </section> : <section id="withdrawal-panel-requests" role="tabpanel" aria-labelledby="withdrawal-tab-requests" className="space-y-4">{requestError && <AlertBanner variant="error" title="Không thể mở yêu cầu" message={requestError} onClose={() => setRequestError('')} />}<WithdrawalRequestsTable customer refresh={refresh} onSelect={setSelected} /></section>}
    {draftItems && <CreateWithdrawalModal items={draftItems} onClose={() => setDraftItems(null)} onStale={update} onTrackRequests={() => { setDraftItems(null); setParams({ tab: 'requests' }); update(); }} onCreated={row => { setDraftItems(null); setChosen([]); setSelected(row); setNotice('Đã gửi yêu cầu rút hàng. Theo dõi kết quả duyệt, thu phí và bàn giao tại đây.'); setParams({ tab: 'requests' }); setSearch(''); setQuery(''); update(); }} />}
    {selected && <WithdrawalDetailsModal key={selected.id} item={selected} customer onClose={closeDetail} onUpdated={update} onRequestAgain={row => {
      setSelected(null); setDraftItems(null); setChosen([]); setNotice(''); setRetryNotice(''); setSearch(''); setQuery('');
      retryProductIds.current = row.items.map(p => p.productId); setLoading(true); setParams({ tab: 'withdraw' }); update();
    }} />}
  </div>;
}

export function StaffEarlyWithdrawalsPage() {
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<EarlyWithdrawal | null>(null);
  return <section className="space-y-5 text-ink">
    <PageHeaderCard icon={<PackageMinus size={24} />} title="Xử lý rút hàng sớm" description="Duyệt yêu cầu, ghi nhận phí đã thu và xác nhận giao đủ hàng cho khách." />
    <WithdrawalRequestsTable customer={false} refresh={refresh} onSelect={setSelected} />
    {selected && <WithdrawalDetailsModal key={selected.id} item={selected} customer={false} onClose={() => setSelected(null)} onUpdated={() => setRefresh(x => x + 1)} />}
  </section>;
}
