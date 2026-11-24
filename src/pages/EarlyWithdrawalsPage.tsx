import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageMinus, RotateCcw } from 'lucide-react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type EligibleWithdrawalProduct } from '@/api/earlyWithdrawals';
import { AlertBanner, Button, EmptyState, ErrorState, Input, PageHeaderCard, SkeletonLoading, Table, type TableColumn } from '@/components/shared';
import { WithdrawalRequestsTable } from '@/components/shared/WithdrawalRequestsTable';
import { WithdrawalDetailsModal } from '@/components/shared/WithdrawalDetailsModal';
import { CreateWithdrawalModal } from '@/components/customer/CreateWithdrawalModal';
import { withdrawalDate, withdrawalError, withdrawalEstimate, withdrawalMoney } from '@/utils/earlyWithdrawals';

export function CustomerEarlyWithdrawalsPage() {
  const [products, setProducts] = useState<EligibleWithdrawalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [draftItems, setDraftItems] = useState<EligibleWithdrawalProduct[] | null>(null);
  const [selected, setSelected] = useState<EarlyWithdrawal | null>(null);
  const [notice, setNotice] = useState('');
  const update = () => { setRefresh(x => x + 1); };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setChosen([]);
    earlyWithdrawalsApi.eligible(controller.signal)
      .then(items => { if (!controller.signal.aborted) setProducts(items); })
      .catch(err => { if (!controller.signal.aborted) setError(withdrawalError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
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
    <PageHeaderCard icon={<PackageMinus size={24} />} title="Rút hàng sớm" description="Chọn món muốn lấy lại, xem phí theo hợp đồng và theo dõi cửa hàng xử lý." actions={<Button variant="outline" disabled={loading} onClick={update} startIcon={<RotateCcw size={16} />}>Cập nhật</Button>} />
    {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
    <section className="min-w-0 overflow-hidden rounded-card border border-brand-lavender/40 bg-white shadow-sm" aria-label="Chọn món đủ điều kiện rút">
      <div className="space-y-3 border-b border-border p-4 sm:p-6"><h2 className="font-bold text-brand-ink">Chọn món muốn rút</h2><p className="text-sm text-muted">Chỉ hiển thị hàng còn bán, hợp đồng còn hạn và đã có mức phí rút sớm. Món đang có yêu cầu xử lý sẽ không được chọn lại.</p><Input aria-label="Tìm món đủ điều kiện rút" placeholder="Tên món, barcode hoặc mã hợp đồng…" value={query} onChange={e => setQuery(e.target.value)} /></div>
      {loading ? <SkeletonLoading variant="table" columns={5} count={4} className="p-5" label="Đang kiểm tra món đủ điều kiện..." /> : error ? <ErrorState title="Không thể kiểm tra sản phẩm" description={error} onRetry={update} />
        : !products.length ? <EmptyState className="border-0" title="Chưa có món đủ điều kiện rút sớm" description="Bạn có thể kiểm tra các yêu cầu đã gửi bên dưới. Nếu hợp đồng chưa có phí rút sớm, vui lòng liên hệ cửa hàng." action={<Link to="/my-consignments" className="font-semibold text-brand-highlight underline">Xem hàng ký gửi của tôi</Link>} />
        : <><p className="px-4 py-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem phí từng món</p><Table className="rounded-none border-0 !bg-white" columns={columns} data={visible} rowKey="productId" emptyTitle="Không tìm thấy món phù hợp" emptyMessage="Thử tên món hoặc mã hợp đồng khác." />
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-brand-pink-surface p-4 sm:px-6"><div aria-live="polite"><p className="text-sm font-semibold">Đã chọn {selectedProducts.length}/100 món</p><p className="mt-1 text-sm text-muted">Tổng phí dự kiến <strong className="ml-1 text-lg text-brand-highlight">{withdrawalMoney(withdrawalEstimate(selectedProducts))}</strong></p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={!chosen.length} onClick={() => setChosen([])}>Bỏ chọn</Button><Button disabled={loading || !selectedProducts.length || selectedProducts.length > 100} onClick={() => setDraftItems(selectedProducts)}>Tiếp tục gửi yêu cầu</Button></div></div></>}
    </section>
    <WithdrawalRequestsTable customer refresh={refresh} onSelect={setSelected} />
    {draftItems && <CreateWithdrawalModal items={draftItems} onClose={() => setDraftItems(null)} onStale={update} onCreated={row => { setDraftItems(null); setSelected(row); setNotice('Đã gửi yêu cầu rút hàng. Cửa hàng sẽ kiểm tra và phản hồi.'); update(); }} />}
    {selected && <WithdrawalDetailsModal key={selected.id} item={selected} customer onClose={() => setSelected(null)} onUpdated={update} />}
  </div>;
}

export function StaffEarlyWithdrawalsPage() {
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<EarlyWithdrawal | null>(null);
  return <section className="space-y-5 text-ink">
    <PageHeaderCard icon={<PackageMinus size={24} />} title="Xử lý rút hàng sớm" description="Duyệt yêu cầu, ghi nhận phí đã thu và xác nhận giao đủ hàng cho khách." />
    <AlertBanner variant="info" message="Duyệt để giữ hàng cho khách. Chỉ ghi nhận thu phí khi đã nhận đủ tiền; chỉ xác nhận bàn giao sau khi giao đủ các món trong phiếu." />
    <WithdrawalRequestsTable customer={false} refresh={refresh} onSelect={setSelected} />
    {selected && <WithdrawalDetailsModal key={selected.id} item={selected} customer={false} onClose={() => setSelected(null)} onUpdated={() => setRefresh(x => x + 1)} />}
  </section>;
}
