import { withdrawalPaymentApi } from '@/api/withdrawalPayments';
import { VietQrPaymentModal } from '@/components/shop/pos/VietQrPaymentModal';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleDot, CircleX } from 'lucide-react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type WithdrawalItem } from '@/api/earlyWithdrawals';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, ErrorState, Input, Modal, Select, SkeletonLoading, Table, type TableColumn } from '@/components/shared';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';
import { withdrawalActions, withdrawalDate, withdrawalError, withdrawalMoney, withdrawalFeeState, withdrawalNextStep } from '@/utils/earlyWithdrawals';

type Action = 'approve' | 'reject' | 'pay' | 'handover' | 'cancel';
const actionLabels: Record<Action, string> = {
  approve: 'Duyệt yêu cầu', reject: 'Từ chối yêu cầu', pay: 'Xác nhận đã thu đủ phí',
  handover: 'Xác nhận đã bàn giao', cancel: 'Hủy yêu cầu',
};
export function WithdrawalDetailsModal({ item, customer, onClose, onUpdated, onRequestAgain }: {
  item: EarlyWithdrawal; customer: boolean; onClose: () => void; onUpdated: () => void;
  onRequestAgain?: (item: EarlyWithdrawal) => void;
}) {
  const { hasPermission } = useAuth();
  const formId = useId();
  const guard = useRef(false);
  const [detail, setDetail] = useState(item);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<Action | null>(null);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'Cash' | 'VietQr'>('VietQr');
  const [qrOpen, setQrOpen] = useState(false);
  const qrApi = useMemo(() => withdrawalPaymentApi(item.id), [item.id]);
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    earlyWithdrawalsApi.detail(customer, item.id, controller.signal)
      .then(row => { if (!controller.signal.aborted) setDetail(row); })
      .catch(err => { if (!controller.signal.aborted) setLoadError(withdrawalError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customer, item.id, retry]);
  const available = withdrawalActions(detail);
  const fee = withdrawalFeeState(detail);
  const ended = detail.status === 'Cancelled' || detail.status === 'Rejected';
  const currentStep = detail.status === 'Pending' ? 0 : detail.status === 'Approved' ? (detail.paymentStatus === 'Paid' ? 2 : 1) : -1;
  const progress = [
    { title: '1. Duyệt yêu cầu', done: !!detail.approvedAt || detail.status === 'Approved' || detail.status === 'Completed',
      text: detail.approvedAt ? withdrawalDate(detail.approvedAt) : detail.status === 'Rejected' ? 'Đã từ chối' : detail.status === 'Cancelled' ? 'Khách đã hủy' : 'Chưa duyệt' },
    { title: '2. Thu phí', done: !!detail.paidAt || detail.paymentStatus === 'Paid' && (detail.status === 'Approved' || detail.status === 'Completed'),
      text: detail.paidAt ? withdrawalDate(detail.paidAt) : fee.label },
    { title: '3. Bàn giao', done: !!detail.handedOverAt || detail.status === 'Completed',
      text: detail.handedOverAt ? withdrawalDate(detail.handedOverAt) : ended ? 'Không thực hiện · phiếu đã kết thúc' : detail.status === 'Approved' && detail.paymentStatus === 'Paid' ? 'Chờ nhận hàng' : 'Chưa đến bước bàn giao' },
  ];
  const stoppedStep = ended ? progress.findIndex(step => !step.done) : -1;
  const allowed = (action: Action) => available[action] && (customer ? action === 'cancel' :
    action !== 'cancel' && hasPermission(`withdrawals.${action === 'reject' ? 'approve' : action === 'pay' ? 'payment' : action}`));
  function start(action: Action) { setMode(action); setNote(''); setReference(''); setMethod('VietQr'); setConfirmed(false); setError(''); setNotice(''); }
  const valid = mode && allowed(mode) && (confirmed || mode === 'pay' && method === 'VietQr') &&
    (!(mode === 'reject' || mode === 'handover') || Boolean(note.trim()));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!mode || !valid || guard.current || loading || loadError) return;
    if (mode === 'pay' && method === 'VietQr') { setQrOpen(true); return; }
    guard.current = true; setBusy(true); setError(''); setNotice('');
    const action = mode;
    try {
      const updated = action === 'approve' ? await earlyWithdrawalsApi.approve(detail.id)
        : action === 'reject' ? await earlyWithdrawalsApi.reject(detail.id, note.trim())
        : action === 'pay' ? await earlyWithdrawalsApi.pay(detail.id, { amount: detail.totalPenaltyAmount, paymentMethod: 'Cash', reference: reference.trim() || undefined })
        : action === 'handover' ? await earlyWithdrawalsApi.handover(detail.id, note.trim())
        : await earlyWithdrawalsApi.cancel(detail.id);
      setDetail(updated); setMode(null); onUpdated();
      setNotice(action === 'approve' ? 'Đã duyệt yêu cầu và giữ hàng để trả khách.' : action === 'reject' ? 'Đã từ chối yêu cầu và lưu lý do cho khách.'
        : action === 'pay' ? 'Đã ghi nhận thu đủ phí.' : action === 'handover' ? 'Đã ghi nhận bàn giao và cập nhật trạng thái sản phẩm.' : 'Đã hủy yêu cầu.');
    } catch (err) {
      setError(withdrawalError(err));
      if ((err as { response?: { status?: number } }).response?.status === 409) {
        setMode(null);
        try { setDetail(await earlyWithdrawalsApi.detail(customer, detail.id)); onUpdated(); }
        catch (loadErr) { setLoadError(withdrawalError(loadErr)); }
      }
    } finally { guard.current = false; setBusy(false); }
  }
  const columns: TableColumn<WithdrawalItem>[] = [
    { key: 'name', header: 'Sản phẩm', render: p => <div><p className="whitespace-normal font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted">{p.contractNumber || 'Hợp đồng ký gửi'}</p></div> },
    { key: 'price', header: 'Giá niêm yết', render: p => <span className="whitespace-nowrap">{withdrawalMoney(p.listedPrice)}</span> },
    { key: 'rate', header: 'Tỷ lệ phí', render: p => `${p.penaltyRate}%` },
    { key: 'fee', header: 'Phí rút', render: p => <strong className="whitespace-nowrap text-brand-highlight">{withdrawalMoney(p.penaltyAmount)}</strong> },
  ];
  return <><Modal open={!qrOpen} onClose={onClose} disabled={busy} title={mode ? actionLabels[mode] : 'Chi tiết yêu cầu rút hàng'}
    description={`Phiếu ${detail.id.slice(0, 8).toUpperCase()} · Gửi ${withdrawalDate(detail.requestedAt)}`} className="max-w-3xl"
    footer={mode ? <><Button variant="outline" disabled={busy} onClick={() => { setMode(null); setError(''); }}>Quay lại</Button><Button form={formId} type="submit" variant={mode === 'reject' || mode === 'cancel' ? 'danger' : 'primary'} loading={busy} disabled={!valid || !!loadError}>{mode === 'pay' && method === 'VietQr' ? 'Mở VietQR' : actionLabels[mode]}</Button></> : <Button variant="outline" onClick={onClose}>Đóng</Button>}>
    {loading ? <SkeletonLoading variant="table" label="Đang tải yêu cầu rút hàng..." /> : loadError ? <ErrorState title="Không thể tải phiếu mới nhất" description={loadError} onRetry={() => setRetry(x => x + 1)} /> : <div className="space-y-5">
      {error && <AlertBanner variant="error" title="Chưa thể hoàn tất thao tác" message={error} />}
      {notice && <AlertBanner variant="success" message={notice} />}
      <div className="flex flex-wrap items-center gap-2"><WithdrawalStatusBadge status={detail.status} /><Badge variant={fee.tone}>{fee.label}</Badge></div>
      <p className="text-sm leading-relaxed text-muted">{withdrawalNextStep(detail, customer)}</p>
      {!customer && <div className="rounded-xl bg-surface-dashboard p-4"><p className="font-bold">{detail.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-sm text-muted">{detail.customerPhone || 'Chưa có số điện thoại'}</p></div>}
      <div><p className="text-xs font-semibold text-muted">Lý do rút hàng</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.reason || 'Chưa có thông tin'}</p></div>
      {detail.status === 'Rejected' && <AlertBanner variant="error" title="Lý do từ chối" message={<span className="whitespace-pre-wrap break-words">{detail.decisionNote || 'Chưa có lý do được ghi nhận. Vui lòng liên hệ cửa hàng.'}</span>} />}
      {customer && (detail.status === 'Cancelled' || detail.status === 'Rejected') && <AlertBanner variant="info" message="Bạn có thể gửi yêu cầu mới cho những món vẫn đủ điều kiện rút. Phiếu cũ được giữ lại trong lịch sử; phí sẽ được kiểm tra lại trước khi gửi." action={onRequestAgain ? { label: 'Chọn món để gửi lại', onClick: () => onRequestAgain(detail) } : undefined} />}
      <div><p className="mb-2 text-sm font-semibold">{detail.items.length} món trong yêu cầu</p><Table columns={columns} data={detail.items} rowKey="productId" /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-4"><div><p className="text-sm font-semibold">{ended ? 'Phí trên phiếu đã kết thúc' : 'Tổng phí theo yêu cầu'}</p><p className="mt-1 text-xs text-muted">{fee.caption}</p></div><strong className={`text-xl tabular-nums ${ended ? 'text-muted' : 'text-brand-highlight'}`}>{withdrawalMoney(detail.totalPenaltyAmount)}</strong></div>
      <ol className="grid gap-3 text-sm sm:grid-cols-3" aria-label="Tiến trình xử lý">
        {progress.map((step, index) => {
          const current = index === currentStep;
          const stopped = index === stoppedStep;
          const tone = step.done ? 'border-state-success/30 bg-state-success-soft text-state-success-strong'
            : current ? 'border-brand-highlight bg-brand-pink-light text-brand-highlight ring-1 ring-brand-highlight/20'
            : stopped && detail.status === 'Rejected' ? 'border-state-danger/30 bg-state-danger-soft text-state-danger'
            : 'border-border bg-surface-dashboard/50 text-muted';
          return <li key={step.title} aria-current={current ? 'step' : undefined} className={`rounded-xl border p-3 ${tone}`}>
            <div className="flex items-center justify-between gap-2"><p className="font-semibold">{step.title}</p>
              {step.done ? <><CheckCircle2 size={18} className="shrink-0" aria-hidden="true" /><span className="sr-only">Đã hoàn thành</span></>
                : current ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold"><CircleDot size={14} aria-hidden="true" />Hiện tại</span>
                : stopped ? <><CircleX size={18} className="shrink-0" aria-hidden="true" /><span className="sr-only">Đã dừng</span></> : null}
            </div><p className="mt-1 text-xs">{step.text}</p>
          </li>;
        })}
      </ol>
      {detail.handoverEvidence && <div><p className="text-xs font-semibold text-muted">Ghi nhận bàn giao</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.handoverEvidence}</p></div>}
      {detail.status === 'Approved' && !mode && <AlertBanner variant="info" message={detail.paymentStatus === 'Paid' ? 'Phí đã được xử lý. Hàng đang chờ bàn giao cho khách.' : 'Yêu cầu đã được duyệt. Cần thu đủ phí trước khi bàn giao hàng.'} />}
      {!mode && <div className="flex flex-wrap gap-2">{(['approve', 'reject', 'pay', 'handover', 'cancel'] as Action[]).filter(allowed).map(action => <Button key={action} variant={action === 'reject' || action === 'cancel' ? 'outline' : 'primary'} onClick={() => start(action)}>{actionLabels[action]}</Button>)}</div>}
      {mode && <form id={formId} onSubmit={submit} className="space-y-4 rounded-xl border border-brand-lavender/40 bg-surface-dashboard p-4">
        {mode === 'reject' && <Input label="Lý do từ chối" required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} helperText="Khách sẽ thấy đầy đủ lý do này khi theo dõi yêu cầu." />}
        {mode === 'handover' && <Input label="Bằng chứng / biên bản bàn giao" required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} placeholder="Ví dụ: Khách đã nhận đủ hàng, biên bản BG-001" />}
        {mode === 'pay' && <><Select label="Phương thức thu phí" value={method} onChange={e => { setMethod(e.target.value as 'Cash' | 'VietQr'); setConfirmed(false); }} disabled={busy}><option value="VietQr">Chuyển khoản VietQR</option><option value="Cash">Tiền mặt</option></Select>
          {method === 'VietQr' ? <AlertBanner variant="info" message="Khách quét mã để thanh toán. Hệ thống tự ghi nhận khi nhận được xác nhận giao dịch." /> : <><AlertBanner variant="info" title={`Số tiền cần thu: ${withdrawalMoney(detail.totalPenaltyAmount)}`} message="Chỉ xác nhận sau khi thực tế đã nhận đủ tiền từ khách." /><Input label="Mã tham chiếu (nếu có)" maxLength={64} value={reference} onChange={e => setReference(e.target.value)} disabled={busy} /></>}</>}
        {!(mode === 'pay' && method === 'VietQr') && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} className="mt-1 size-4 shrink-0 accent-brand-highlight" required /><span>{mode === 'pay' ? `Tôi đã nhận đủ ${withdrawalMoney(detail.totalPenaltyAmount)}.` : mode === 'handover' ? `Tôi đã kiểm tra và giao đủ ${detail.items.length} món cho khách.` : mode === 'approve' ? 'Tôi đã kiểm tra hàng và đồng ý giữ các món này để trả khách.' : mode === 'reject' ? 'Tôi xác nhận từ chối yêu cầu và thông báo lý do trên cho khách.' : 'Tôi muốn hủy yêu cầu rút hàng đang chờ duyệt.'}</span></label>}
      </form>}
    </div>}
  </Modal>
    {qrOpen && <VietQrPaymentModal open saleInvoiceId={detail.id} paymentApi={qrApi}
      paymentTitle="Thu phí rút hàng · VietQR" documentLabel="yêu cầu rút hàng"
      initialAmount={detail.totalPenaltyAmount} initialInvoiceNumber={`RS-${detail.id.slice(0, 8).toUpperCase()}`}
      onPaymentSuccess={() => { setMode(null); setNotice('Đã ghi nhận thu đủ phí. Có thể bàn giao hàng.'); onUpdated(); }}
      onClose={() => { setQrOpen(false); setRetry(x => x + 1); onUpdated(); }} />}
  </>;
}
