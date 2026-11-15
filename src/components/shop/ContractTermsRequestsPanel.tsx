import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { parseProblemDetails } from '@/api/auth';
import { contractTermsApi, type ContractTermsRequest } from '@/api/contractTerms';
import { Button, Card, SkeletonLoading } from '@/components/shared';

export function ContractTermsRequestsPanel() {
  const [items, setItems] = useState<ContractTermsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await contractTermsApi.pending()); } catch { setError('Không thể tải yêu cầu điều khoản.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const decide = async (item: ContractTermsRequest, approve: boolean) => {
    const note = (notes[item.id] || '').trim(); const text = (terms[item.id] || '').trim();
    if (approve && !text) { setError('Nhập điều khoản được duyệt.'); return; }
    if (!approve && !note) { setError('Nhập lý do từ chối.'); return; }
    setBusy(item.id); setError(''); setNotice('');
    try {
      if (approve) await contractTermsApi.approveWeb(item.id, item.version, text, note);
      else await contractTermsApi.reject(item.id, item.version, note);
      setNotice(approve ? 'Đã duyệt điều khoản riêng cho yêu cầu này.' : 'Đã từ chối yêu cầu.');
      await load();
    } catch (failure) {
      const data = axios.isAxiosError(failure) ? failure.response?.data as { errors?: string[] } | undefined : undefined;
      const problem = parseProblemDetails(failure);
      setError(data?.errors?.join(' ') || problem.detail || problem.title || 'Không thể xử lý yêu cầu.');
    } finally { setBusy(''); }
  };
  return <Card title="Yêu cầu điều chỉnh điều khoản" description="Xem xét từng yêu cầu trước khi nhân viên tạo hợp đồng." className="mt-5">
    <div className="mb-4 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void load()}>Tải lại yêu cầu</Button></div>
    {error && <p role="alert" className="mb-3 text-sm text-state-danger">{error}</p>}{notice && <p role="status" className="mb-3 text-sm text-state-success">{notice}</p>}
    {loading ? <SkeletonLoading variant="list" count={2} /> : items.length === 0 ? <p className="text-sm text-muted">Không có yêu cầu đang chờ.</p> : <div className="space-y-4">{items.map(item => <section key={item.id} className="space-y-3 rounded-xl border border-border p-4">
      <div><p className="text-sm font-bold text-ink">{item.requestedByName || 'Nhân viên'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</p><p className="mt-2 whitespace-pre-wrap text-sm text-ink">{item.reason}</p></div>
      <label className="block text-sm font-semibold text-ink">Điều khoản riêng<textarea className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink" rows={6} value={terms[item.id] || ''} onChange={event => setTerms(current => ({ ...current, [item.id]: event.target.value }))} /></label>
      <label className="block text-sm font-semibold text-ink">Ghi chú duyệt hoặc lý do từ chối<textarea className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink" rows={2} maxLength={2000} value={notes[item.id] || ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} /></label>
      <div className="flex flex-wrap gap-2"><Button size="sm" loading={busy === item.id} disabled={Boolean(busy)} onClick={() => void decide(item, true)}>Duyệt điều khoản</Button><Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void decide(item, false)}>Từ chối</Button></div>
    </section>)}</div>}
  </Card>;
}
