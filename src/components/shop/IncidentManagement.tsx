import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AlertTriangle, Check, ClipboardList, RefreshCw, Search, Send, ShieldCheck, X } from 'lucide-react';
import { incidentsApi, type IncidentProduct, type IncidentReport, type IncidentStatus, type IncidentType } from '@/api/incidents';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { AlertBanner, Badge, Button, Card, Combobox, EmptyState, Input, PageHeaderCard, SkeletonLoading, type BadgeVariant } from '@/components/shared';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' ₫';
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const statusText: Record<IncidentStatus, string> = {
  Pending: 'Chờ quản lý duyệt',
  NeedsRecheck: 'Chờ nhân viên bổ sung',
  Approved: 'Đã duyệt · chờ quyết toán',
  Compensated: 'Đã bồi thường',
};
const statusVariant: Record<IncidentStatus, BadgeVariant> = {
  Pending: 'warning', NeedsRecheck: 'warning', Approved: 'info', Compensated: 'success',
};
const typeText: Record<IncidentType, string> = { Damaged: 'Hư hỏng', Lost: 'Thất lạc', TagSwapped: 'Nhầm tem' };
const productStatusText: Record<string, string> = {
  PendingProcessing: 'Chờ xử lý',
  OnSale: 'Đang bán',
  Sold: 'Đã bán',
  IncidentPending: 'Đang xác minh sự cố',
  Expired: 'Hết hạn',
  Donated: 'Đã quyên góp',
  Returned: 'Đã trả lại',
  EarlyWithdrawn: 'Đã rút trước hạn',
  Compensated: 'Đã bồi thường',
  Cancelled: 'Đã hủy',
};
const textareaClass = 'mt-1.5 w-full rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-pink-focus focus:ring-2 focus:ring-brand-pink/25';
const fileClass = 'mt-1.5 block w-full rounded-xl border border-border bg-paper px-3 py-2 text-xs text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-pink-surface file:px-3 file:py-1.5 file:font-semibold file:text-brand-ink';
const errorText = (error: unknown) => {
  const problem = parseProblemDetails(error);
  const fieldError = Object.values(problem.errors ?? {}).flat().find(message => typeof message === 'string' && message.trim());
  return problem.detail || fieldError || problem.title || 'Không thể thực hiện thao tác. Vui lòng thử lại.';
};

function EvidenceImage({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let current = '';
    let active = true;
    void incidentsApi.readEvidence(url).then(blob => {
      current = URL.createObjectURL(blob);
      if (active) setSrc(current);
    }).catch(() => setSrc(''));
    return () => { active = false; if (current) URL.revokeObjectURL(current); };
  }, [url]);
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Ảnh chứng cứ sự cố" className="h-24 w-24 rounded-xl border border-border object-cover" /></a>
    : <span className="grid h-24 w-24 place-items-center rounded-xl bg-surface-subtle text-xs text-muted">Đang tải ảnh…</span>;
}

function EvidenceStrip({ urls, onRemove }: { urls: string[]; onRemove?: (index: number) => void }) {
  return <div className="flex flex-wrap gap-3">{urls.map((url, index) =>
    <div className="relative" key={url + index}>
      <EvidenceImage url={url} />
      {onRemove && <button type="button" onClick={() => onRemove(index)} className="absolute -right-2 -top-2 rounded-full border border-border bg-paper p-1 text-state-danger shadow-sm" aria-label="Bỏ ảnh"><X size={14} /></button>}
    </div>
  )}</div>;
}

