import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, ClipboardCheck, Search } from 'lucide-react';
import { buyoutsApi, type Buyout, type BuyoutApprovalConfig, type BuyoutCustomer, type BuyoutInspection } from '@/api/buyouts';
import { COMMON_SIZES, type BrandOption, type CategoryOption } from '@/api/consignmentApi';
import { parseProblemDetails } from '@/api/auth';
import { Badge, Button, Card, Combobox, ErrorState, Input, SkeletonLoading, Toast } from '@/components/shared';

interface Props { canInspect: boolean; initialInspection?: boolean; onBusyChange: (busy: boolean) => void; onCreated: (buyout: Buyout) => void }
const errorText = (error: unknown) => { const problem = parseProblemDetails(error); return problem.detail || problem.title || 'Không thể hoàn tất thao tác.'; };
const moneyAmount = (value: string) => Number(value.replace(',', '.'));
const validMoney = (value: string) => /^\d+(?:,\d{1,2})?$/.test(value) && moneyAmount(value) > 0 && Number.isSafeInteger(Math.round(moneyAmount(value) * 100));
const normalizeMoney = (value: string) => {
  const [whole, ...fraction] = value.replace(/\./g, '').replace(/[^\d,]/g, '').split(',');
  const integer = whole.replace(/^0+(?=\d)/, '');
  return fraction.length ? `${integer},${fraction.join('').slice(0, 2)}` : integer;
};
const displayMoney = (value: string) => {
  const [integer, fraction] = value.split(',');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
};
const formatCurrency = (value: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ₫`;

function MoneyInput({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  const changeBy = (delta: number) => {
    const current = validMoney(value) ? moneyAmount(value) : 0;
    onChange(String(Math.round(Math.max(1000, current + delta) * 100) / 100).replace('.', ','));
  };
  return <Input
    label={label}
    error={error}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    value={displayMoney(value)}
    onChange={event => onChange(normalizeMoney(event.target.value))}
    onKeyDown={event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        changeBy(event.key === 'ArrowUp' ? 1000 : -1000);
      }
    }}
    endAdornment={<span className="flex flex-col">
      <button type="button" aria-label={`Tăng ${label} thêm 1.000 đồng`} onClick={() => changeBy(1000)} className="rounded text-muted hover:text-brand-highlight focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink"><ChevronUp size={16} /></button>
      <button type="button" aria-label={`Giảm ${label} đi 1.000 đồng`} disabled={!validMoney(value) || moneyAmount(value) <= 1000} onClick={() => changeBy(-1000)} className="rounded text-muted hover:text-brand-highlight focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink disabled:opacity-40"><ChevronDown size={16} /></button>
    </span>}
  />;
}

export function BuyoutCreateForm({ canInspect, initialInspection = false, onBusyChange, onCreated }: Props) {
  const [inspections, setInspections] = useState<BuyoutInspection[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalConfig, setApprovalConfig] = useState<BuyoutApprovalConfig | null>(null);
  const [configUnavailable, setConfigUnavailable] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [inspectionId, setInspectionId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [listedPrice, setListedPrice] = useState('');
  const [showInspection, setShowInspection] = useState(initialInspection && canInspect);
  const [activeStep, setActiveStep] = useState(initialInspection && canInspect ? 0 : 1);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<BuyoutCustomer[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('100');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [passed, setPassed] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  const setWorking = (value: boolean) => { setBusy(value); onBusyChange(value); };

  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const [records, brandOptions, categoryOptions] = await Promise.all([
        buyoutsApi.inspections(), canInspect ? buyoutsApi.brands() : Promise.resolve([]), canInspect ? buyoutsApi.categories() : Promise.resolve([]),
      ]);
      setInspections(records); setBrands(brandOptions); setCategories(categoryOptions);
    } catch (err) { setLoadError(errorText(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [canInspect]);
  useEffect(() => { let active = true; buyoutsApi.approvalConfig().then(value => { if (active) setApprovalConfig(value); }).catch(() => { if (active) setConfigUnavailable(true); }); return () => { active = false; }; }, []);
  const available = inspections.filter(item => item.available);
  const selected = available.find(item => item.id === inspectionId);
  const hasValidPrices = validMoney(purchasePrice) && validMoney(listedPrice);
  const priceBelowCost = hasValidPrices && moneyAmount(listedPrice) < moneyAmount(purchasePrice);
  const canSubmitPrices = hasValidPrices && !priceBelowCost;
  const expectedMargin = hasValidPrices ? moneyAmount(listedPrice) - moneyAmount(purchasePrice) : null;
  const progressStep = activeStep;
  const goToStep = (step: number) => {
    setError('');
    if (step === 0) {
      if (!canInspect) return;
      setShowInspection(true);
      setActiveStep(0);
      return;
    }
    if (step === 1) {
      setShowInspection(false);
      setActiveStep(1);
      return;
    }
    if (priceBelowCost) { setError('Giá bán dự kiến phải lớn hơn hoặc bằng giá mua.'); return; }
    if (!selected || !canSubmitPrices) {
      setError('Hãy chọn sản phẩm đã kiểm định và nhập đủ giá mua, giá bán dự kiến trước khi xem lại phiếu.');
      return;
    }
    setShowInspection(false);
    setActiveStep(2);
    setError('');
  };
  const searchCustomers = async () => {
    if (customerQuery.trim().length < 2) { setError('Nhập ít nhất 2 ký tự tên hoặc số điện thoại khách hàng.'); return; }
    setSearching(true); setError('');
    try { setCustomers(await buyoutsApi.customers(customerQuery)); setSearched(true); }
    catch (err) { setError(`Không thể tìm khách hàng. ${errorText(err)}`); }
    finally { setSearching(false); }
  };
  const saveInspection = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const missing: string[] = [];
    if (!customerId.trim()) missing.push('khách hàng');
    if (!name.trim()) missing.push('tên sản phẩm');
    if (!size.trim()) missing.push('kích cỡ');
    if (!brandId) missing.push('thương hiệu');
    if (!categoryId) missing.push('danh mục');
    if (condition.trim() === '' || !Number.isInteger(Number(condition)) || Number(condition) < 0 || Number(condition) > 100) missing.push('tình trạng hợp lệ từ 0–100%');
    if (!notes.trim()) missing.push('ghi chú kiểm định');
    if (!passed) missing.push('xác nhận sản phẩm đạt yêu cầu');
    setConfirmationError(!passed);
    if (missing.length) { setError(`Vui lòng bổ sung: ${missing.join(', ')}.`); return; }
    setWorking(true); setError('');
    try {
      const item = await buyoutsApi.inspect({ customerId: customerId.trim(), name: name.trim(), size: size.trim(), description: description.trim() || null, conditionPercentage: Number(condition), brandId, categoryId, inspectionNotes: notes.trim(), passed: true });
      setInspections(current => [item, ...current.filter(record => record.id !== item.id)]); setInspectionId(item.id); setShowInspection(false); setActiveStep(1); setMessage('Đã ghi nhận kiểm định. Nhập giá để lập phiếu.');
    } catch (err) {
      const problem = parseProblemDetails(err);
      if (problem.status === 0) {
        setError('Chưa xác định được kết quả lưu kiểm định. Hãy quay lại và kiểm tra danh sách kiểm định trước khi thử lại.');
        try { setInspections(await buyoutsApi.inspections()); } catch { /* Có thể tải lại sau khi kết nối phục hồi. */ }
      } else setError(errorText(err));
    }
    finally { setWorking(false); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (priceBelowCost) { setError('Giá bán dự kiến phải lớn hơn hoặc bằng giá mua.'); return; }
    if (!selected || !validMoney(purchasePrice) || !validMoney(listedPrice)) { setError('Chọn bản kiểm định khả dụng và nhập giá lớn hơn 0, tối đa hai chữ số thập phân.'); return; }
    setWorking(true); setError('');
    try { onCreated(await buyoutsApi.create(selected.id, moneyAmount(purchasePrice), moneyAmount(listedPrice))); }
    catch (err) {
      const problem = parseProblemDetails(err);
      setError(problem.status === 0 || problem.status === 409 ? 'Không thể xác nhận kết quả lập phiếu hoặc bản kiểm định đã được sử dụng. Hãy kiểm tra lịch sử thu mua và tải lại danh sách kiểm định trước khi thử lại.' : errorText(err));
      try { setInspections(await buyoutsApi.inspections()); } catch { /* Giữ dữ liệu đang xem. */ }
    } finally { setWorking(false); }
  };

  if (loading) return <SkeletonLoading variant="cards" count={2} label="Đang tải thông tin tiếp nhận mua đứt..." />;
  if (loadError) return <ErrorState title="Không thể tải dữ liệu tiếp nhận" description={loadError} onRetry={() => void load()} />;

  return <div className="space-y-5">
    <ol className="grid gap-3 rounded-xl bg-brand-pink-surface p-4 sm:grid-cols-3" aria-label="Các bước thu mua">
      {['Khách hàng và kiểm định', 'Giá mua và đề nghị', 'Quản lý xét duyệt'].map((label, index) => {
        const completed = index === 0 ? Boolean(selected) && activeStep > 0 : index === 1 ? activeStep > 1 && canSubmitPrices : false;
        const active = index === activeStep;
        return <li key={label} className="min-w-0">
          <button type="button" onClick={() => goToStep(index)} disabled={busy || (index === 0 && !canInspect)} aria-current={active ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'font-bold text-brand-highlight' : completed ? 'font-semibold text-brand-ink' : 'text-muted'} hover:bg-white/70`}>
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border bg-white text-xs font-bold transition-all ${active ? 'border-brand-pink bg-brand-pink-surface text-brand-highlight ring-2 ring-brand-pink/30' : completed ? 'border-state-success-border bg-state-success-soft text-state-success-strong' : 'border-brand-lavender/40 text-muted'}`}>{completed ? <Check size={16} aria-label="Đã hoàn thành" /> : index + 1}</span>
            <span className="min-w-0">{label}</span>
          </button>
          <div aria-hidden="true" className={`mt-2 h-1 rounded-full transition-colors duration-300 ${active || completed ? 'bg-brand-pink' : 'bg-border'}`} />
        </li>;
      })}
    </ol>
    {error && typeof document !== 'undefined' && createPortal(<div className="fixed right-4 top-4 z-[3000] w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none"><Toast variant="error" title="Chưa thể tiếp tục" message={error} onClose={() => setError('')} /></div>, document.body)}
    {message && <p role="status" className="rounded-xl border border-state-success-border bg-state-success-soft p-3 text-sm text-state-success-strong">{message}</p>}
    {progressStep === 0 && showInspection ? <form noValidate onSubmit={event => void saveInspection(event)}>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <Card className="!bg-white" title="Thông tin khách hàng" description="Tra cứu và chọn khách hàng trước khi kiểm định món hàng.">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <Input label="Tên hoặc số điện thoại" placeholder="Nhập ít nhất 2 ký tự để tìm khách hàng" value={customerQuery} disabled={searching} onChange={event => { setCustomerQuery(event.target.value); setCustomerId(''); setCustomers([]); setSearched(false); }} startAdornment={<Search size={16} />} />
            <Button variant="outline" loading={searching} onClick={() => void searchCustomers()}>Tra cứu khách hàng</Button>
          </div>
          {customers.length > 0 && <div className="mt-4"><Combobox label="Khách hàng tiếp nhận" value={customerId} onChange={setCustomerId} placeholder="Chọn khách hàng" options={customers.map(item => ({ value: item.id, label: `${item.fullName} · ${item.phoneNumber}` }))} /></div>}
          {searched && customers.length === 0 && <p className="mt-3 text-sm text-muted">Không tìm thấy khách hàng đang hoạt động. Kiểm tra lại tên hoặc số điện thoại; khách cần có hồ sơ trước khi lập phiếu.</p>}
        </Card>
        <Card className="!bg-white" title="Sản phẩm tiếp nhận" description="Ghi lại tình trạng thực tế và kết quả kiểm tra. Mỗi phiếu mua đứt áp dụng cho một món." actions={<Badge variant="info">1 sản phẩm</Badge>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Tên sản phẩm" value={name} onChange={event => setName(event.target.value)} maxLength={200} required />
            <Combobox label="Kích cỡ" value={size} onChange={setSize} placeholder="Chọn kích thước" options={COMMON_SIZES.map(value => ({ value, label: value }))} />
            <Combobox label="Thương hiệu" value={brandId} onChange={setBrandId} placeholder="Chọn thương hiệu" options={brands.map(item => ({ value: item.id, label: item.name }))} />
            <Combobox label="Danh mục" value={categoryId} onChange={setCategoryId} placeholder="Chọn danh mục" options={categories.map(item => ({ value: item.id, label: item.name }))} />
            <Input label="Tình trạng (%)" type="number" min="0" max="100" step="1" value={condition} onChange={event => setCondition(event.target.value)} required />
            <Input label="Mô tả sản phẩm" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} />
          </div>
          <div className="mt-4"><Input label="Ghi chú kiểm định" placeholder="Chất liệu, dấu hiệu sử dụng, lỗi đã kiểm tra…" value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} required /></div>
          <label className={`mt-4 flex items-start gap-2 rounded-xl border p-4 text-sm text-ink ${confirmationError ? 'border-state-danger-border bg-state-danger-soft' : 'border-transparent bg-brand-pink-surface'}`}><input type="checkbox" checked={passed} aria-invalid={confirmationError || undefined} onChange={event => { setPassed(event.target.checked); if (event.target.checked) { setConfirmationError(false); setError(''); } }} className="mt-1 accent-brand-highlight" />Tôi đã kiểm tra và xác nhận sản phẩm đạt yêu cầu thu mua. <span className="text-state-danger" aria-hidden="true">*</span></label>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={() => { setShowInspection(false); setActiveStep(1); setError(''); }}>Dùng bản kiểm định đã lưu</Button>
          <Button type="submit" loading={busy} startIcon={<ClipboardCheck size={16} />}>Lưu kiểm định và nhập giá</Button>
        </div>
      </fieldset>
    </form> : <form noValidate onSubmit={event => { event.preventDefault(); void create(event); }}>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {progressStep === 1 ? <>
        <Card className="!bg-white" title="Thông tin đề nghị thu mua" description="Chọn món đã kiểm định để lập phiếu gửi quản lý duyệt." actions={canInspect && <Button variant="outline" size="sm" onClick={() => { setShowInspection(true); setActiveStep(0); setMessage(''); setError(''); }}>Kiểm định món mới</Button>}>
          <Combobox label="Sản phẩm đã kiểm định" value={inspectionId} onChange={value => { setInspectionId(value); setPurchasePrice(''); setListedPrice(''); }} placeholder="Chọn bản kiểm định khả dụng" options={available.map(item => ({ value: item.id, label: `${item.name} · ${item.size} · ${item.customerName} · ${new Date(item.createdAt).toLocaleDateString('vi-VN')}` }))} />
          {available.length === 0 && <p className="mt-3 text-sm text-muted">Chưa có bản kiểm định khả dụng.{canInspect ? ' Chọn Kiểm định món mới để bắt đầu tiếp nhận.' : ' Nhờ nhân viên có quyền tiếp nhận ghi nhận kiểm định.'}</p>}
          {selected && <div className="mt-4 rounded-xl bg-brand-pink-surface p-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">Khách hàng</dt><dd className="mt-1 font-semibold text-brand-ink">{selected.customerName}</dd></div><div><dt className="text-muted">Sản phẩm</dt><dd className="mt-1 font-semibold text-brand-ink">{selected.name}</dd></div><div><dt className="text-muted">Thương hiệu · danh mục</dt><dd className="mt-1">{selected.brandName} · {selected.categoryName}</dd></div><div><dt className="text-muted">Kích cỡ · tình trạng</dt><dd className="mt-1">{selected.size} · {selected.conditionPercentage}%</dd></div></dl><p className="mt-4 border-t border-border pt-3 text-sm text-muted">Kiểm định: {selected.inspectionNotes}</p></div>}
        </Card>
        <Card className="!bg-white" title="Giá mua và giá bán dự kiến" description="Nhập mức giá đề xuất cho món hàng. Giá mua được lưu riêng để theo dõi giá vốn.">
          <p className="mb-4 rounded-xl bg-brand-pink-surface p-3 text-sm text-text-secondary">{configUnavailable ? 'Không thể tải cấu hình tự duyệt. Kết quả xét duyệt sẽ được xác định khi gửi phiếu.' : !approvalConfig ? 'Đang tải cấu hình tự duyệt…' : approvalConfig.enabled && approvalConfig.threshold !== null ? `Ngưỡng tự duyệt hiện tại: ${formatCurrency(approvalConfig.threshold)}. Cấu hình có thể thay đổi trước khi gửi phiếu.` : 'Tính năng tự duyệt đang tắt. Mọi phiếu mua đứt đều yêu cầu quản lý duyệt.'}</p>
          <div className="grid gap-4 sm:grid-cols-2"><MoneyInput label="Giá mua / giá vốn (₫)" value={purchasePrice} onChange={setPurchasePrice} /><MoneyInput label="Giá bán dự kiến (₫)" value={listedPrice} onChange={setListedPrice} error={priceBelowCost ? 'Giá bán dự kiến phải lớn hơn hoặc bằng giá mua.' : undefined} /></div>
          {validMoney(purchasePrice) && <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-paper px-4"><div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><dt className="text-text-secondary">Số tiền đề nghị mua</dt><dd className="font-bold text-brand-highlight">{formatCurrency(moneyAmount(purchasePrice))}</dd></div>{hasValidPrices && <><div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><dt className="text-text-secondary">Chênh lệch dự kiến trước chi phí</dt><dd className={`font-bold ${expectedMargin !== null && expectedMargin < 0 ? 'text-state-danger' : 'text-state-success-strong'}`}>{formatCurrency(expectedMargin ?? 0)}</dd></div><div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><dt className="text-text-secondary">Tỷ lệ chênh lệch trên giá bán dự kiến</dt><dd className="font-semibold text-brand-ink">{expectedMargin !== null ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(expectedMargin / moneyAmount(listedPrice) * 100)}%` : '—'}</dd></div></>}</dl>}
          {hasValidPrices && <p className="mt-3 text-xs text-muted">Chênh lệch chỉ là ước tính theo giá bán dự kiến, chưa trừ chi phí vận hành và chưa phải lợi nhuận thực tế.</p>}
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"><p className="max-w-xl text-sm text-muted">Sau khi gửi, hệ thống xét duyệt theo cấu hình. Sản phẩm được nhập kho và ghi giá vốn khi nhân viên xác nhận đã chi tiền.</p><Button type="button" onClick={() => goToStep(2)} disabled={!selected || !canSubmitPrices}>Tiếp tục xem lại phiếu</Button></div>
        </> : <>
          <Card className="!bg-white" title="Xem lại phiếu mua đứt" description="Kiểm tra thông tin và giá trước khi gửi đến quản lý.">
            {selected && <dl className="grid gap-x-8 gap-y-4 rounded-xl bg-paper p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">Khách hàng</dt><dd className="mt-1 font-semibold text-brand-ink">{selected.customerName}</dd></div><div><dt className="text-muted">Sản phẩm</dt><dd className="mt-1 font-semibold text-brand-ink">{selected.name} · {selected.size}</dd></div><div><dt className="text-muted">Thương hiệu · danh mục</dt><dd className="mt-1">{selected.brandName} · {selected.categoryName}</dd></div><div><dt className="text-muted">Tình trạng</dt><dd className="mt-1">{selected.conditionPercentage}%</dd></div><div><dt className="text-muted">Giá mua đề nghị / giá vốn</dt><dd className="mt-1 font-bold text-brand-highlight">{hasValidPrices ? formatCurrency(moneyAmount(purchasePrice)) : '—'}</dd></div><div><dt className="text-muted">Giá bán dự kiến</dt><dd className="mt-1 font-semibold">{hasValidPrices ? formatCurrency(moneyAmount(listedPrice)) : '—'}</dd></div><div className="sm:col-span-2"><dt className="text-muted">Chênh lệch dự kiến trước chi phí</dt><dd className={`mt-1 font-bold ${expectedMargin !== null && expectedMargin < 0 ? 'text-state-danger' : 'text-state-success-strong'}`}>{expectedMargin !== null ? formatCurrency(expectedMargin) : '—'}</dd></div></dl>}
            <p className="mt-4 rounded-xl bg-brand-pink-surface p-4 text-sm text-text-secondary">Khi gửi phiếu, hệ thống xét tự duyệt theo cấu hình hiện hành. Phiếu cần duyệt thủ công sẽ chuyển cho quản lý; phiếu được duyệt vẫn cần nhân viên ghi nhận đã chi tiền.</p>
          </Card>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4"><Button type="button" variant="outline" onClick={() => goToStep(1)}>Quay lại chỉnh giá</Button><Button type="submit" loading={busy} disabled={!selected || !canSubmitPrices}>Gửi phiếu</Button></div>
        </>}
      </fieldset>
    </form>}
  </div>;
}
