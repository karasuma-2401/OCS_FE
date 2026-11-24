import { useId, useRef, useState } from 'react';
import { earlyWithdrawalsApi, type EarlyWithdrawal, type EligibleWithdrawalProduct } from '@/api/earlyWithdrawals';
import { AlertBanner, Button, Input, Modal, Table, type TableColumn } from '@/components/shared';
import { withdrawalError, withdrawalEstimate, withdrawalMoney } from '@/utils/earlyWithdrawals';

export function CreateWithdrawalModal({ items, onClose, onCreated, onStale }: {
  items: EligibleWithdrawalProduct[]; onClose: () => void;
  onCreated: (item: EarlyWithdrawal) => void; onStale: () => void;
}) {
  const formId = useId();
  const guard = useRef(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const columns: TableColumn<EligibleWithdrawalProduct>[] = [
    { key: 'name', header: 'Sản phẩm', render: p => <div><p className="font-semibold whitespace-normal">{p.name}</p><p className="text-xs text-muted">{p.contractNumber} · {p.barcode}</p></div> },
    { key: 'fee', header: 'Phí dự kiến', render: p => <div className="whitespace-nowrap"><p className="font-semibold">{withdrawalMoney(p.penaltyAmount)}</p><p className="text-xs text-muted">{p.penaltyRate}% × {withdrawalMoney(p.listedPrice)}</p></div> },
  ];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (guard.current || stale || !reason.trim() || items.length === 0 || items.length > 100) return;
    guard.current = true; setBusy(true); setError('');
    try { onCreated(await earlyWithdrawalsApi.create(items.map(p => p.productId), reason.trim())); }
    catch (err) {
      setError(withdrawalError(err));
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 409 || status === 404) { setStale(true); onStale(); }
    } finally { guard.current = false; setBusy(false); }
  }
  return <Modal open onClose={onClose} disabled={busy} title="Xác nhận yêu cầu rút hàng" description={`${items.length} món đã chọn · Phí theo tỷ lệ hoa hồng từng món trên hợp đồng`} className="max-w-2xl"
    footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{stale ? 'Đóng và chọn lại' : 'Quay lại'}</Button><Button type="submit" form={formId} loading={busy} disabled={stale || !reason.trim() || items.length === 0 || items.length > 100}>Gửi yêu cầu</Button></>}>
    <form id={formId} onSubmit={submit} className="space-y-4">
      {error && <AlertBanner variant="error" title="Chưa gửi được yêu cầu" message={error} />}
      {stale && <AlertBanner variant="warning" message="Danh sách sản phẩm vừa thay đổi. Đóng cửa sổ và chọn lại món trước khi gửi." />}
      <Table columns={columns} data={items} rowKey="productId" />
      <div className="rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-4"><p className="text-sm text-muted">Tổng phí dự kiến</p><p className="mt-1 text-xl font-bold text-brand-highlight">{withdrawalMoney(withdrawalEstimate(items))}</p></div>
      <Input label="Lý do rút hàng" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} disabled={busy || stale} placeholder="Cho cửa hàng biết lý do bạn muốn lấy lại hàng" helperText={`${reason.length}/1000 ký tự`} />
      <p className="text-sm text-muted">Cửa hàng sẽ kiểm tra và duyệt yêu cầu. Phí chính thức được chốt khi gửi; hàng có thể tiếp tục được bán trong lúc chờ duyệt.</p>
    </form>
  </Modal>;
}
