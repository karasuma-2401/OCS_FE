import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { appointmentApi } from '@/api/appointmentApi';
import { parseProblemDetails } from '@/api/auth';
import { loadContractPart } from '@/api/contractErrors';
import { createContract, previewContract, getIntakeTemplate, findContractCustomer, getContractCustomer, getContractEmployee, getContractOptions, updateContractCustomer, type ContractCustomer, type ContractEmployee, type ContractImage, type ContractOptions, type ContractProduct, type ContractResponse, type ContractTemplate, type GuestCustomer } from '@/api/contracts';
import { ContractSignature } from '@/components/shop/ContractSignature';
import { ContractMoneyInput } from '@/components/shop/ContractMoneyInput';
import { prepareCameraPhoto } from '@/components/shop/contractCamera';
import { Camera, Images } from 'lucide-react';
import { barcodeApi } from '@/api/barcode';
import { BarcodeSymbol } from '@/components/shop/BarcodeLabels';
import { Modal } from '@/components/shared/Modal';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { useAuth } from '@/context/AuthContext';
import type { Appointment } from '@/types';

const control = 'mt-1 w-full rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brand-pink-focus focus:outline-none focus:ring-2 focus:ring-brand-pink/25 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted';
const button = 'rounded-xl bg-button-pastel px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-button-pastel-hover disabled:opacity-50';
const emptyGuest = (): GuestCustomer => ({ fullName: '', phoneNumber: '', email: '', identityNumber: '', address: '', bankCode: '', bankAccountNumber: '', bankAccountHolderName: '' });
const emptyProduct = (barcode: string): ContractProduct => ({ name: '', barcode, size: '', description: '', conditionPercentage: 100, listedPrice: null, agreedCommissionRate: null, brandId: '', categoryId: '', storageLocationId: null, images: [] });
const customerFields: { key: keyof GuestCustomer; label: string; type?: string; maxLength: number; required?: boolean }[] = [
  { key: 'fullName', label: 'Họ và tên', maxLength: 200, required: true },
  { key: 'phoneNumber', label: 'Số điện thoại', type: 'tel', maxLength: 10, required: true },
  { key: 'email', label: 'Email', type: 'email', maxLength: 254 },
  { key: 'identityNumber', label: 'CCCD / giấy tờ', maxLength: 20 },
  { key: 'address', label: 'Địa chỉ', maxLength: 500 },
  { key: 'bankCode', label: 'Mã ngân hàng', maxLength: 50 },
  { key: 'bankAccountNumber', label: 'Số tài khoản nhận tiền', maxLength: 50 },
  { key: 'bankAccountHolderName', label: 'Tên chủ tài khoản', maxLength: 200 },
];

