import { useEffect, useId, useRef, useState } from 'react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type WithdrawalItem, type WithdrawalPayment } from '@/api/earlyWithdrawals';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, ErrorState, Input, Modal, Select, SkeletonLoading, Table, type TableColumn } from '@/components/shared';
import { WithdrawalStatusBadge } from './WithdrawalStatusBadge';
import { withdrawalActions, withdrawalDate, withdrawalError, withdrawalMoney } from '@/utils/earlyWithdrawals';

type Action = 'approve' | 'reject' | 'pay' | 'handover' | 'cancel';
const actionLabels: Record<Action, string> = {
  approve: 'Duyệt yêu cầu', reject: 'Từ chối yêu cầu', pay: 'Xác nhận đã thu đủ phí',
  handover: 'Xác nhận đã bàn giao', cancel: 'Hủy yêu cầu',
};
export function WithdrawalDetailsModal({ item, customer, onClose, onUpdated }: {
  item: EarlyWithdrawal; customer: boolean; onClose: () => void; onUpdated: () => void;
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
  const [method, setMethod] = useState<WithdrawalPayment['paymentMethod']>('Cash');
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
  const allowed = (action: Action) => available[action] && (customer ? action === 'cancel' :
    action !== 'cancel' && hasPermission(`withdrawals.${action === 'reject' ? 'approve' : action === 'pay' ? 'payment' : action}`));
  function start(action: Action) { setMode(action); setNote(''); setReference(''); setMethod('Cash'); setConfirmed(false); setError(''); setNotice(''); }
  const valid = mode && allowed(mode) && confirmed &&
    (!(mode === 'reject' || mode === 'handover') || Boolean(note.trim())) &&
    (mode !== 'pay' || method !== 'BankTransfer' || Boolean(reference.trim()));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!mode || !valid || guard.current || loading || loadError) return;
    guard.current = true; setBusy(true); setError(''); setNotice('');
    const action = mode;
    try {
      const updated = action === 'approve' ? await earlyWithdrawalsApi.approve(detail.id)
        : action === 'reject' ? await earlyWithdrawalsApi.reject(detail.id, note.trim())
        : action === 'pay' ? await earlyWithdrawalsApi.pay(detail.id, { amount: detail.totalPenaltyAmount, paymentMethod: method, reference: reference.trim() || undefined })
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
  return <Modal open onClose={onClose} disabled={busy} title={mode ? actionLabels[mode] : 'Chi tiết yêu cầu rút hàng'}
    description={`Phiếu ${detail.id.slice(0, 8).toUpperCase()} · Gửi ${withdrawalDate(detail.requestedAt)}`} className="max-w-3xl"
    footer={mode ? <><Button variant="outline" disabled={busy} onClick={() => { setMode(null); setError(''); }}>Quay lại</Button><Button form={formId} type="submit" variant={mode === 'reject' || mode === 'cancel' ? 'danger' : 'primary'} loading={busy} disabled={!valid || !!loadError}>{actionLabels[mode]}</Button></> : <Button variant="outline" onClick={onClose}>Đóng</Button>}>
    {loading ? <SkeletonLoading variant="table" label="Đang tải yêu cầu rút hàng..." /> : loadError ? <ErrorState title="Không thể tải phiếu mới nhất" description={loadError} onRetry={() => setRetry(x => x + 1)} /> : <div className="space-y-5">
      {error && <AlertBanner variant="error" title="Chưa thể hoàn tất thao tác" message={error} />}
      {notice && <AlertBanner variant="success" message={notice} />}
      <div className="flex flex-wrap items-center gap-2"><WithdrawalStatusBadge status={detail.status} /><Badge variant={detail.paymentStatus === 'Paid' ? 'success' : 'warning'}>{detail.totalPenaltyAmount === 0 ? 'Miễn phí' : detail.paymentStatus === 'Paid' ? 'Đã thu đủ phí' : 'Chưa thu đủ phí'}</Badge></div>
      {!customer && <div className="rounded-xl bg-surface-dashboard p-4"><p className="font-bold">{detail.customerName || 'Khách ký gửi'}</p><p className="mt-1 text-sm text-muted">{detail.customerPhone || 'Chưa có số điện thoại'}</p></div>}
      <div><p className="text-xs font-semibold text-muted">Lý do rút hàng</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.reason || 'Chưa có thông tin'}</p></div>
      {detail.status === 'Rejected' && <AlertBanner variant="error" title="Lý do từ chối" message={<span className="whitespace-pre-wrap break-words">{detail.decisionNote || 'Chưa có lý do được ghi nhận. Vui lòng liên hệ cửa hàng.'}</span>} />}
      <Table columns={columns} data={detail.items} rowKey="productId" />
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-4"><span className="text-sm font-semibold">Tổng phí theo yêu cầu</span><strong className="text-xl text-brand-highlight">{withdrawalMoney(detail.totalPenaltyAmount)}</strong></div>
      <ol className="grid gap-3 text-sm sm:grid-cols-3" aria-label="Tiến trình xử lý">
        <li className="rounded-xl border border-border p-3"><p className="font-semibold">1. Duyệt yêu cầu</p><p className="mt-1 text-xs text-muted">{detail.approvedAt ? withdrawalDate(detail.approvedAt) : detail.status === 'Rejected' ? 'Đã từ chối' : detail.status === 'Cancelled' ? 'Khách đã hủy' : 'Chưa duyệt'}</p></li>
        <li className="rounded-xl border border-border p-3"><p className="font-semibold">2. Thu phí</p><p className="mt-1 text-xs text-muted">{detail.totalPenaltyAmount === 0 ? 'Miễn phí · không cần thu' : detail.paidAt ? withdrawalDate(detail.paidAt) : 'Chưa ghi nhận thu phí'}</p></li>
        <li className="rounded-xl border border-border p-3"><p className="font-semibold">3. Bàn giao</p><p className="mt-1 text-xs text-muted">{detail.handedOverAt ? withdrawalDate(detail.handedOverAt) : 'Chưa bàn giao'}</p></li>
      </ol>
      {detail.handoverEvidence && <div><p className="text-xs font-semibold text-muted">Ghi nhận bàn giao</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{detail.handoverEvidence}</p></div>}
      {detail.status === 'Approved' && !mode && <AlertBanner variant="info" message={detail.paymentStatus === 'Paid' ? 'Phí đã được xử lý. Hàng đang chờ bàn giao cho khách.' : 'Yêu cầu đã được duyệt. Cần thu đủ phí trước khi bàn giao hàng.'} />}
      {!mode && <div className="flex flex-wrap gap-2">{(['approve', 'reject', 'pay', 'handover', 'cancel'] as Action[]).filter(allowed).map(action => <Button key={action} variant={action === 'reject' || action === 'cancel' ? 'outline' : 'primary'} onClick={() => start(action)}>{actionLabels[action]}</Button>)}</div>}
      {mode && <form id={formId} onSubmit={submit} className="space-y-4 rounded-xl border border-brand-lavender/40 bg-surface-dashboard p-4">
        {mode === 'reject' && <Input label="Lý do từ chối" required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} helperText="Khách sẽ thấy đầy đủ lý do này khi theo dõi yêu cầu." />}
        {mode === 'handover' && <Input label="Bằng chứng / biên bản bàn giao" required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} placeholder="Ví dụ: Khách đã nhận đủ hàng, biên bản BG-001" />}
        {mode === 'pay' && <><AlertBanner variant="info" title={`Số tiền cần thu: ${withdrawalMoney(detail.totalPenaltyAmount)}`} message="Chỉ xác nhận sau khi thực tế đã nhận đủ tiền từ khách." /><Select label="Phương thức đã thu" value={method} onChange={e => setMethod(e.target.value as WithdrawalPayment['paymentMethod'])} disabled={busy}><option value="Cash">Tiền mặt</option><option value="BankTransfer">Chuyển khoản</option></Select><Input label={method === 'BankTransfer' ? 'Mã tham chiếu chuyển khoản (bắt buộc)' : 'Mã tham chiếu (nếu có)'} required={method === 'BankTransfer'} maxLength={64} value={reference} onChange={e => setReference(e.target.value)} disabled={busy} /></>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} className="mt-1 size-4 shrink-0 accent-brand-highlight" required /><span>{mode === 'pay' ? `Tôi đã nhận đủ ${withdrawalMoney(detail.totalPenaltyAmount)}.` : mode === 'handover' ? `Tôi đã kiểm tra và giao đủ ${detail.items.length} món cho khách.` : mode === 'approve' ? 'Tôi đã kiểm tra hàng và đồng ý giữ các món này để trả khách.' : mode === 'reject' ? 'Tôi xác nhận từ chối yêu cầu và thông báo lý do trên cho khách.' : 'Tôi muốn hủy yêu cầu rút hàng đang chờ duyệt.'}</span></label>
      </form>}
    </div>}
  </Modal>;
}