export function IncidentManagement() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('incidents.create');
  const canReview = hasPermission('incidents.review');
  const [items, setItems] = useState<IncidentReport[]>([]);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<IncidentProduct | null>(null);
  const [type, setType] = useState<IncidentType>('Damaged');
  const [description, setDescription] = useState('');
  const [newEvidence, setNewEvidence] = useState<string[]>([]);
  const [compensation, setCompensation] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [recheckReason, setRecheckReason] = useState('');
  const [resubmissionDescription, setResubmissionDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems((await incidentsApi.list({ page: 1, pageSize: 100, q: query || undefined, status: status === 'all' ? undefined : status })).items); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [query, status]);
  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setBusy(true); setError(''); setSelected(null);
    try { const detail = await incidentsApi.detail(id); setSelected(detail); setCompensation(String(detail.agreedPrice)); setResubmissionDescription(detail.description); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const refreshSelected = async (id: string, message: string) => {
    const latest = await incidentsApi.detail(id);
    setSelected(latest); setNotice(message); await load();
  };
  const lookup = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setProduct(null);
    try { setProduct(await incidentsApi.findProduct(barcode)); setNewEvidence([]); setDescription(''); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const uploadEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const uploaded = await Promise.all(files.map(file => incidentsApi.upload(file)));
      setNewEvidence(current => [...current, ...uploaded.map(item => item.url)].slice(0, 10));
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); if (!product || product.status !== 'OnSale' || busy) return;
    setBusy(true); setError('');
    try {
      const created = await incidentsApi.create({ productId: product.id, type, description, evidenceUrls: newEvidence });
      setProduct(null); setBarcode(''); setNotice('Đã gửi biên bản. Sản phẩm được tạm giữ cho tới khi quản lý xử lý.');
      await load(); await openDetail(created.id);
    } catch (cause) {
      setError(errorText(cause));
      if (parseProblemDetails(cause).status === 409) {
        try { setProduct(await incidentsApi.findProduct(product.barcode)); }
        catch { setProduct(null); }
      }
    }
    finally { setBusy(false); }
  };
  const resubmit = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError('');
    try { await incidentsApi.resubmit(selected.id, { description: resubmissionDescription, evidenceUrls: newEvidence }); setNewEvidence([]); await refreshSelected(selected.id, 'Đã gửi thông tin bổ sung cho quản lý.'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const approve = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError('');
    try { await incidentsApi.approve(selected.id, Number(compensation), reviewNote); setReviewNote(''); await refreshSelected(selected.id, 'Đã duyệt biên bản. Khoản bồi thường sẽ xuất hiện trong quyết toán.'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const requestRecheck = async (event: FormEvent) => {
    event.preventDefault(); if (!selected || busy) return;
    setBusy(true); setError('');
    try { await incidentsApi.requestRecheck(selected.id, recheckReason); setRecheckReason(''); await refreshSelected(selected.id, 'Đã yêu cầu nhân viên kiểm tra và bổ sung. Sản phẩm vẫn được tạm giữ.'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  return <section className="space-y-5" aria-labelledby="incidents-heading">
    <PageHeaderCard
      icon={<AlertTriangle size={24} />}
      title="Sự cố & bồi thường"
      titleId="incidents-heading"
      description="Lập và tra cứu biên bản sự cố hàng ký gửi; quản lý duyệt mức bồi thường và theo dõi lịch sử."
      actions={<Button variant="outline" onClick={() => void load()} startIcon={<RefreshCw size={16} />}>Làm mới</Button>}
    />
    {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
    {error && <AlertBanner variant="error" message={error} />}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)]">
      <div className="space-y-5">
        {canCreate && <Card title="Lập biên bản sự cố" description="Tra cứu sản phẩm ký gửi đang bán trước khi ghi nhận sự cố.">
          <form onSubmit={lookup} className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1"><Input label="Barcode sản phẩm" value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Quét hoặc nhập barcode" /></div>
            <Button type="submit" disabled={busy || !barcode.trim()} startIcon={<Search size={16} />}>Tra cứu</Button>
          </form>
          {product && <form onSubmit={create} className="mt-4 space-y-4 rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-bold text-brand-ink">{product.name}</p><p className="text-xs text-muted">{product.barcode} · Hợp đồng {product.contractNumber ?? '—'} · {product.customerName ?? 'Khách ký gửi'}</p><p className="mt-1 text-sm text-ink">Giá thỏa thuận: <strong>{money(product.listedPrice)}</strong></p></div>
              <Badge variant={product.status === 'OnSale' ? 'success' : 'warning'}>{productStatusText[product.status] ?? product.status}</Badge>
            </div>
            {product.status !== 'OnSale' ? <AlertBanner variant="warning" message={'Chỉ có thể lập biên bản cho sản phẩm ký gửi đang bán. Sản phẩm này hiện ở trạng thái “' + (productStatusText[product.status] ?? product.status) + '”.'} /> : <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Combobox
                label="Loại sự cố"
                value={type}
                onChange={value => setType(value as IncidentType)}
                options={[
                  { value: 'Damaged', label: 'Hư hỏng' },
                  { value: 'Lost', label: 'Thất lạc' },
                  { value: 'TagSwapped', label: 'Nhầm tem' },
                ]}
              />
              <label className="text-xs font-bold uppercase tracking-wide text-ink">Ảnh chứng cứ<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadEvidence} className={fileClass} /></label>
            </div>
            <label className="block text-xs font-bold uppercase tracking-wide text-ink">Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={3} className={textareaClass} placeholder="Mô tả tình trạng và thời điểm phát hiện" /></label>
            {newEvidence.length > 0 && <EvidenceStrip urls={newEvidence} onRemove={index => setNewEvidence(current => current.filter((_, i) => i !== index))} />}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setProduct(null)}>Hủy</Button><Button type="submit" disabled={busy || !description.trim() || !newEvidence.length} startIcon={<Send size={15} />}>Gửi biên bản</Button></div>
            </>}
          </form>}
        </Card>}
        <Card title="Danh sách biên bản" description="Chọn một biên bản để xem chứng cứ và xử lý.">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_190px]">
            <Input aria-label="Tìm biên bản sự cố" value={query} onChange={event => setQuery(event.target.value)} startAdornment={<Search size={17} />} placeholder="Barcode, sản phẩm, hợp đồng, khách hàng" />
            <Combobox
              ariaLabel="Trạng thái biên bản"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'Pending', label: 'Chờ duyệt' },
                { value: 'NeedsRecheck', label: 'Chờ bổ sung' },
                { value: 'Approved', label: 'Đã duyệt' },
                { value: 'Compensated', label: 'Đã bồi thường' },
              ]}
            />
          </div>
          {loading ? <SkeletonLoading variant="list" count={3} label="Đang tải biên bản..." /> : items.length === 0 ? <EmptyState title="Chưa có biên bản phù hợp" description="Thử thay đổi bộ lọc hoặc lập biên bản mới." /> : <div className="divide-y divide-border">
            {items.map(item => <button key={item.id} type="button" onClick={() => void openDetail(item.id)} className={'flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-brand-pink-surface ' + (selected?.id === item.id ? 'bg-brand-pink-surface' : '')}>
              <span><strong className="block text-sm text-ink">{item.productName}</strong><span className="text-xs text-muted">{item.productBarcode} · {typeText[item.type]} · {dateTime(item.createdAt)}</span></span>
              <Badge variant={statusVariant[item.status]}>{statusText[item.status]}</Badge>
            </button>)}
          </div>}
        </Card>
      </div>
      <Card title="Chi tiết biên bản" className="min-h-[420px]">
        {!selected ? <EmptyState loading={busy} title="Chọn một biên bản" description="Chứng cứ, trạng thái và lịch sử xử lý sẽ hiện ở đây." icon={<ClipboardList size={22} />} className="min-h-[330px]" /> : <IncidentDetail report={selected} busy={busy} canCreate={canCreate} canReview={canReview} compensation={compensation} reviewNote={reviewNote} recheckReason={recheckReason} resubmissionDescription={resubmissionDescription} onResubmissionDescription={setResubmissionDescription} onCompensation={setCompensation} onReviewNote={setReviewNote} onRecheckReason={setRecheckReason} onApprove={approve} onRequestRecheck={requestRecheck} onResubmit={resubmit} onUpload={uploadEvidence} evidence={newEvidence} onRemoveEvidence={index => setNewEvidence(current => current.filter((_, i) => i !== index))} />}
      </Card>
    </div>
  </section>;
}

