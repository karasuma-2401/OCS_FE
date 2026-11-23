import { useEffect, useState } from 'react';
import { Barcode, Printer } from 'lucide-react';
import { expiryApi, type DonationReceipt, type ExpiryProcessing, type ExpiryProduct } from '@/api/expiry';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, Combobox, ErrorState, Input, Modal, SkeletonLoading, Table, type TableColumn } from '@/components/shared';

export const expiryDate = (value: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có hạn nhận';
const timestamp = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export const expiryLabel = (item: ExpiryProcessing) => item.status === 'Completed' ? 'Hoàn tất' : item.type === 'Return' ? 'Chờ trả khách' : item.status === 'OverdueDonated' ? 'Đã duyệt, chờ quyên góp' : 'Chờ quyên góp';
export function ExpiryTypeBadge({ type }: { type: ExpiryProcessing['type'] }) {
  return <Badge variant={type === 'Return' ? 'info' : type === 'Donate' ? 'brand' : 'neutral'}>{type === 'Return' ? 'Hoàn trả' : type === 'Donate' ? 'Quyên góp' : 'Chưa xác định'}</Badge>;
}
export function expiryError(error: unknown) {
  const response = (error as { response?: { status?: number; data?: { title?: string } } }).response;
  if (response?.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  return response?.data?.title || 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}
type Mode = 'details' | 'handover' | 'unclaimed' | 'receipts' | 'print';
const unclaimedReasons = [
  { value: 'contract', label: 'Quá hạn nhận theo điều khoản hợp đồng', hint: 'Ghi điều khoản hoặc thỏa thuận cho phép chuyển quyên góp khi quá hạn.' },
  { value: 'notified', label: 'Đã thông báo nhưng khách không đến nhận', hint: 'Ghi ngày và cách đã liên hệ, ví dụ: gọi điện ngày 20/11, khách hẹn nhưng không đến.' },
  { value: 'consent', label: 'Khách đồng ý chuyển sang quyên góp', hint: 'Ghi thời điểm và cách khách xác nhận, ví dụ: đồng ý qua tin nhắn ngày 20/11.' },
  { value: 'other', label: 'Lý do khác', hint: 'Mô tả lý do thực tế và căn cứ chuyển các món còn lại sang quyên góp.' },
];
export function ExpiryDetailsModal({ item, onClose, onUpdated }: { item: ExpiryProcessing; onClose: () => void; onUpdated: () => void }) {
  const { hasRole, hasPermission } = useAuth();
  const can = (permission: string) => hasRole('Admin') || hasPermission(permission);
  const [detail, setDetail] = useState(item);
  const [mode, setMode] = useState<Mode>('details');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [barcode, setBarcode] = useState('');
  const [organization, setOrganization] = useState('');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [basis, setBasis] = useState('');
  const [reason, setReason] = useState('');
  const selectedReason = unclaimedReasons.find(option => option.value === reason);
  const unclaimedBasis = selectedReason ? `${selectedReason.label}${basis.trim() ? `\nChi tiết: ${basis.trim()}` : ''}` : '';
  const unclaimedValid = Boolean(selectedReason && basis.trim() && unclaimedBasis.length <= 1000);
  const [confirming, setConfirming] = useState(false);
  const [receipts, setReceipts] = useState<DonationReceipt[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptRetry, setReceiptRetry] = useState(0);
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    expiryApi.detail(item.id).then(result => { if (active) setDetail(result); }).catch(err => { if (active) setLoadError(expiryError(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item.id, retry]);
  useEffect(() => {
    if (mode !== 'receipts') return;
    let active = true;
    setReceiptLoading(true); setReceiptError('');
    expiryApi.donationReceipts(item.id).then(result => { if (active) setReceipts(result); }).catch(err => { if (active) setReceiptError(expiryError(err)); }).finally(() => { if (active) setReceiptLoading(false); });
    return () => { active = false; };
  }, [item.id, mode, receiptRetry]);
  const pending = detail.products.filter(p => p.status === 'Expired');
  const donate = detail.type === 'Donate';
  const canHandOver = pending.length > 0 && detail.status !== 'Completed' && can(donate ? 'expiry.donate' : 'expiry.return');
  const canUnclaimed = !donate && detail.status === 'Pending' && pending.length > 0 && can('expiry.mark-unclaimed') && (hasRole('Admin') || hasRole('Manager'));
  const deadlineReached = Boolean(detail.collectionDeadline && new Date(detail.collectionDeadline).getTime() <= Date.now());
  const chosenProducts = pending.filter(p => chosen.includes(p.barcode));
  const switchMode = (next: Mode) => { setMode(next); setError(''); setConfirming(false); };
  function startHandover() { setChosen([]); setBarcode(''); setOrganization(''); setEvidence(''); setNote(''); switchMode('handover'); }
  function scan() {
    const product = pending.find(p => p.barcode.toLowerCase() === barcode.trim().toLowerCase());
    if (!product) { setError('Không tìm thấy barcode trong các món đang chờ của phiếu này.'); return; }
    if (chosen.includes(product.barcode)) { setError('Món này đã được chọn.'); return; }
    setChosen(current => [...current, product.barcode]); setBarcode(''); setError('');
  }
  async function submit() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = mode === 'unclaimed' ? await expiryApi.markUnclaimed(detail.id, unclaimedBasis) : donate
        ? await expiryApi.confirmDonation(detail.id, chosenProducts.map(p => p.barcode), organization.trim(), evidence.trim(), note.trim())
        : await expiryApi.confirmReturn(detail.id, chosenProducts.map(p => p.barcode));
      setDetail(updated); setChosen([]); setConfirming(false); setMode('details'); onUpdated();
      setNotice(mode === 'unclaimed' ? 'Đã chuyển hàng còn lại sang chờ quyên góp.' : donate ? 'Đã ghi nhận bàn giao. Bạn có thể mở Biên nhận để in.' : 'Đã ghi nhận trả hàng cho khách.');
    } catch (err) {
      setError(expiryError(err)); setConfirming(false);
      if ((err as { response?: { status?: number } }).response?.status === 409) {
        setChosen([]); setMode('details');
        try { setDetail(await expiryApi.detail(detail.id)); setError('Phiếu đã thay đổi hoặc chưa đủ điều kiện xử lý. Vui lòng kiểm tra lại thông tin.'); onUpdated(); }
        catch { setLoadError('Không thể tải lại phiếu. Vui lòng thử lại.'); }
      }
    } finally { setBusy(false); }
  }
  const productColumns: TableColumn<ExpiryProduct>[] = [
    ...(mode === 'handover' && !confirming ? [{ key: 'select', header: <input type="checkbox" aria-label="Chọn tất cả món đang chờ" className="accent-brand-highlight" checked={pending.length > 0 && chosenProducts.length === pending.length} onChange={e => setChosen(e.target.checked ? pending.map(p => p.barcode) : [])} />, render: (p: ExpiryProduct) => <input type="checkbox" aria-label={`Chọn ${p.name}, ${p.barcode}`} className="accent-brand-highlight" checked={chosen.includes(p.barcode)} onChange={e => setChosen(current => e.target.checked ? [...current, p.barcode] : current.filter(code => code !== p.barcode))} /> }] : []),
    { key: 'name', header: 'Sản phẩm', render: p => <div><p className="max-w-xs whitespace-normal font-semibold text-brand-ink">{p.name}</p><p className="mt-1 text-xs text-muted">{p.barcode}</p></div> },
    { key: 'price', header: 'Giá niêm yết', render: p => <span className="whitespace-nowrap">{money(p.listedPrice)}</span> },
    { key: 'status', header: 'Trạng thái', render: p => <div><Badge variant={p.status === 'Expired' ? 'warning' : 'success'}>{p.status === 'Expired' ? 'Chờ xử lý' : p.status === 'Returned' ? 'Đã trả khách' : p.status === 'Donated' ? 'Đã quyên góp' : p.status}</Badge>{p.handledAt && <p className="mt-1 text-xs text-muted">{timestamp(p.handledAt)}</p>}{p.recipientOrganization && <p className="mt-1 max-w-48 whitespace-normal text-xs text-muted">Nơi nhận: {p.recipientOrganization}</p>}</div> },
  ];
  const handoverValid = chosenProducts.length > 0 && (!donate || Boolean(organization.trim() && evidence.trim()));
  const subtitle = mode === 'handover' ? (confirming ? 'Kiểm tra trước khi xác nhận bàn giao' : donate ? 'Chọn sản phẩm đã bàn giao cho tổ chức nhận' : 'Chọn sản phẩm đã trả cho khách') : mode === 'unclaimed' ? 'Chuyển hàng khách không nhận sang quyên góp' : mode === 'receipts' ? 'Các lần bàn giao quyên góp' : mode === 'print' ? 'Biên nhận bàn giao' : 'Thông tin khách hàng và sản phẩm hết hạn';
  return <Modal open onClose={onClose} disabled={busy} className="!w-[calc(100vw-2rem)] !max-w-[960px]" contentClassName="!bg-white" title={`Hợp đồng ${detail.contractNumber}`} description={subtitle} footer={loading || loadError ? undefined : <div className="flex flex-wrap items-center justify-between gap-3">
    <Button variant="outline" disabled={busy} onClick={() => mode === 'details' ? onClose() : switchMode(mode === 'print' ? 'receipts' : 'details')}>{mode === 'details' ? 'Đóng' : 'Quay lại'}</Button>
    <div className="flex flex-wrap gap-2">
      {mode === 'details' && <>{donate && <Button variant="outline" onClick={() => switchMode('receipts')}>Biên nhận</Button>}{canHandOver && <Button onClick={startHandover}>{donate ? 'Bàn giao quyên góp' : 'Trả hàng cho khách'}</Button>}</>}
      {(mode === 'handover' || mode === 'unclaimed') && (confirming ? <><Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Chỉnh lại</Button><Button loading={busy} onClick={() => void submit()}>{mode === 'unclaimed' ? 'Duyệt chuyển quyên góp' : donate ? 'Xác nhận đã bàn giao' : 'Xác nhận đã trả khách'}</Button></> : <Button disabled={mode === 'unclaimed' ? !unclaimedValid || !deadlineReached : !handoverValid} onClick={() => { setError(''); setConfirming(true); }}>Kiểm tra và xác nhận</Button>)}
      {mode === 'print' && <Button startIcon={<Printer size={16} />} onClick={() => window.print()}>In biên nhận</Button>}
    </div>
  </div>}>
    {loading ? <SkeletonLoading variant="detail" label="Đang tải chi tiết phiếu..." /> : loadError ? <ErrorState title="Không thể tải chi tiết" description={loadError} onRetry={() => setRetry(x => x + 1)} /> : <div className="space-y-5">
      {error && <AlertBanner variant="error" message={error} />}
      {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
      {mode === 'details' && <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-pink-surface p-4"><div><p className="text-xs text-muted">Khách ký gửi</p><p className="mt-1 font-bold text-brand-ink">{detail.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-sm text-text-secondary">{detail.customerPhone || 'Chưa có số điện thoại'}</p></div><div className="flex flex-wrap gap-2"><ExpiryTypeBadge type={detail.type} /><Badge variant={detail.status === 'Completed' ? 'success' : 'warning'}>{expiryLabel(detail)}</Badge></div></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">{[['Ngày hết hạn', expiryDate(detail.endsAt)], [donate ? 'Hướng xử lý' : 'Hạn khách nhận hàng', donate ? 'Quyên góp' : expiryDate(detail.collectionDeadline)], ['Tiến độ', `${detail.products.length - pending.length}/${detail.products.length} món đã xử lý`]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-white p-4"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold text-ink">{value}</dd></div>)}</dl>
        <section><h3 className="mb-3 font-bold text-brand-ink">Sản phẩm ({detail.products.length})</h3><Table className="!bg-white [&_th]:!px-3 [&_td]:!px-3" columns={productColumns} data={detail.products} rowKey="id" /></section>
        {canHandOver && <p className="text-sm text-muted">{pending.length} món đang chờ. Chọn “{donate ? 'Bàn giao quyên góp' : 'Trả hàng cho khách'}” để ghi nhận lần bàn giao này.</p>}
        {canUnclaimed && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><h3 className="text-sm font-semibold">Khách không đến nhận?</h3><p className="mt-1 text-xs text-muted">{deadlineReached ? 'Có thể đề nghị chuyển các món còn lại sang quyên góp.' : detail.collectionDeadline ? `Có thể xem xét từ ${expiryDate(detail.collectionDeadline)}.` : 'Chưa có hạn nhận hàng để duyệt chuyển quyên góp.'}</p></div><Button size="sm" variant="outline" disabled={!deadlineReached} onClick={() => { setBasis(''); setReason(''); switchMode('unclaimed'); }}>Xem xét quyên góp</Button></div>}
        {detail.products.some(p => p.evidence || p.note) && <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold text-text-secondary">Ghi chú các lần bàn giao</summary><div className="mt-3 space-y-3">{detail.products.filter(p => p.evidence || p.note).map(p => <dl key={p.id} className="rounded-xl border border-border p-3 text-sm"><dt className="font-semibold">{p.name} · {p.barcode}</dt>{p.evidence && <dd className="mt-1">Bằng chứng: {p.evidence}</dd>}{p.note && <dd className="mt-1">Ghi chú: {p.note}</dd>}</dl>)}</div></details>}
      </>}
      {mode === 'handover' && <fieldset disabled={busy} className="min-w-0 space-y-4">
        <AlertBanner variant="info" message={confirming ? `Bạn sắp ghi nhận ${chosenProducts.length} món đã ${donate ? 'bàn giao quyên góp' : 'trả cho khách'}. Chỉ xác nhận sau khi giao hàng thực tế.` : 'Chọn các món đã giao trong bảng. Có thể xử lý một phần và tiếp tục các món còn lại vào lần sau.'} />
        {!confirming && <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); scan(); }}><Input className="flex-1" label="Chọn nhanh bằng barcode" placeholder="Quét hoặc nhập barcode rồi Enter" value={barcode} onChange={e => setBarcode(e.target.value)} startAdornment={<Barcode size={17} />} /><Button type="submit" variant="outline">Thêm</Button></form>}
        <Table className="!bg-white [&_th]:!px-3 [&_td]:!px-3" columns={productColumns} data={confirming ? chosenProducts : pending} rowKey="id" />
        <p className="text-sm font-semibold text-brand-highlight">Đã chọn {chosenProducts.length}/{pending.length} món</p>
        {donate && (confirming ? <dl className="grid gap-3 rounded-xl border border-border p-4 text-sm"><div><dt className="text-muted">Tổ chức nhận</dt><dd className="font-semibold">{organization}</dd></div><div><dt className="text-muted">Bằng chứng bàn giao</dt><dd>{evidence}</dd></div>{note && <div><dt className="text-muted">Ghi chú</dt><dd>{note}</dd></div>}</dl> : <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2"><Input label="Tổ chức nhận *" value={organization} onChange={e => setOrganization(e.target.value)} maxLength={200} placeholder="Tên đơn vị nhận quyên góp" /><Input label="Bằng chứng bàn giao *" value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={1000} placeholder="Mã biên nhận hoặc mô tả bàn giao" /><Input className="sm:col-span-2" label="Ghi chú (không bắt buộc)" value={note} onChange={e => setNote(e.target.value)} maxLength={1000} /></div>)}
      </fieldset>}
      {mode === 'unclaimed' && <div className="space-y-4"><AlertBanner variant="warning" title="Chuyển hàng còn lại sang quyên góp" message={`Áp dụng cho toàn bộ ${pending.length} món khách chưa nhận. Sau khi duyệt, nhân viên vẫn cần xác nhận bàn giao cho tổ chức nhận.`} /><Table className="!bg-white" columns={productColumns} data={pending} rowKey="id" />{confirming ? <div className="text-sm"><p className="text-muted">Lý do / căn cứ</p><p className="mt-1 whitespace-pre-wrap">{unclaimedBasis}</p></div> : <div className="space-y-4"><Combobox label="Lý do chuyển quyên góp *" placeholder="Chọn lý do phù hợp" value={reason} onChange={value => { setReason(value); setBasis(''); }} options={unclaimedReasons} helperText="Chọn theo tình huống thực tế, sau đó bổ sung căn cứ để người duyệt đối chiếu." />{selectedReason && <Input label="Thông tin làm căn cứ *" placeholder={reason === 'contract' ? 'Ví dụ: Điều 5 của hợp đồng ký gửi…' : reason === 'notified' ? 'Ví dụ: Đã gọi điện ngày…; kết quả…' : reason === 'consent' ? 'Ví dụ: Khách xác nhận qua tin nhắn ngày…' : 'Nhập lý do cụ thể…'} helperText={selectedReason.hint} maxLength={1000 - selectedReason.label.length - 10} value={basis} onChange={e => setBasis(e.target.value)} />}</div>}</div>}
      {mode === 'receipts' && (receiptLoading ? <SkeletonLoading variant="table" label="Đang tải biên nhận..." /> : receiptError ? <ErrorState title="Không thể tải biên nhận" description={receiptError} onRetry={() => setReceiptRetry(x => x + 1)} /> : !receipts.length ? <p className="rounded-xl border border-border p-4 text-sm text-muted">Chưa có biên nhận để in. Biên nhận được tạo khi xác nhận bàn giao quyên góp; các lần bàn giao cũ có thể chưa có bản lưu.</p> : <Table className="!bg-white" rowKey="id" data={receipts} columns={[
        { key: 'time', header: 'Lần bàn giao', render: (r: DonationReceipt, i: number) => <div><p className="font-semibold">Lần {i + 1}</p><p className="mt-1 text-xs text-muted">{timestamp(r.handledAt)}</p></div> },
        { key: 'recipient', header: 'Tổ chức nhận', accessor: 'recipientOrganization' },
        { key: 'count', header: 'Số món', render: r => r.products.length },
        { key: 'action', header: 'Biên nhận', render: r => <Button size="sm" variant="outline" onClick={() => { setReceipt(r); switchMode('print'); }}>Xem / in</Button> },
      ]} />)}
      {mode === 'print' && receipt && <section id="expiry-receipt" className="space-y-4 bg-white text-sm">
        <style>{'@media print { body * { visibility: hidden !important; } #expiry-receipt, #expiry-receipt * { visibility: visible !important; } body { overflow: visible !important; } [role="dialog"] { position: static !important; max-height: none !important; overflow: visible !important; transform: none !important; } #expiry-receipt { position: absolute; inset: 0; width: 100%; padding: 24px; } }'}</style>
        <h3 className="text-center text-lg font-bold">BIÊN NHẬN QUYÊN GÓP</h3><p className="break-all text-xs text-muted">Số biên nhận: {receipt.receiptNumber}</p>
        <dl className="grid gap-3 sm:grid-cols-2">{[['Hợp đồng', receipt.contractNumber], ['Khách ký gửi', receipt.customerName || 'Khách ký gửi'], ['Tổ chức nhận', receipt.recipientOrganization], ['Đã bàn giao lúc', timestamp(receipt.handledAt)], ['Bằng chứng', receipt.evidence], ['Ghi chú', receipt.note || '—']].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
        <Table className="!bg-white" data={receipt.products} rowKey="productId" columns={[{ key: 'name', header: 'Sản phẩm', accessor: 'name' }, { key: 'barcode', header: 'Barcode', accessor: 'barcode' }, { key: 'price', header: 'Giá niêm yết', render: p => money(p.listedPrice) }]} />
        <p className="font-semibold">Tổng số: {receipt.products.length} món đã bàn giao</p>
        <div className="grid grid-cols-2 gap-8 pt-6 text-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div>
            <p className="font-bold">NGƯỜI BÀN GIAO</p>
            <p className="mt-1 text-xs italic text-muted">(Ký và ghi rõ họ tên)</p>
            <div className="h-28" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold">ĐẠI DIỆN ĐƠN VỊ NHẬN</p>
            <p className="mt-1 text-xs italic text-muted">(Ký, ghi rõ họ tên và đóng dấu nếu có)</p>
            <div className="h-28" aria-hidden="true" />
          </div>
        </div>
      </section>}
    </div>}
  </Modal>;
}


