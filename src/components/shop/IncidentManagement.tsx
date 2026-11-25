import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, ClipboardList, Plus, RefreshCw, Search, Send, ShieldCheck, X } from 'lucide-react';
import { incidentsApi, type IncidentProduct, type IncidentReport, type IncidentStatus, type IncidentType } from '@/api/incidents';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { screenPaths } from '@/auth/permissions';
import { AlertBanner, Badge, Button, Card, Combobox, EmptyState, ErrorState, Input, Modal, PageHeaderCard, Skeleton, SkeletonLoading, Table, TableDetailButton, type BadgeVariant } from '@/components/shared';
import { DecimalMoneyInput, parseDecimalMoney, toDecimalMoneyInput } from '@/components/shop/ContractMoneyInput';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + ' ₫';
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const statusText: Record<IncidentStatus, string> = {
  Pending: 'Chờ quản lý duyệt',
  NeedsRecheck: 'Chờ nhân viên bổ sung',
  Approved: 'Đã duyệt · chờ lập chi',
  Compensated: 'Đã bồi thường',
};
const statusVariant: Record<IncidentStatus, BadgeVariant> = {
  Pending: 'warning', NeedsRecheck: 'warning', Approved: 'info', Compensated: 'success',
};
const resolveIncidentBadge = (item: IncidentReport): { label: string; variant: BadgeVariant } => {
  if (item.status === 'Compensated' || (item.status === 'Approved' && (item.payoutStatus === 'Approved' || item.payoutStatus === 'Transferred' || item.payoutStatus === 'Completed'))) {
    return { label: statusText.Compensated, variant: 'success' };
  }
  if (item.status === 'Approved' && item.payoutStatus === 'Pending') {
    return { label: 'Đã duyệt · chờ duyệt chi', variant: 'info' };
  }
  return { label: statusText[item.status], variant: statusVariant[item.status] };
};
const payoutStateText: Record<NonNullable<IncidentReport['payoutStatus']>, string> = {
  Pending: 'Chờ duyệt chi',
  Approved: 'Đã duyệt chi',
  Transferred: 'Đã chuyển · chờ XN',
  Completed: 'Đã giải ngân',
  Rejected: 'Đã từ chối',
};
const payoutStateVariant: Record<NonNullable<IncidentReport['payoutStatus']>, BadgeVariant> = {
  Pending: 'warning', Approved: 'info', Transferred: 'payment', Completed: 'success', Rejected: 'danger',
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
const textareaClass = 'mt-1.5 w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight';
const fileClass = 'mt-1.5 block w-full rounded-control border border-border bg-white px-3 py-2 text-xs text-text-primary file:mr-3 file:rounded-control file:border-0 file:bg-brand-pink-surface file:px-3 file:py-1.5 file:font-semibold file:text-brand-ink';
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
    ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt="Ảnh chứng cứ sự cố" className="h-24 w-24 rounded-card border border-border object-cover" /></a>
    : <span className="grid h-24 w-24 place-items-center rounded-card bg-surface-subtle text-xs text-muted">Đang tải ảnh…</span>;
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCreatePage = location.pathname === `${screenPaths.incidents}/new`;
  const linkedBarcode = searchParams.get('barcode')?.trim() ?? '';
  const selectedId = isCreatePage ? null : searchParams.get('report');
  const canCreate = hasPermission('incidents.create');
  const canReview = hasPermission('incidents.review');
  const canViewSettlement = hasPermission('settlements.read');
  const [items, setItems] = useState<IncidentReport[]>([]);
  const [selected, setSelected] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [barcode, setBarcode] = useState(linkedBarcode);
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
  useEffect(() => { if (!isCreatePage) void load(); }, [isCreatePage, load]);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let active = true;
    setSelected(null);
    setDetailError('');
    setDetailLoading(true);
    void incidentsApi.detail(selectedId)
      .then(report => {
        if (!active) return;
        setSelected(report);
        setCompensation(toDecimalMoneyInput(report.agreedPrice));
        setResubmissionDescription(report.description);
        setNewEvidence([]);
      })
      .catch(cause => { if (active) setDetailError(errorText(cause)); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailRefresh]);

  useEffect(() => {
    if (!isCreatePage || !canCreate || !linkedBarcode) return;
    let active = true;
    setBarcode(linkedBarcode);
    setBusy(true);
    setError('');
    setProduct(null);
    void incidentsApi.findProduct(linkedBarcode)
      .then(found => {
        if (!active) return;
        setProduct(found);
        setNewEvidence([]);
        setDescription('');
      })
      .catch(cause => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [isCreatePage, canCreate, linkedBarcode]);

  const openDetail = (id: string) => {
    setError('');
    setNotice('');
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('report', id);
      return next;
    });
  };
  const closeDetail = () => {
    setError('');
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.delete('report');
      return next;
    });
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
      setProduct(null); setBarcode(''); setNewEvidence([]);
      setNotice('Đã gửi biên bản. Sản phẩm được tạm giữ cho tới khi quản lý xử lý.');
      navigate(`${screenPaths.incidents}?report=${encodeURIComponent(created.id)}`);
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
    const amount = parseDecimalMoney(compensation);
    if (amount === null || amount <= 0 || amount > selected.agreedPrice) {
      setError(`Số tiền bồi thường phải từ 1 ₫ đến tối đa ${money(selected.agreedPrice)}.`);
      return;
    }
    setBusy(true); setError('');
    try {
      const updated = await incidentsApi.approve(selected.id, amount, reviewNote);
      setReviewNote('');
      await refreshSelected(
        selected.id,
        updated.payoutNumber
          ? `Đã duyệt mức bồi thường và lập lệnh chi ${updated.payoutNumber} (${payoutStateText[updated.payoutStatus ?? 'Pending']}).`
          : 'Đã duyệt biên bản. Khoản bồi thường sẽ xuất hiện trong quyết toán.',
      );
    }
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

  if (isCreatePage && !canCreate) return <Navigate to="/unauthorized" replace />;

  return <section className="space-y-5" aria-labelledby="incidents-heading">
    <PageHeaderCard
      icon={<AlertTriangle size={24} />}
      title={isCreatePage ? 'Lập biên bản sự cố' : 'Danh sách biên bản sự cố'}
      titleId="incidents-heading"
      description={isCreatePage ? 'Tra cứu sản phẩm ký gửi đang bán và ghi nhận sự cố.' : 'Tra cứu biên bản, xem chứng cứ và xử lý bồi thường.'}
      actions={isCreatePage
        ? <Button variant="outline" onClick={() => navigate(screenPaths.incidents)} startIcon={<ClipboardList size={16} />}>Danh sách biên bản</Button>
        : <div className="flex flex-wrap gap-2">
          {canCreate && <Button onClick={() => navigate(`${screenPaths.incidents}/new`)} startIcon={<Plus size={16} />}>Tạo biên bản</Button>}
          <Button variant="outline" onClick={() => void load()} startIcon={<RefreshCw size={16} />}>Làm mới</Button>
        </div>}
    />
    {notice && !selectedId && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} />}
    {error && !selectedId && <AlertBanner variant="error" message={error} />}
    {isCreatePage ? (
      <Card title="Lập biên bản sự cố" description="Tra cứu sản phẩm ký gửi đang bán trước khi ghi nhận sự cố.">
          <form onSubmit={lookup} className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1"><Input label="Barcode sản phẩm" value={barcode} onChange={event => setBarcode(event.target.value)} placeholder="Quét hoặc nhập barcode" /></div>
            <Button type="submit" disabled={busy || !barcode.trim()} startIcon={<Search size={16} />}>Tra cứu</Button>
          </form>
          {product && <form onSubmit={create} className="mt-4 space-y-4 rounded-card border border-brand-lavender/40 bg-brand-pink-surface p-4">
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
      </Card>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={loading}>
          <Card className="!bg-white !p-4">
            {loading ? <><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-6 w-16" /></> : <>
              <p className="text-xs font-semibold text-text-secondary">Tổng biên bản hiển thị</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-brand-ink">{items.length}</p>
            </>}
          </Card>
          <Card className="!bg-white !p-4 cursor-pointer transition hover:border-brand-highlight" onClick={() => setStatus('Pending')}>
            {loading ? <><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-6 w-16" /></> : <>
              <p className="text-xs font-semibold text-text-secondary">Chờ quản lý duyệt</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-state-warning-strong">{items.filter(x => x.status === 'Pending').length}</p>
            </>}
          </Card>
          <Card className="!bg-white !p-4 cursor-pointer transition hover:border-brand-highlight" onClick={() => setStatus('NeedsRecheck')}>
            {loading ? <><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-6 w-16" /></> : <>
              <p className="text-xs font-semibold text-text-secondary">Chờ nhân viên bổ sung</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink">{items.filter(x => x.status === 'NeedsRecheck').length}</p>
            </>}
          </Card>
          <Card
            className="!bg-white !p-4 cursor-pointer transition hover:border-brand-highlight"
            onClick={() => setStatus(items.some(x => x.status === 'Compensated') && !items.some(x => x.status === 'Approved') ? 'Compensated' : 'Approved')}
          >
            {loading ? <><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-6 w-16" /></> : <>
              <p className="text-xs font-semibold text-text-secondary">Đã duyệt / Bồi thường</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-brand-highlight">{money(items.reduce((sum, x) => sum + (x.compensationAmount || 0), 0))}</p>
              <p className="text-xs text-muted">
                {items.filter(x => x.status === 'Compensated').length} đã bồi thường · {items.filter(x => x.status === 'Approved').length} chờ duyệt chi
              </p>
            </>}
          </Card>
        </div>

        <Card title="Danh sách biên bản" description="Chọn một biên bản để xem chứng cứ, duyệt bồi thường và theo dõi lệnh chi.">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_190px]">
            <Input id="incident-search" aria-label="Tìm biên bản sự cố" value={query} onChange={event => setQuery(event.target.value)} startAdornment={<Search size={17} />} placeholder="Barcode, sản phẩm, hợp đồng, khách hàng" />
            <Combobox
              ariaLabel="Trạng thái biên bản"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'Pending', label: 'Chờ duyệt' },
                { value: 'NeedsRecheck', label: 'Chờ bổ sung' },
                { value: 'Approved', label: 'Đã duyệt · chờ chi' },
                { value: 'Compensated', label: 'Đã bồi thường' },
              ]}
            />
          </div>
          {loading ? <SkeletonLoading variant="table" columns={7} count={4} label="Đang tải biên bản..." /> : (
            <Table
              className="!bg-white"
              rowKey="id"
              data={items}
              selectedRowKey={selectedId}
              onRowClick={item => openDetail(item.id)}
              emptyTitle="Chưa có biên bản phù hợp"
              emptyMessage="Thử thay đổi bộ lọc hoặc tạo biên bản mới."
              columns={[
                {
                  key: 'product',
                  header: 'Sản phẩm',
                  render: item => (
                    <div>
                      <p className="font-bold text-brand-ink">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-muted">{item.productBarcode} · {typeText[item.type]}</p>
                    </div>
                  ),
                },
                {
                  key: 'contract',
                  header: 'Hợp đồng & Khách hàng',
                  render: item => (
                    <div>
                      <p className="font-semibold text-ink">{item.contractNumber ?? '—'}</p>
                      <p className="text-xs text-muted">{item.customerName ?? 'Khách ký gửi'}</p>
                    </div>
                  ),
                },
                {
                  key: 'compensation',
                  header: 'Bồi thường / Giá TT',
                  headerClassName: 'text-right',
                  cellClassName: 'text-right whitespace-nowrap',
                  render: item => (
                    <div>
                      <strong className="tabular-nums text-brand-ink">{item.compensationAmount > 0 ? money(item.compensationAmount) : 'Chưa duyệt'}</strong>
                      <p className="text-xs text-muted">TT: {money(item.agreedPrice)}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái sự cố',
                  render: item => {
                    const badge = resolveIncidentBadge(item);
                    return <Badge variant={badge.variant}>{badge.label}</Badge>;
                  },
                },
                {
                  key: 'payout',
                  header: 'Lệnh chi',
                  render: item => item.payoutNumber && item.payoutStatus
                    ? (
                      canViewSettlement && item.payoutId
                        ? (
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              navigate(`${screenPaths.settlement}?payout=${encodeURIComponent(item.payoutId!)}`);
                            }}
                            className="text-left group"
                          >
                            <Badge variant={payoutStateVariant[item.payoutStatus]}>{payoutStateText[item.payoutStatus]}</Badge>
                            <p className="mt-1 text-xs font-semibold text-brand-ink group-hover:underline">{item.payoutNumber}</p>
                          </button>
                        )
                        : (
                          <div>
                            <Badge variant={payoutStateVariant[item.payoutStatus]}>{payoutStateText[item.payoutStatus]}</Badge>
                            <p className="mt-1 text-xs text-muted">{item.payoutNumber}</p>
                          </div>
                        )
                    )
                    : <span className="text-xs text-muted">—</span>,
                },
                {
                  key: 'reviewed',
                  header: 'Duyệt / Thời gian',
                  render: item => (
                    <div className="text-xs">
                      <p className="font-semibold text-ink">{item.approvedByName || '—'}</p>
                      <p className="text-muted">{dateTime(item.approvedAt || item.createdAt)}</p>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Thao tác',
                  render: item => <TableDetailButton onClick={() => openDetail(item.id)} />,
                },
              ]}
            />
          )}
        </Card>
        <Modal
          open={Boolean(selectedId)}
          title="Chi tiết biên bản"
          description={selected?.id === selectedId ? `${selected.productBarcode} · ${statusText[selected.status]}` : 'Chứng cứ và lịch sử xử lý'}
          onClose={closeDetail}
          disabled={busy}
          error={error || undefined}
          className="!w-[calc(100vw-2rem)] !max-w-3xl !rounded-card [&>header]:!rounded-t-card"
          contentClassName="!bg-white"
        >
          {notice && <AlertBanner variant="success" message={notice} onClose={() => setNotice('')} className="mb-4" />}
            {detailLoading || (!detailError && selected?.id !== selectedId) ? <SkeletonLoading variant="list" count={3} label="Đang tải biên bản..." />
              : detailError ? <ErrorState title="Không thể tải biên bản" description={detailError} onRetry={() => setDetailRefresh(current => current + 1)} />
              : selected?.id === selectedId ? <IncidentDetail report={selected} busy={busy} canCreate={canCreate} canReview={canReview} canViewSettlement={canViewSettlement} onOpenPayout={payoutId => navigate(`${screenPaths.settlement}?payout=${encodeURIComponent(payoutId)}`)} compensation={compensation} reviewNote={reviewNote} recheckReason={recheckReason} resubmissionDescription={resubmissionDescription} onResubmissionDescription={setResubmissionDescription} onCompensation={setCompensation} onReviewNote={setReviewNote} onRecheckReason={setRecheckReason} onApprove={approve} onRequestRecheck={requestRecheck} onResubmit={resubmit} onUpload={uploadEvidence} evidence={newEvidence} onRemoveEvidence={index => setNewEvidence(current => current.filter((_, i) => i !== index))} />
              : <EmptyState title="Không tìm thấy biên bản" description="Chọn biên bản khác trong danh sách." icon={<ClipboardList size={22} />} />}
        </Modal>
      </>
    )}
  </section>;
}

