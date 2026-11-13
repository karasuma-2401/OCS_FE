import { useEffect, useRef, useState } from 'react';
import { parseProblemDetails } from '@/api/auth';
import { contractTermsApi, type ContractTermsRequest } from '@/api/contractTerms';
import { Button } from '@/components/shared';

export function ContractTermsSection({ draftKey, customerPhone, onChange }: { draftKey: string; customerPhone: string; onChange: (request: ContractTermsRequest | null, ready: boolean) => void }) {
  const [item, setItem] = useState<ContractTermsRequest | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const callback = useRef(onChange); callback.current = onChange;
  const update = (value: ContractTermsRequest | null) => { setItem(value); callback.current(value, true); };
  useEffect(() => {
    let active = true;
    callback.current(null, false);
    void contractTermsApi.mine(draftKey).then(value => { if (active) { setItem(value); callback.current(value, true); } })
      .catch(() => { if (active) { setError('Không thể kiểm tra yêu cầu điều khoản. Hãy tải lại trang.'); callback.current(null, false); } });
    return () => { active = false; };
  }, [draftKey]);
  const refresh = async () => {
    setBusy(true); setError('');
    try { update(await contractTermsApi.mine(draftKey)); }
    catch { setError('Không thể kiểm tra yêu cầu điều khoản.'); callback.current(null, false); }
    finally { setBusy(false); }
  };
  const request = async () => {
    if (!reason.trim()) { setError('Nhập nội dung khách đề nghị điều chỉnh.'); return; }
    if (!/^0\d{9}$/.test(customerPhone.trim())) { setError('Chọn khách hàng có số điện thoại hợp lệ trước khi gửi yêu cầu.'); return; }
    setBusy(true); setError('');
    try { update(await contractTermsApi.request(draftKey, reason.trim(), customerPhone.trim())); setReason(''); }
    catch (failure) { const problem = parseProblemDetails(failure); setError(problem.detail || problem.title || 'Không thể gửi yêu cầu.'); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!item) return;
    setBusy(true); setError('');
    try { update(await contractTermsApi.cancel(item.id, item.version)); }
    catch (failure) { const problem = parseProblemDetails(failure); setError(problem.detail || problem.title || 'Không thể hủy yêu cầu.'); }
    finally { setBusy(false); }
  };
  const active = item?.status === 'Pending' || item?.status === 'Approved';
  return <section className="space-y-3">
    <div><h2 className="text-lg font-bold">Điều khoản hợp đồng</h2><p className="mt-1 text-sm text-muted">Điều khoản nằm trong mẫu Word của quản lý. Xem trước cùng khách trước khi xác nhận.</p></div>
    {item?.status === 'Pending' && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Yêu cầu đang chờ quản lý xử lý. Tạm thời chưa thể tạo hoặc xem trước hợp đồng.</p>}
    {item?.status === 'Approved' && <p role="status" className="rounded-xl bg-state-success-soft p-3 text-sm text-state-success">Quản lý đã duyệt mẫu riêng. Hãy xem nội dung mới cùng khách và ký lại trước khi tạo.{item.decisionNote && ` Ghi chú: ${item.decisionNote}`}</p>}
    {item?.status === 'Rejected' && <p role="status" className="rounded-xl bg-state-danger-soft p-3 text-sm text-state-danger">Yêu cầu bị từ chối. {item.decisionNote}</p>}
    {active && <p className="whitespace-pre-wrap text-sm text-muted">Nội dung đã gửi: {item.reason}. Nếu đổi khách, hãy hủy yêu cầu và gửi lại.</p>}
    {!active && <><label className="block text-sm font-semibold text-ink">Khách muốn thay đổi điều khoản?<textarea className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink" rows={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ghi nội dung khách đề nghị để quản lý xem xét" /></label><Button variant="outline" size="sm" disabled={busy} onClick={() => void request()}>Gửi quản lý xem xét</Button></>}
    <div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" loading={busy} onClick={() => void refresh()}>Kiểm tra kết quả</Button>{active && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void cancel()}>Hủy yêu cầu</Button>}</div>
    {error && <p role="alert" className="text-sm text-state-danger">{error}</p>}
  </section>;
}
