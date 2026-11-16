import { useEffect, useState, type FormEvent } from 'react';
import { buyoutsApi, type BuyoutApprovalConfig } from '@/api/buyouts';
import { parseProblemDetails } from '@/api/auth';
import { Button, Input, Modal, SkeletonLoading } from '@/components/shared';

export function BuyoutApprovalConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<BuyoutApprovalConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const value = await buyoutsApi.approvalConfig();
      setConfig(value); setEnabled(value.enabled); setThreshold(value.threshold === null ? '' : String(value.threshold).replace('.', ','));
    } catch (err) { setConfig(null); const problem = parseProblemDetails(err); setError(problem.detail || problem.title || 'Không thể tải cấu hình.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) { setNotice(''); setReason(''); void load(); } }, [open]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || saving) return;
    const numeric = threshold ? Number(threshold.replace(',', '.')) : null;
    if ((enabled && (numeric === null || numeric <= 0)) || (numeric !== null && (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(Math.round(numeric * 100))))) { setError('Ngưỡng phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const value = await buyoutsApi.updateApprovalConfig({ enabled, threshold: numeric, expectedVersion: config.version, reason: reason.trim() || null });
      setConfig(value); setEnabled(value.enabled); setThreshold(value.threshold === null ? '' : String(value.threshold).replace('.', ',')); setReason(''); setNotice('Đã lưu cấu hình tự duyệt.');
    } catch (err) {
      const problem = parseProblemDetails(err);
      if (problem.status === 409) { setConfig(null); setError('Cấu hình đã thay đổi hoặc không hợp lệ. Hãy tải lại trước khi lưu; nếu lỗi tiếp diễn, liên hệ quản trị viên.'); }
      else setError(problem.status === 0 ? 'Chưa xác định được kết quả lưu. Hãy tải lại cấu hình trước khi thử lại.' : problem.detail || problem.title || 'Không thể lưu cấu hình.');
      if (problem.status === 0) setConfig(null);
    } finally { setSaving(false); }
  };
  const display = (value: string) => { const [whole, fraction] = value.split(','); return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`); };
  return <Modal open={open} onClose={onClose} disabled={saving} title="Cấu hình tự duyệt" description="Thiết lập ngưỡng giá mua cho các phiếu mới." className="!max-w-xl">
    {loading ? <SkeletonLoading variant="list" count={3} label="Đang tải cấu hình..." /> : <form className="space-y-4" onSubmit={event => void save(event)}>
      {error && <div role="alert" className="rounded-xl border border-state-danger-border bg-state-danger-soft p-3 text-sm text-state-danger">{error} {!config && <Button type="button" variant="outline" size="sm" onClick={() => void load()}>Tải lại</Button>}</div>}
      {notice && <p role="status" className="rounded-xl bg-state-success-soft p-3 text-sm text-state-success-strong">{notice}</p>}
      {config && <><label className="flex items-start gap-3 rounded-xl bg-brand-pink-surface p-4 text-sm text-ink"><input type="checkbox" className="mt-1 accent-brand-highlight" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={saving} /><span><strong>Bật tự duyệt</strong><span className="mt-1 block text-muted">Phiếu có giá mua không vượt ngưỡng và giá bán dự kiến không thấp hơn giá mua sẽ được tự duyệt.</span></span></label>
      <Input label="Ngưỡng giá mua (₫)" type="text" inputMode="decimal" value={display(threshold)} onChange={event => { const [whole, ...fraction] = event.target.value.replace(/\./g, '').replace(/[^\d,]/g, '').split(','); setThreshold(fraction.length ? `${whole},${fraction.join('').slice(0, 2)}` : whole); }} placeholder="Nhập ngưỡng giá mua" disabled={saving} />
      <Input label="Lý do thay đổi (không bắt buộc)" value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} disabled={saving} />
      <p className="text-xs text-muted">Thay đổi chỉ áp dụng cho phiếu mới. Phiếu tự duyệt vẫn cần nhân viên xác nhận đã chi tiền.</p>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Đóng</Button><Button type="submit" loading={saving}>Lưu cấu hình</Button></div></>}
    </form>}
  </Modal>;
}