function IncidentDetail(props: {
  report: IncidentReport; busy: boolean; canCreate: boolean; canReview: boolean; canViewSettlement: boolean; onOpenPayout: (payoutId: string) => void;
  compensation: string; reviewNote: string; recheckReason: string; resubmissionDescription: string;
  evidence: string[]; onCompensation: (value: string) => void; onReviewNote: (value: string) => void;
  onResubmissionDescription: (value: string) => void; onRecheckReason: (value: string) => void;
  onApprove: (event: FormEvent) => void; onRequestRecheck: (event: FormEvent) => void; onResubmit: (event: FormEvent) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemoveEvidence: (index: number) => void;
}) {
  const { report, busy } = props;
  const recheck = report.status === 'NeedsRecheck' && props.canCreate;
  const pending = report.status === 'Pending' && props.canReview;
  const badge = resolveIncidentBadge(report);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="text-lg font-bold text-brand-ink">{report.productName}</h3><p className="text-xs text-muted">{report.productBarcode} · Hợp đồng {report.contractNumber ?? '—'} · {report.customerName ?? 'Khách ký gửi'} · {typeText[report.type]}</p></div>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
    <div className="space-y-1 rounded-card border border-border bg-surface-subtle p-4 text-sm text-ink">
      <p><strong>Biên bản:</strong> {report.description}</p>
      <p><strong>Giá thỏa thuận:</strong> {money(report.agreedPrice)}</p>
      {report.compensationAmount > 0 && <p><strong>Mức bồi thường:</strong> {money(report.compensationAmount)}</p>}
      {report.approvedByEmployeeId && <p><strong>Người duyệt:</strong> {report.approvedByName || report.approvedByEmployeeId} {report.approvedAt ? `· ${dateTime(report.approvedAt)}` : ''}</p>}
      {report.reviewNote && <p><strong>Ghi chú:</strong> {report.reviewNote}</p>}
    </div>
    {report.payoutNumber && report.payoutStatus && (
      <AlertBanner
        variant="info"
        message={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Đã gắn với lệnh chi <strong>{report.payoutNumber}</strong> ({payoutStateText[report.payoutStatus]}).
            </span>
            {props.canViewSettlement && report.payoutId && (
              <Button size="sm" variant="outline" onClick={() => props.onOpenPayout(report.payoutId!)}>
                Xem lệnh chi tại Quyết toán →
              </Button>
            )}
          </div>
        }
      />
    )}
    <div><h4 className="mb-2 text-sm font-bold text-ink">Ảnh chứng cứ</h4><EvidenceStrip urls={report.evidenceUrls} /></div>
    {recheck && <form onSubmit={props.onResubmit} className="space-y-3 rounded-card border border-brand-lavender/40 bg-brand-pink-surface p-4">
      <h4 className="font-bold text-brand-ink">Bổ sung theo yêu cầu quản lý</h4>
      <label className="block text-xs font-bold uppercase tracking-wide text-ink">Mô tả cập nhật<textarea value={props.resubmissionDescription} onChange={event => props.onResubmissionDescription(event.target.value)} maxLength={2000} rows={2} className={textareaClass} /></label>
      <label className="block text-xs font-bold uppercase tracking-wide text-ink">Thêm ảnh chứng cứ<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={props.onUpload} className={fileClass} /></label>
      {props.evidence.length > 0 && <EvidenceStrip urls={props.evidence} onRemove={props.onRemoveEvidence} />}
      <Button type="submit" disabled={busy || !props.resubmissionDescription.trim()} startIcon={<Send size={15} />}>Gửi bổ sung</Button>
    </form>}
    {pending && <div className="space-y-4 border-t border-border pt-4">
      <form onSubmit={props.onApprove} className="space-y-3">
        <h4 className="flex items-center gap-2 font-bold text-brand-ink"><ShieldCheck size={17} /> Duyệt bồi thường</h4>
        <DecimalMoneyInput
          label={'Số tiền (tối đa ' + money(report.agreedPrice) + ')'}
          value={props.compensation}
          onChange={props.onCompensation}
          placeholder="Nhập mức bồi thường"
          helperText="Tự động thêm dấu chấm ngăn cách; có thể xóa hết để nhập lại."
          error={(() => {
            const parsed = parseDecimalMoney(props.compensation);
            if (!props.compensation) return undefined;
            if (parsed === null || parsed <= 0 || parsed > report.agreedPrice) {
              return `Số tiền hợp lệ từ 1 ₫ đến ${money(report.agreedPrice)}.`;
            }
            return undefined;
          })()}
        />
        <Input label="Lý do nếu bồi thường thấp hơn giá thỏa thuận" value={props.reviewNote} onChange={event => props.onReviewNote(event.target.value)} maxLength={1000} />
        <Button type="submit" disabled={busy || !props.compensation} startIcon={<Check size={15} />}>Duyệt mức bồi thường</Button>
      </form>
      <form onSubmit={props.onRequestRecheck} className="space-y-3 border-t border-border pt-4">
        <label className="block text-xs font-bold uppercase tracking-wide text-ink">Yêu cầu kiểm tra lại<textarea value={props.recheckReason} onChange={event => props.onRecheckReason(event.target.value)} maxLength={1000} rows={2} className={textareaClass} placeholder="Nêu thông tin hoặc ảnh cần nhân viên bổ sung" /></label>
        <Button type="submit" variant="outline" disabled={busy || !props.recheckReason.trim()} startIcon={<RefreshCw size={15} />}>Yêu cầu kiểm tra lại</Button>
      </form>
    </div>}
    {report.history && <div className="border-t border-border pt-4">
      <h4 className="mb-2 text-sm font-bold text-ink">Lịch sử thao tác</h4>
      <ol className="space-y-2">{report.history.map(event => <li key={event.id} className="rounded-card border border-border bg-surface-subtle p-3 text-xs">
        <p className="font-semibold text-ink">{event.action} · {dateTime(event.occurredAt)}</p>
        <p className="text-muted">{event.reason || event.actorAccountId || event.actorType}</p>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-text-secondary">{event.changes}</pre>
      </li>)}</ol>
    </div>}
  </div>;
}
