import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Banknote, Check, FileCheck2, RefreshCw, Search, Send } from 'lucide-react';
import { settlementsApi, type Payout, type SettlementContract, type SettlementPreview } from '@/api/settlements';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, Card, EmptyState, Input, PageHeaderCard, SkeletonLoading, type BadgeVariant } from '@/components/shared';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' ₫';
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const stateLabel: Record<Payout['status'], string> = {
  Pending: 'Chờ quản lý duyệt', Approved: 'Đã duyệt · chờ chuyển khoản',
  Transferred: 'Đã chuyển · chờ khách xác nhận', Completed: 'Đã hoàn tất',
};
const stateVariant: Record<Payout['status'], BadgeVariant> = {
  Pending: 'warning', Approved: 'info', Transferred: 'payment', Completed: 'success',
};
const fileClass = 'mt-1.5 block w-full rounded-xl border border-border bg-paper px-3 py-2 text-xs text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-pink-surface file:px-3 file:py-1.5 file:font-semibold file:text-brand-ink';
const errorText = (error: unknown) => {
  const problem = parseProblemDetails(error);
  return problem.detail || problem.title || 'Không thể tải hoặc lưu quyết toán.';
};

function PayoutProof({ payoutId, uploadedUrl }: { payoutId?: string; uploadedUrl?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    const load = payoutId ? settlementsApi.readProof(payoutId) : uploadedUrl ? settlementsApi.readUploadedProof(uploadedUrl) : Promise.reject(new Error('Missing proof'));
    void load.then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setSrc(objectUrl); }).catch(() => setSrc(''));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [payoutId, uploadedUrl]);
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Chứng từ chuyển khoản" className="max-h-64 rounded-xl border border-border object-contain" /></a>
    : <span className="text-xs text-muted">Đang tải chứng từ…</span>;
}

