import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, ClipboardCheck, Search } from 'lucide-react';
import { buyoutsApi, type Buyout, type BuyoutCustomer, type BuyoutInspection } from '@/api/buyouts';
import type { BrandOption, CategoryOption } from '@/api/consignmentApi';
import { parseProblemDetails } from '@/api/auth';
import { Button, Combobox, Input, SkeletonLoading } from '@/components/shared';

interface Props { canInspect: boolean; onBusyChange: (busy: boolean) => void; onCreated: (buyout: Buyout) => void }
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

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const changeBy = (delta: number) => {
    const current = validMoney(value) ? moneyAmount(value) : 0;
    onChange(String(Math.round(Math.max(1000, current + delta) * 100) / 100).replace('.', ','));
  };
  return <Input
    label={label}
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

export function BuyoutCreateForm({ canInspect, onBusyChange, onCreated }: Props) {
  const [inspections, setInspections] = useState<BuyoutInspection[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [inspectionId, setInspectionId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [listedPrice, setListedPrice] = useState('');
  const [showInspection, setShowInspection] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<BuyoutCustomer[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [passed, setPassed] = useState(false);
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
  const available = inspections.filter(item => item.available);
  const selected = available.find(item => item.id === inspectionId);
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
    if (!customerId.trim() || !brandId || !categoryId || !passed || condition === '' || !Number.isInteger(Number(condition)) || Number(condition) < 0 || Number(condition) > 100) {
      setError('Vui lòng chọn khách hàng, thương hiệu, danh mục, tình trạng từ 0–100 và xác nhận sản phẩm đã đạt kiểm định.'); return;
    }
    setWorking(true); setError('');
    try {
      const item = await buyoutsApi.inspect({ customerId: customerId.trim(), name: name.trim(), size: size.trim(), description: description.trim() || null, conditionPercentage: Number(condition), brandId, categoryId, inspectionNotes: notes.trim(), passed: true });
      setInspections(current => [item, ...current.filter(record => record.id !== item.id)]); setInspectionId(item.id); setShowInspection(false); setMessage('Đã ghi nhận kiểm định. Nhập giá để lập phiếu.');
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
    if (!selected || !validMoney(purchasePrice) || !validMoney(listedPrice)) { setError('Chọn bản kiểm định khả dụng và nhập giá lớn hơn 0, tối đa hai chữ số thập phân.'); return; }
    setWorking(true); setError('');
    try { onCreated(await buyoutsApi.create(selected.id, moneyAmount(purchasePrice), moneyAmount(listedPrice))); }
    catch (err) {
      const problem = parseProblemDetails(err);
      setError(problem.status === 0 || problem.status === 409 ? 'Không thể xác nhận kết quả lập phiếu hoặc bản kiểm định đã được sử dụng. Hãy kiểm tra lịch sử thu mua và tải lại danh sách kiểm định trước khi thử lại.' : errorText(err));
      try { setInspections(await buyoutsApi.inspections()); } catch { /* Giữ dữ liệu đang xem. */ }
    } finally { setWorking(false); }
  };

  if (loading) return <SkeletonLoading variant="cards" count={2} label="Đang tải dữ liệu lập phiếu..." />;
  if (loadError) return <div role="alert" className="space-y-3 text-sm text-state-danger"><p>Không thể tải dữ liệu lập phiếu: {loadError}</p><Button variant="outline" onClick={() => void load()}>Thử lại</Button></div>;

  return <div className="space-y-5">
    <div><h2 className="text-base font-bold text-brand-ink">Lập phiếu mua đứt</h2><p className="mt-1 text-sm text-text-secondary">Kiểm tra và lưu thông tin món hàng trước, sau đó nhập giá mua và giá bán dự kiến để gửi quản lý duyệt. Chỉ ghi nhận chi tiền sau khi phiếu được duyệt.</p></div>
    {error && <p role="alert" className="rounded-xl border border-state-danger/30 bg-paper p-3 text-sm text-state-danger">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-state-success-border bg-state-success-soft p-3 text-sm text-state-success-strong">{message}</p>}
    {showInspection ? <form onSubmit={event => void saveInspection(event)} className="space-y-4 rounded-xl border border-border p-4">
      <div><h3 className="font-bold text-ink">Ghi nhận kiểm định</h3><p className="mt-1 text-xs text-muted">Lưu kết quả nhân viên đã kiểm tra tình trạng món hàng và xác nhận món đạt điều kiện thu mua. Trước tiên, tìm khách hàng bằng tên hoặc số điện thoại.</p></div>
      <div className="space-y-2"><div className="flex gap-2"><Input aria-label="Tìm khách hàng" placeholder="Tên hoặc số điện thoại khách hàng" value={customerQuery} disabled={searching} onChange={event => { setCustomerQuery(event.target.value); setCustomerId(''); setCustomers([]); setSearched(false); }} startAdornment={<Search size={16} />} /><Button variant="outline" loading={searching} onClick={() => void searchCustomers()}>Tìm khách</Button></div>{customers.length > 0 && <Combobox label="Khách hàng" value={customerId} onChange={setCustomerId} placeholder="Chọn khách hàng" options={customers.map(item => ({ value: item.id, label: `${item.fullName} · ${item.phoneNumber}` }))} />}{searched && customers.length === 0 && <p className="text-sm text-muted">Không tìm thấy khách hàng đang hoạt động.</p>}</div>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Tên sản phẩm" value={name} onChange={event => setName(event.target.value)} maxLength={200} required /><Input label="Kích cỡ" value={size} onChange={event => setSize(event.target.value)} maxLength={30} required /><Combobox label="Thương hiệu" value={brandId} onChange={setBrandId} placeholder="Chọn thương hiệu" options={brands.map(item => ({ value: item.id, label: item.name }))} /><Combobox label="Danh mục" value={categoryId} onChange={setCategoryId} placeholder="Chọn danh mục" options={categories.map(item => ({ value: item.id, label: item.name }))} /><Input label="Tình trạng (%)" type="number" min="0" max="100" step="1" value={condition} onChange={event => setCondition(event.target.value)} required /><Input label="Mô tả" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} /></div>
      <Input label="Ghi chú kiểm định" value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} required />
      <label className="flex items-start gap-2 text-sm text-ink"><input type="checkbox" checked={passed} onChange={event => setPassed(event.target.checked)} className="mt-1 accent-brand-highlight" />Tôi đã kiểm tra và xác nhận sản phẩm đạt yêu cầu thu mua.</label>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => { setShowInspection(false); setError(''); }}>Quay lại</Button><Button type="submit" loading={busy} startIcon={<ClipboardCheck size={16} />}>Lưu kiểm định</Button></div>
    </form> : <form noValidate onSubmit={event => void create(event)} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Combobox label="Sản phẩm đã kiểm định" value={inspectionId} onChange={setInspectionId} placeholder="Chọn bản kiểm định khả dụng" options={available.map(item => ({ value: item.id, label: `${item.name} · ${item.size} · ${item.customerName} · ${new Date(item.createdAt).toLocaleDateString('vi-VN')}` }))} /></div>{canInspect && <Button variant="outline" onClick={() => { setShowInspection(true); setMessage(''); setError(''); }}>Ghi nhận kiểm định</Button>}</div>
      {available.length === 0 && <p className="text-sm text-muted">Chưa có bản kiểm định khả dụng.{canInspect ? ' Hãy ghi nhận kiểm định cho sản phẩm trước.' : ' Nhờ nhân viên có quyền tiếp nhận ghi nhận kiểm định.'}</p>}
      {selected && <div className="rounded-xl bg-brand-pink-surface p-4 text-sm"><p className="font-bold text-brand-ink">{selected.name} · {selected.size} · {selected.conditionPercentage}%</p><p className="mt-1 text-text-secondary">{selected.brandName} · {selected.categoryName} · Khách hàng: {selected.customerName}</p><p className="mt-1 text-text-secondary">Kiểm định: {selected.inspectionNotes}</p></div>}
      <div className="grid gap-4 sm:grid-cols-2"><MoneyInput label="Giá mua / giá vốn (₫)" value={purchasePrice} onChange={setPurchasePrice} /><MoneyInput label="Giá bán dự kiến (₫)" value={listedPrice} onChange={setListedPrice} /></div>
      <p className="text-xs text-muted">Giá mua là giá vốn dự kiến. Chưa ghi nhận chi tiền hoặc tạo sản phẩm khi lập phiếu.</p>
      <div className="flex justify-end"><Button type="submit" loading={busy} disabled={!selected}>Gửi phiếu chờ duyệt</Button></div>
    </form>}
  </div>;
}