export function ContractIntakePage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appointmentId = params.get('appointmentId') || '';
  const direct = params.get('direct') === '1' && !appointmentId;
  const permitted = hasPermission('appointments.staff.reception') && hasPermission('customers.read') && hasPermission('products.create') && (direct || hasPermission('appointments.staff.read'));
  const canUpdateCustomer = hasPermission('customers.update');
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [customer, setCustomer] = useState<ContractCustomer | null>(null);
  const [savedCustomer, setSavedCustomer] = useState<ContractCustomer | null>(null);
  const [employee, setEmployee] = useState<ContractEmployee | null>(null);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [imageError, setImageError] = useState<{ index: number; message: string } | null>(null);
  const [readingSignature, setReadingSignature] = useState(false);
  const [customerNotice, setCustomerNotice] = useState('');
  const [guest, setGuest] = useState<GuestCustomer>(emptyGuest);
  const [isGuest, setIsGuest] = useState(false);
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [phone, setPhone] = useState('');
  const [options, setOptions] = useState<ContractOptions | null>(null);
  const [products, setProducts] = useState<ContractProduct[]>([]);
  const [signedAt, setSignedAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [expiryHandling, setExpiryHandling] = useState<'Return' | 'Donate'>('Return');
  const [terms, setTerms] = useState('');
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [templateChanged, setTemplateChanged] = useState(false);
  const [signature, setSignature] = useState<ContractImage | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<ContractResponse | null>(null);
  const mounted = useRef(true);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!permitted) { setLoading(false); return; }
    let alive = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [catalog, selectedAppointment, currentEmployee, currentTemplate] = await Promise.all([
          loadContractPart('danh mục sản phẩm', getContractOptions()),
          appointmentId ? loadContractPart('lịch hẹn', appointmentApi.getById(appointmentId)) : Promise.resolve(null),
          loadContractPart('hồ sơ nhân viên', getContractEmployee()),
          loadContractPart('mẫu hợp đồng', getIntakeTemplate()),
        ]);
        const existing = selectedAppointment ? await loadContractPart('hồ sơ khách hàng', getContractCustomer(selectedAppointment.customerId)) : null;
        if (alive) { setOptions(catalog); setAppointment(selectedAppointment); setCustomer(existing); setSavedCustomer(existing); setEmployee(currentEmployee); setTemplate(currentTemplate); setTerms(currentTemplate.defaultTerms); }
      } catch (err) { if (alive) { setOptions(null); setAppointment(null); setError(err instanceof Error ? err.message : 'Không thể tải thông tin hợp đồng.'); } }
      finally { if (alive) setLoading(false); }
    };
    void load();
    return () => { alive = false; };
  }, [appointmentId, permitted, loadAttempt]);

  if (!permitted) return <Navigate to="/unauthorized" replace />;

  const lookup = async () => {
    setError(''); setCustomer(null); setIsGuest(false); setSaveCustomer(false);
    if (!/^0\d{9}$/.test(phone.trim())) { setError('Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0.'); return; }
    setLookingUp(true);
    try { const found = await findContractCustomer(phone.trim()); setCustomer(found); setSavedCustomer(found); }
    catch (err) {
      const problem = parseProblemDetails(err);
      if (problem.status === 404) { setGuest({ ...emptyGuest(), phoneNumber: phone.trim() }); setIsGuest(true); }
      else setError(problem.title || 'Không thể tra cứu khách hàng.');
    } finally { setLookingUp(false); }
  };

  const customerDirty = Boolean(customer && savedCustomer && customerFields.some(field => (customer[field.key] || '') !== (savedCustomer[field.key] || '')));
  const updateCustomer = async () => {
    if (!customer || updatingCustomer) return;
    setError(''); setCustomerNotice(''); setUpdatingCustomer(true);
    try { const updated = await updateContractCustomer(customer); setCustomer(updated); setSavedCustomer(updated); setCustomerNotice('Đã cập nhật hồ sơ khách hàng.'); }
    catch (err) { setError(parseProblemDetails(err).title || 'Không thể cập nhật hồ sơ khách hàng.'); }
    finally { setUpdatingCustomer(false); }
  };

  const updateProduct = (index: number, values: Partial<ContractProduct>) => setProducts(current => current.map((item, i) => i === index ? { ...item, ...values } : item));
  const addProduct = async () => {
    if (generatingBarcode || readingImages) return;
    setGeneratingBarcode(true); setError('');
    try {
      const barcode = await barcodeApi.generate();
      if (products.some(product => product.barcode === barcode)) throw new Error('Mã sản phẩm bị trùng, vui lòng thử thêm lại.');
      setProducts(current => [...current, emptyProduct(barcode)]);
    } catch (error) { setError(parseProblemDetails(error).title || 'Không thể tạo mã sản phẩm. Vui lòng thử lại.'); }
    finally { setGeneratingBarcode(false); }
  };
  const regenerateBarcode = async (index: number) => {
    if (generatingBarcode || readingImages) return;
    setGeneratingBarcode(true); setError('');
    try {
      const barcode = await barcodeApi.generate();
      if (products.some(product => product.barcode === barcode)) throw new Error('Mã sản phẩm bị trùng, vui lòng thử lại.');
      updateProduct(index, { barcode });
    } catch { setError('Không thể tạo mã mới. Vui lòng thử lại.'); }
    finally { setGeneratingBarcode(false); }
  };
  const addImages = async (index: number, files: File[], fromCamera = false) => {
    if (!files.length || readingImages) return;
    setImageError(null);
    const current = products[index];
    const existingBytes = products.flatMap(item => item.images).reduce((sum, image) => sum + Math.floor(image.data.length * 3 / 4), 0);
    if (current.images.length + files.length > 5) { setImageError({ index, message: 'Mỗi sản phẩm chỉ được có tối đa 5 ảnh.' }); return; }
    setReadingImages(true);
    try {
      const prepared = fromCamera ? await Promise.all(files.map(prepareCameraPhoto)) : files;
      if (prepared.some(file => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0) || existingBytes + prepared.reduce((sum, file) => sum + file.size, 0) > 8 * 1024 * 1024) {
        throw new Error('Chỉ chọn JPEG/PNG, tối đa 2 MB mỗi ảnh và 8 MB tổng cộng.');
      }
      const images = await Promise.all(prepared.map(file => new Promise<{ contentType: string; data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve({ contentType: file.type, data: reader.result.split(',')[1] }) : reject(new Error('read'));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      })));
      setProducts(currentProducts => currentProducts.map((item, i) => i === index ? { ...item, images: [...item.images, ...images] } : item));
    } catch (err) { setImageError({ index, message: err instanceof Error ? err.message : 'Không thể đọc ảnh. Vui lòng chọn lại.' }); }
    finally { setReadingImages(false); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isPreview = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'preview';
    if (saving || generatingBarcode || readingImages || readingSignature || updatingCustomer || (!customer && !isGuest)) return;
    const start = new Date(signedAt), end = new Date(endsAt);
    if (!signedAt || !endsAt || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) { setError('Ngày kết thúc phải sau ngày ký.'); return; }
    if (isGuest && !/^0\d{9}$/.test(guest.phoneNumber)) { setError('Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0.'); return; }
    const data = customer || guest;
    const bank = [data.bankCode, data.bankAccountNumber, data.bankAccountHolderName];
    if (bank.some(x => x?.trim()) && bank.some(x => !x?.trim())) { setError('Vui lòng nhập đủ ba thông tin tài khoản nhận tiền.'); return; }
    setError(''); setSaving(true); setPreviewing(isPreview);
    try {
      const customerDetails = customer ? { email: customer.email || '', identityNumber: customer.identityNumber || '', address: customer.address || '', bankCode: customer.bankCode || '', bankAccountNumber: customer.bankAccountNumber || '', bankAccountHolderName: customer.bankAccountHolderName || '' } : undefined;
      const request = { ...(appointmentId ? { appointmentId } : customer ? { customerId: customer.id, requestId } : { guest: { ...guest, email: guest.email || '' }, saveCustomer, requestId }), customerDetails, signedAt: start.toISOString(), endsAt: end.toISOString(), expiryHandling, products, terms, templateVersion: template?.version, signature: signature || undefined };
      if (isPreview) {
        const pdf = await previewContract(request);
        if (mounted.current) setPreviewUrl(URL.createObjectURL(pdf));
        return;
      }
      const result = await createContract(request);
      setCreated(result);
      navigate(`/shop/contracts/${result.id}`, { replace: true });
    } catch (err) { const problem = parseProblemDetails(err); if (problem.code === 'CONTRACT_TEMPLATE.CHANGED') setTemplateChanged(true); setError(problem.detail || problem.title || (isPreview ? 'Không thể xem trước hợp đồng.' : 'Không thể tạo hợp đồng.')); }
    finally { setSaving(false); setPreviewing(false); }
  };

  return <ContractPageLayout title="Lập hợp đồng ký gửi" description="Nhập thông tin, xem trước PDF và xác nhận chữ ký của khách hàng." backTo="/shop/consignment" backLabel="Tiếp nhận ký gửi"><div className="mx-auto max-w-6xl">
    {created ? <section role="status" className="mt-6 rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Đã tạo hợp đồng</h2><p className="mt-2 break-all">Mã hợp đồng: {created.contractNumber}</p><p className="mt-2 text-sm text-gray-600">Thông tin khách, sản phẩm và PDF đã được lưu.</p><Link className="mt-4 inline-block text-pink-700 underline" to="/shop/consignment">Về danh sách tiếp nhận</Link></section> :
    <section className="rounded-2xl border border-brand-lavender/40 bg-paper p-5 shadow-sm sm:p-6">
      {loading ? <p role="status">Đang tải dữ liệu...</p> : !options || (!direct && !appointment) ? <div><p role="alert">{error || 'Vui lòng chọn lịch hẹn hoặc tiếp nhận khách trực tiếp.'}</p>{error && <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="mt-3 text-sm font-semibold text-pink-700 underline">Thử tải lại</button>}</div> : <>
        {employee && <section className="mb-6 rounded-xl bg-gray-50 p-4"><h2 className="font-bold">Nhân viên lập hợp đồng</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-gray-500">Họ và tên</dt><dd className="font-semibold">{employee.fullName || 'Chưa cập nhật'}</dd></div><div><dt className="text-gray-500">Chức vụ</dt><dd className="font-semibold">{employee.jobTitle || 'Chưa cập nhật'}</dd></div><div><dt className="text-gray-500">Số điện thoại</dt><dd>{employee.phoneNumber || 'Chưa cập nhật'}</dd></div></dl></section>}
        {direct && <div className="mb-6"><label className="block text-sm font-semibold" htmlFor="lookup-phone">Tra cứu khách theo số điện thoại</label><div className="flex flex-wrap items-end gap-3"><input id="lookup-phone" className={`${control} max-w-xs`} value={phone} disabled={lookingUp || updatingCustomer || saving} maxLength={10} type="tel" onChange={e => { setPhone(e.target.value); setCustomer(null); setIsGuest(false); setSaveCustomer(false); }} /><button type="button" className={button} disabled={lookingUp || updatingCustomer || saving} onClick={() => void lookup()}>{lookingUp ? 'Đang tìm...' : 'Tra cứu'}</button></div><p className="mt-2 text-sm text-gray-600">Nếu chưa có hồ sơ, nhập thông tin khách vãng lai bên dưới.</p></div>}
        {appointment && <p className="mb-5 text-sm text-gray-600">Lịch hẹn: {appointment.trackingNumber || '—'} · Số món dự kiến: {appointment.estimatedItemCount}</p>}
        {appointment && appointment.status !== 'CheckedIn' ? <p role="alert">Lịch hẹn cần được tiếp nhận trước khi lập hợp đồng.</p> : <form onSubmit={event => void submit(event)}><fieldset disabled={saving} className="space-y-8">
          <section><h2 className="text-lg font-bold">Thông tin khách hàng và nhận tiền</h2>
            {!customer && !isGuest ? <p className="mt-2 text-sm text-gray-600">Tra cứu khách để tiếp tục.</p> : <>
              <p className="mt-1 text-sm text-gray-600">{customer ? 'Họ tên và số điện thoại được khóa. Những thay đổi khác sẽ lưu cùng hợp đồng; dùng nút cập nhật nếu muốn lưu vào hồ sơ khách.' : 'Khách vãng lai: nhập thông tin cho hợp đồng.'}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">{customerFields.map(field => <label key={field.key} className="text-sm font-semibold">{field.label}{field.required && !customer ? ' *' : ''}<input className={control} type={field.type || 'text'} maxLength={field.maxLength} required={!customer && field.required} disabled={saving || updatingCustomer || Boolean(customer && (field.key === 'fullName' || field.key === 'phoneNumber'))} value={(customer ? customer[field.key] : guest[field.key]) || ''} onChange={e => { const value = e.target.value; if (customer) { setCustomer(current => current ? { ...current, [field.key]: value } : null); setCustomerNotice(''); } else setGuest(current => ({ ...current, [field.key]: value })); }} /></label>)}</div>
              {customer && canUpdateCustomer && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="rounded-xl border border-pink-700 px-4 py-2 text-sm font-semibold text-pink-700 disabled:opacity-50" disabled={!customerDirty || updatingCustomer} onClick={() => void updateCustomer()}>{updatingCustomer ? 'Đang cập nhật...' : 'Cập nhật thông tin khách hàng'}</button><button type="button" disabled={!customerDirty || updatingCustomer} className="text-sm text-gray-600 underline disabled:opacity-50" onClick={() => setCustomer(savedCustomer)}>Hoàn tác</button>{customerNotice && <span role="status" className="text-sm text-green-700">{customerNotice}</span>}<p className="w-full text-xs text-gray-600">Đổi email đăng nhập sẽ thu hồi phiên hiện tại của khách và yêu cầu kích hoạt lại.</p></div>}
              {isGuest && <div className="mt-4"><button type="button" className="rounded-xl border border-pink-700 px-4 py-2 text-sm font-semibold text-pink-700" onClick={() => setSaveCustomer(value => !value)}>{saveCustomer ? 'Đã chọn lưu thông tin khách hàng ✓' : 'Lưu thông tin khách hàng (không bắt buộc)'}</button><p className="mt-2 text-xs text-gray-600">{saveCustomer ? 'Hồ sơ khách sẽ được lưu khi tạo hợp đồng; chưa tạo thông tin đăng nhập.' : 'Thông tin chỉ được lưu cùng hợp đồng.'}</p></div>}
            </>}
          </section>
          <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Danh sách sản phẩm</h2><button type="button" disabled={readingImages || generatingBarcode} className="rounded-xl border border-pink-700 px-4 py-2 text-sm font-semibold text-pink-700 disabled:opacity-50" onClick={() => void addProduct()}>{generatingBarcode ? 'Đang tạo mã...' : '+ Thêm sản phẩm'}</button></div>
            {!products.length && <p className="mt-2 text-sm text-gray-600">Chưa có sản phẩm. Chọn “Thêm sản phẩm” để nhập.</p>}
            {products.map((item, index) => <div key={index} className="mt-4 rounded-xl border border-gray-200 p-4"><div className="flex justify-between"><h3 className="font-semibold">Sản phẩm {index + 1}</h3><button type="button" disabled={readingImages || generatingBarcode} className="text-sm text-red-700 underline disabled:opacity-50" onClick={() => { setImageError(null); setProducts(current => current.filter((_, i) => i !== index)); }}>Xóa</button></div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-semibold">Tên sản phẩm *<input required maxLength={200} className={control} value={item.name} onChange={e => updateProduct(index, { name: e.target.value })} /></label>
                <div className="text-sm font-semibold"><label>Mã / barcode<input disabled className={control} value={item.barcode} /></label><BarcodeSymbol value={item.barcode} className="mt-2 h-12 w-full max-w-[260px] rounded bg-white" /><button type="button" disabled={generatingBarcode || readingImages} onClick={() => void regenerateBarcode(index)} className="mt-1 text-xs text-pink-700 underline disabled:opacity-50">Tạo mã khác</button></div>
                <label className="text-sm font-semibold">Kích thước *<input required maxLength={30} className={control} value={item.size} onChange={e => updateProduct(index, { size: e.target.value })} /></label>
                <label className="text-sm font-semibold">Danh mục *<select required className={control} value={item.categoryId} onChange={e => updateProduct(index, { categoryId: e.target.value })}><option value="">Chọn danh mục</option>{options.categories.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <label className="text-sm font-semibold">Thương hiệu *<select required className={control} value={item.brandId} onChange={e => updateProduct(index, { brandId: e.target.value, agreedCommissionRate: options.brands.find(x => x.id === e.target.value)?.commissionRate ?? null })}><option value="">Chọn thương hiệu</option>{options.brands.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <label className="text-sm font-semibold">Hoa hồng thỏa thuận (%) *<input required type="number" min="0" max="100" step="0.01" className={control} value={item.agreedCommissionRate ?? ''} onChange={e => updateProduct(index, { agreedCommissionRate: e.target.value === '' ? null : Number(e.target.value) })} /><span className="mt-1 block text-xs font-normal text-gray-600">Gợi ý theo thương hiệu: {item.brandId ? `${options.brands.find(x => x.id === item.brandId)?.commissionRate ?? '—'}%` : '—'}. Có thể điều chỉnh theo thỏa thuận.</span></label>
                <label className="text-sm font-semibold">Độ mới (%) *<input required type="number" min="0" max="100" step="1" className={control} value={item.conditionPercentage} onChange={e => updateProduct(index, { conditionPercentage: Number(e.target.value) })} /></label>
                <label className="text-sm font-semibold">Giá bán thỏa thuận (đ) *<ContractMoneyInput className={control} value={item.listedPrice} onChange={listedPrice => updateProduct(index, { listedPrice })} /><span className="mt-1 block text-xs font-normal text-gray-600">Nhập số tiền bằng đồng; dấu phân cách được thêm tự động.</span></label>
                <label className="text-sm font-semibold">Vị trí kho<select className={control} value={item.storageLocationId || ''} onChange={e => updateProduct(index, { storageLocationId: e.target.value || null })}><option value="">Chưa xếp kho</option>{options.locations.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
                <label className="text-sm font-semibold sm:col-span-2 lg:col-span-3">Mô tả tình trạng<textarea maxLength={2000} className={control} value={item.description} onChange={e => updateProduct(index, { description: e.target.value })} /></label>
              </div><div className="mt-4"><p className="text-sm font-semibold text-ink">Ảnh sản phẩm</p><div className="mt-2 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-lavender bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-pink-light focus-within:outline-2 focus-within:outline-brand-pink-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"><Camera size={16} aria-hidden="true" />Chụp ảnh<input type="file" accept="image/jpeg,image/png" capture="environment" disabled={readingImages || item.images.length >= 5} className="sr-only" onChange={e => { const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ''; void addImages(index, files, true); }} /></label><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-lavender bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-pink-light focus-within:outline-2 focus-within:outline-brand-pink-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"><Images size={16} aria-hidden="true" />Chọn ảnh<input type="file" accept="image/jpeg,image/png" multiple disabled={readingImages || item.images.length >= 5} className="sr-only" onChange={e => { const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ''; void addImages(index, files); }} /></label></div><p className="mt-2 text-xs text-muted">Tối đa 5 ảnh/món, 2 MB/ảnh và 8 MB tổng cộng. Ảnh chụp được tự giảm dung lượng; ảnh đầu tiên là ảnh bìa.</p>{imageError?.index === index && <p role="alert" className="mt-2 text-sm text-state-danger">{imageError.message}</p>}<div className="mt-3 flex flex-wrap gap-3">{item.images.map((image, imageIndex) => <div key={imageIndex} className="w-24"><img className="h-24 w-24 rounded-lg object-cover" src={`data:${image.contentType};base64,${image.data}`} alt={`Ảnh sản phẩm ${index + 1}, ảnh ${imageIndex + 1}`} /><button type="button" disabled={readingImages} className="mt-1 text-xs text-red-700 underline disabled:opacity-50" onClick={() => updateProduct(index, { images: item.images.filter((_, i) => i !== imageIndex) })}>Xóa ảnh {imageIndex + 1}</button></div>)}</div></div></div>)}
            <p className="mt-3 text-xs text-gray-600">Sản phẩm mới ở trạng thái chờ xử lý, chưa tự đưa lên bán.</p>
          </section>
          <section><h2 className="text-lg font-bold">Thời hạn hợp đồng</h2><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Ngày và giờ ký *<input required type="datetime-local" className={control} value={signedAt} onChange={e => setSignedAt(e.target.value)} /></label><label className="text-sm font-semibold">Ngày và giờ kết thúc *<input required type="datetime-local" className={control} value={endsAt} onChange={e => setEndsAt(e.target.value)} /></label><label className="text-sm font-semibold">Xử lý khi hết hạn *<select className={control} value={expiryHandling} onChange={e => setExpiryHandling(e.target.value as 'Return' | 'Donate')}><option value="Return">Trả lại khách hàng</option><option value="Donate">Quyên góp</option></select></label></div></section>
          <section><h2 className="text-lg font-bold">Điều khoản hợp đồng</h2><p className="mt-1 text-sm text-gray-600">Nội dung mặc định do quản lý thiết lập; có thể điều chỉnh cho hợp đồng này. PDF là bản dự thảo; hệ thống đang lưu hợp đồng mới ở trạng thái có hiệu lực.</p><label className="mt-3 block text-sm font-semibold">Nội dung điều khoản<textarea className={control} rows={7} maxLength={6000} value={terms} onChange={e => setTerms(e.target.value)} /></label>{templateChanged && <button type="button" className="mt-2 text-sm font-semibold text-pink-700 underline" onClick={() => { void getIntakeTemplate().then(next => { setTemplate(next); setTemplateChanged(false); setError('Đã tải mẫu mới, hãy kiểm tra lại điều khoản. Nội dung bạn đang nhập được giữ nguyên.'); }).catch(() => setError('Không thể tải mẫu mới.')); }}>Tải mẫu mới và giữ nội dung đang nhập</button>}{template && <button type="button" className="mt-2 block text-sm text-pink-700 underline" onClick={() => setTerms(template.defaultTerms)}>Dùng lại điều khoản mặc định</button>}</section>
          <ContractSignature value={signature} onChange={setSignature} disabled={saving || readingSignature} onReadingChange={setReadingSignature} />
          {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t pt-5"><Link to="/shop/consignment" className="rounded-xl border px-4 py-2 text-sm font-semibold">Hủy</Link><button type="submit" value="preview" disabled={saving || generatingBarcode || readingImages || readingSignature || updatingCustomer || (!customer && !isGuest)} className="rounded-xl border border-pink-700 px-4 py-2 text-sm font-semibold text-pink-700 disabled:opacity-50">{saving && previewing ? 'Đang tạo bản xem trước...' : 'Xem trước PDF'}</button><button type="submit" value="create" disabled={saving || generatingBarcode || readingImages || readingSignature || updatingCustomer || (!customer && !isGuest)} className={button}>{saving && !previewing ? 'Đang tạo...' : readingSignature ? 'Đang đọc chữ ký...' : 'Tạo hợp đồng'}</button></div>
        </fieldset></form>}
      </>}
    </section>}
    <Modal open={Boolean(previewUrl)} onClose={() => setPreviewUrl('')} title="Xem trước hợp đồng" description="Bản xem trước chưa lưu hợp đồng. Hãy quay lại để ký hoặc chỉnh sửa nếu cần." className="max-w-[96rem]" footer={<button type="button" onClick={() => setPreviewUrl('')} className={button}>Quay lại ký / chỉnh sửa</button>}>
      {previewUrl && <><iframe src={`${previewUrl}#view=FitH`} title="Xem trước PDF hợp đồng" className="h-[60dvh] min-h-[18rem] w-full rounded-xl border border-border sm:h-[72dvh]" /><a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-highlight hover:underline">Mở bản xem trước trong thẻ mới</a></>}
    </Modal>
  </div></ContractPageLayout>;
}