function IncidentDetail(props: {
  report: IncidentReport; busy: boolean; canCreate: boolean; canReview: boolean; compensation: string; reviewNote: string; recheckReason: string; resubmissionDescription: string;
  evidence: string[]; onCompensation: (value: string) => void; onReviewNote: (value: string) => void;
  onResubmissionDescription: (value: string) => void; onRecheckReason: (value: string) => void;
  onApprove: (event: FormEvent) => void; onRequestRecheck: (event: FormEvent) => void; onResubmit: (event: FormEvent) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemoveEvidence: (index: number) => void;
}) {
  const { report, busy } = props;
  const recheck = report.status === 'NeedsRecheck' && props.canCreate;
  const pending = report.status === 'Pending' && props.canReview;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="text-lg font-bold text-brand-ink">{report.productName}</h3><p className="text-xs text-muted">{report.productBarcode} · Hợp đồng {report.contractNumber ?? '—'} · {typeText[report.type]}</p></div>
      <Badge variant={statusVariant[report.status]}>{statusText[report.status]}</Badge>
    </div>
    <div className="space-y-1 rounded-xl border border-border bg-surface-subtle p-4 text-sm text-ink">
      <p><strong>Biên bản:</strong> {report.description}</p>
      <p><strong>Giá thỏa thuận:</strong> {money(report.agreedPrice)}</p>
      {report.compensationAmount > 0 && <p><strong>Mức bồi thường:</strong> {money(report.compensationAmount)}</p>}
      {report.approvedByEmployeeId && <p><strong>Người duyệt:</strong> {report.approvedByName || report.approvedByEmployeeId}</p>}
      {report.reviewNote && <p><strong>Ghi chú:</strong> {report.reviewNote}</p>}
    </div>
    <div><h4 className="mb-2 text-sm font-bold text-ink">Ảnh chứng cứ</h4><EvidenceStrip urls={report.evidenceUrls} /></div>
    {recheck && <form onSubmit={props.onResubmit} className="space-y-3 rounded-xl border border-brand-lavender/40 bg-brand-pink-surface p-4">
      <h4 className="font-bold text-brand-ink">Bổ sung theo yêu cầu quản lý</h4>
      <label className="block text-xs font-bold uppercase tracking-wide text-ink">Mô tả cập nhật<textarea value={props.resubmissionDescription} onChange={event => props.onResubmissionDescription(event.target.value)} maxLength={2000} rows={2} className={textareaClass} /></label>
      <label className="block text-xs font-bold uppercase tracking-wide text-ink">Thêm ảnh chứng cứ<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={props.onUpload} className={fileClass} /></label>
      {props.evidence.length > 0 && <EvidenceStrip urls={props.evidence} onRemove={props.onRemoveEvidence} />}
      <Button type="submit" disabled={busy || !props.resubmissionDescription.trim()} startIcon={<Send size={15} />}>Gửi bổ sung</Button>
    </form>}
    {pending && <div className="space-y-4 border-t border-border pt-4">
      <form onSubmit={props.onApprove} className="space-y-3">
        <h4 className="flex items-center gap-2 font-bold text-brand-ink"><ShieldCheck size={17} /> Duyệt bồi thường</h4>
        <Input label={'Số tiền (tối đa ' + money(report.agreedPrice) + ')'} type="number" min="1" max={report.agreedPrice} step="1" value={props.compensation || report.agreedPrice} onChange={event => props.onCompensation(event.target.value)} />
        <Input label="Lý do nếu bồi thường thấp hơn giá thỏa thuận" value={props.reviewNote} onChange={event => props.onReviewNote(event.target.value)} maxLength={1000} />
        <Button type="submit" disabled={busy} startIcon={<Check size={15} />}>Duyệt mức bồi thường</Button>
      </form>
      <form onSubmit={props.onRequestRecheck} className="space-y-3 border-t border-border pt-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-ink">Yêu cầu kiểm tra lại<textarea value={props.recheckReason} onChange={event => props.onRecheckReason(event.target.value)} maxLength={1000} rows={2} className={textareaClass} placeholder="Nêu thông tin hoặc ảnh cần nhân viên bổ sung" /></label>
        <Button type="submit" variant="outline" disabled={busy || !props.recheckReason.trim()} startIcon={<RefreshCw size={15} />}>Yêu cầu kiểm tra lại</Button>
      </form>
    </div>}
    {report.history && <div className="border-t border-border pt-4">
      <h4 className="mb-2 text-sm font-bold text-ink">Lịch sử thao tác</h4>
      <ol className="space-y-2">{report.history.map(event => <li key={event.id} className="rounded-xl border border-border bg-surface-subtle p-3 text-xs">
        <p className="font-semibold text-ink">{event.action} · {dateTime(event.occurredAt)}</p>
        <p className="text-muted">{event.reason || event.actorAccountId || event.actorType}</p>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-text-secondary">{event.changes}</pre>
      </li>)}</ol>
    </div>}
  </div>;
}