export function SettlementManagement() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('settlements.manage');
  const [contracts, setContracts] = useState<SettlementContract[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [selected, setSelected] = useState<Payout | null>(null);
  const [view, setView] = useState<'contracts' | 'payouts'>('contracts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [proof, setProof] = useState('');
  const [reference, setReference] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [contractRows, payoutRows] = await Promise.all([settlementsApi.contracts(), settlementsApi.payouts()]); setContracts(contractRows); setPayouts(payoutRows); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const openPreview = async (contract: SettlementContract) => {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview(await settlementsApi.preview(contract.contractId)); setSelected(null); setView('contracts'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const openPayout = (payout: Payout) => { setSelected(payout); setPreview(null); setProof(''); setReference(payout.bankTransactionReference ?? ''); };
  const createPayout = async () => {
    if (!preview || busy) return;
    setBusy(true); setError('');
    try { const payout = await settlementsApi.create(preview.contractId); await load(); openPayout(payout); setView('payouts'); setNotice('Đã tạo lệnh ' + payout.payoutNumber + '. Cần duyệt trước khi ghi nhận chuyển khoản.'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { const updated = await settlementsApi.approve(selected.id); setSelected(updated); setNotice('Đã duyệt lệnh chi. Tiếp theo tải chứng từ và ghi nhận chuyển khoản.'); await load(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const uploadProof = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { const response = await settlementsApi.uploadProof(file); setProof(response.url); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const transfer = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError('');
    try { const updated = await settlementsApi.transfer(selected.id, proof, reference); setSelected(updated); setNotice('Đã lưu giao dịch chuyển khoản và chứng từ. Khách hàng có thể xác nhận trong ứng dụng.'); await load(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5" aria-labelledby="settlements-heading">
    <PageHeaderCard
      icon={<Banknote size={24} />}
      title="Quyết toán & giải ngân"
      titleId="settlements-heading"
      description="Theo dõi từng đợt chi trả, tách tiền bán, hoa hồng và bồi thường của hợp đồng ký gửi."
      actions={<Button variant="outline" onClick={() => void load()} startIcon={<RefreshCw size={16} />}>Làm mới</Button>}
    />
    {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
    {error && <AlertBanner variant="error" message={error} />}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.8fr)]">
      <Card title="Danh sách quyết toán" description="Chọn hợp đồng để xem bảng kê hoặc chọn lệnh chi để theo dõi.">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Chức năng quyết toán">
          <button type="button" role="tab" aria-selected={view === 'contracts'} onClick={() => { setView('contracts'); setSelected(null); }} className={'border-b-2 px-4 py-3 text-sm font-semibold ' + (view === 'contracts' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight')}>Hợp đồng</button>
          <button type="button" role="tab" aria-selected={view === 'payouts'} onClick={() => { setView('payouts'); setPreview(null); }} className={'border-b-2 px-4 py-3 text-sm font-semibold ' + (view === 'payouts' ? 'border-brand-pink text-brand-ink' : 'border-transparent text-muted hover:text-brand-highlight')}>Lệnh chi ({payouts.length})</button>
        </div>
        {loading ? <SkeletonLoading variant="list" count={3} label="Đang tải quyết toán..." /> : view === 'contracts'
          ? contracts.length === 0 ? <EmptyState title="Chưa có hợp đồng ký gửi" /> : <div className="divide-y divide-border">{contracts.map(contract =>
            <button key={contract.contractId} type="button" onClick={() => void openPreview(contract)} className={'flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-brand-pink-surface ' + (preview?.contractId === contract.contractId ? 'bg-brand-pink-surface' : '')}>
              <span><strong className="block text-sm text-ink">{contract.contractNumber} · {contract.customerName || 'Khách ký gửi'}</strong><span className="text-xs text-muted">{contract.soldProductCount}/{contract.productCount} sản phẩm đã bán · {contract.contractStatus}</span></span>
              <span className="text-xs font-semibold text-brand-highlight">Xem bảng kê →</span>
            </button>
          )}</div>
          : payouts.length === 0 ? <EmptyState title="Chưa có lệnh chi" /> : <div className="divide-y divide-border">{payouts.map(payout =>
            <button key={payout.id} type="button" onClick={() => openPayout(payout)} className={'flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-brand-pink-surface ' + (selected?.id === payout.id ? 'bg-brand-pink-surface' : '')}>
              <span><strong className="block text-sm text-ink">{payout.payoutNumber} · {payout.contractNumber}</strong><span className="text-xs text-muted">{dateTime(payout.createdAt)}</span></span>
              <span className="flex flex-wrap items-center gap-2"><Badge variant={stateVariant[payout.status]}>{stateLabel[payout.status]}</Badge><strong className="text-sm text-ink">{money(payout.totalAmount)}</strong></span>
            </button>
          )}</div>}
      </Card>
      <Card title={preview ? 'Bảng kê quyết toán' : selected ? 'Chi tiết lệnh chi' : 'Chi tiết quyết toán'}>
        {preview && <div className="space-y-4">
          <div><h3 className="text-lg font-bold text-brand-ink">{preview.contractNumber}</h3><p className="text-sm text-muted">{preview.customerName || 'Khách ký gửi'}</p></div>
          {preview.blockReason && <AlertBanner variant="warning" message={preview.blockReason} />}
          <SettlementLines lines={preview.lines} />
          <div className="flex justify-between border-t border-border pt-3 font-bold text-ink"><span>Tổng chi dự kiến</span><span>{money(preview.totalAmount)}</span></div>
          {canManage && <Button className="w-full" disabled={busy || !!preview.blockReason || preview.lines.length === 0} onClick={() => void createPayout()}>Tạo lệnh chi trả</Button>}
        </div>}
        {selected && <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-bold text-brand-ink">{selected.payoutNumber}</h3><p className="text-sm text-muted">{selected.contractNumber} · {selected.customerName || 'Khách ký gửi'}</p></div><Badge variant={stateVariant[selected.status]}>{stateLabel[selected.status]}</Badge></div>
          <div className="space-y-1 rounded-xl border border-border bg-surface-subtle p-4 text-sm text-ink"><p><strong>Ngân hàng:</strong> {selected.bankCode || '—'}</p><p><strong>Số tài khoản:</strong> {selected.bankAccountNumber || '—'}</p><p><strong>Chủ tài khoản:</strong> {selected.bankAccountHolder || '—'}</p></div>
          <SettlementLines lines={selected.lines} />
          <div className="flex justify-between border-t border-border pt-3 font-bold text-ink"><span>Tổng chi</span><span>{money(selected.totalAmount)}</span></div>
          {selected.bankTransactionReference && <p className="text-sm text-ink"><strong>Mã giao dịch:</strong> {selected.bankTransactionReference}</p>}
          {selected.proofUrl && <PayoutProof payoutId={selected.id} />}
          {canManage && selected.status === 'Pending' && <Button className="w-full" disabled={busy} onClick={() => void approve()} startIcon={<Check size={16} />}>Duyệt lệnh chi</Button>}
          {canManage && selected.status === 'Approved' && <form onSubmit={transfer} className="space-y-3 border-t border-border pt-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-ink">Ảnh ủy nhiệm chi / biên lai<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProof} className={fileClass} /></label>
            {proof && <PayoutProof uploadedUrl={proof} />}
            {proof && <AlertBanner variant="success" compact message="Đã tải chứng từ" />}
            <Input label="Mã giao dịch ngân hàng" value={reference} onChange={event => setReference(event.target.value)} maxLength={100} required />
            <Button type="submit" className="w-full" disabled={busy || !proof} startIcon={<Send size={16} />}>Ghi nhận đã chuyển</Button>
          </form>}
          {selected.status === 'Transferred' && <AlertBanner variant="info" icon={<FileCheck2 size={17} />} message={'Đang chờ khách hàng xác nhận hoặc tự hoàn tất sau 48 giờ. Chuyển lúc ' + dateTime(selected.transferredAt) + '.'} />}
          {selected.status === 'Completed' && <AlertBanner variant="success" message={'Đã hoàn tất ' + (selected.customerConfirmedAt ? 'sau khi khách xác nhận lúc ' + dateTime(selected.customerConfirmedAt) : 'tự động lúc ' + dateTime(selected.completedAt)) + '.'} />}
        </div>}
        {!preview && !selected && <EmptyState loading={busy} title="Chọn hợp đồng hoặc lệnh chi" description="Bảng kê và kết quả giải ngân sẽ hiện ở đây." icon={<Search size={22} />} className="min-h-72" />}
      </Card>
    </div>
  </section>;
}

function SettlementLines({ lines }: { lines: SettlementPreview['lines'] }) {
  const title: Record<string, string> = { SaleProceeds: 'Tiền bán', Commission: 'Hoa hồng', Compensation: 'Bồi thường', ServiceFee: 'Phí dịch vụ' };
  return <div className="divide-y divide-border rounded-xl border border-border bg-paper">
    {lines.length === 0 ? <p className="p-4 text-center text-sm text-muted">Chưa có khoản tiền đủ điều kiện quyết toán.</p> : lines.map((line, index) =>
      <div key={line.type + (line.productId ?? line.incidentReportId ?? index)} className="flex items-start justify-between gap-3 p-3 text-sm">
        <span><span className="block text-xs font-semibold text-muted">{title[line.type] ?? line.type}</span><span className="text-ink">{line.description}</span></span>
        <strong className={'whitespace-nowrap ' + (line.amount < 0 ? 'text-state-danger' : 'text-brand-ink')}>{money(line.amount)}</strong>
      </div>
    )}
  </div>;
}
