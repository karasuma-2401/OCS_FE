import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getManagedTemplate, getSampleContractBackground, previewManagedTemplate, saveManagedTemplate, type ContractPdfFieldMapping, type ContractTemplate } from '@/api/contracts';
import { parseProblemDetails } from '@/api/auth';
import { Button, Card, Input, Modal, Select, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';

const fields = [
  ['contractNumber', 'Số hợp đồng'], ['signedAt', 'Ngày ký'], ['endsAt', 'Ngày kết thúc'], ['expiryHandling', 'Xử lý hết hạn'],
  ['employeeName', 'Tên nhân viên'], ['employeeTitle', 'Chức vụ'], ['employeePhone', 'Điện thoại nhân viên'],
  ['customerName', 'Tên khách hàng'], ['customerPhone', 'Điện thoại khách hàng'], ['customerEmail', 'Email khách hàng'],
  ['identityNumber', 'CCCD / giấy tờ'], ['address', 'Địa chỉ'], ['bankCode', 'Ngân hàng'],
  ['bankAccountNumber', 'Số tài khoản'], ['bankAccountHolder', 'Chủ tài khoản'], ['products', 'Danh sách sản phẩm'],
  ['terms', 'Điều khoản'], ['signature', 'Ảnh chữ ký khách hàng'],
] as const;
const samplePositions: [string, number][] = [['contractNumber', 20], ['signedAt', 23], ['endsAt', 26], ['employeeName', 31], ['employeeTitle', 34], ['employeePhone', 37], ['customerName', 42], ['customerPhone', 45], ['identityNumber', 48], ['address', 51], ['bankCode', 54], ['bankAccountNumber', 57], ['bankAccountHolder', 60]];
const textArea = 'mt-1.5 w-full rounded-xl border border-border bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-pink-focus focus:ring-2 focus:ring-brand-pink/25 disabled:opacity-70';

function readBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp PDF.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export function ContractTemplatePage() {
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [busy, setBusy] = useState<'load' | 'preview' | 'save' | 'sample' | ''>('load');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selected, setSelected] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    let active = true;
    getManagedTemplate().then(data => { if (active) setTemplate(data); }).catch(() => { if (active) setError('Không thể tải mẫu hợp đồng.'); }).finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, []);
  const change = (values: Partial<ContractTemplate>) => { setTemplate(current => current ? { ...current, ...values } : null); setNotice(''); };
  const changeMapping = (index: number, values: Partial<ContractPdfFieldMapping>) => {
    if (!template) return;
    change({ fieldMappings: template.fieldMappings.map((mapping, i) => i === index ? { ...mapping, ...values } : mapping) });
  };
  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf')) { setError('Chọn tệp PDF không quá 2 MB.'); return; }
    try { change({ pdfBase64: await readBase64(file), fieldMappings: [] }); setSelected(0); setError(''); setNotice('Đã chọn PDF mới. Hãy thêm vùng dữ liệu và xem thử trước khi lưu.'); }
    catch { setError('Không thể đọc tệp PDF.'); }
  };
  const useSample = async () => {
    setBusy('sample'); setError('');
    try {
      const pdf = await getSampleContractBackground();
      change({ pdfBase64: await readBase64(pdf), fieldMappings: [...samplePositions.map(([field, y]) => ({ field, page: 1, x: 35, y, width: 52, height: 2.8 })), { field: 'signature', page: 1, x: 60, y: 75, width: 30, height: 12 }] });
      setSelected(0); setNotice('Đã nạp mẫu tham khảo và vị trí gợi ý. Chọn Xem thử PDF để kiểm tra.');
    } catch { setError('Không thể tải mẫu tham khảo.'); } finally { setBusy(''); }
  };
  const downloadSample = async () => {
    setBusy('sample'); setError('');
    try {
      const url = URL.createObjectURL(await getSampleContractBackground());
      const link = document.createElement('a');
      link.href = url; link.download = 'mau-nen-hop-dong.pdf'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Không thể tải mẫu tham khảo.'); } finally { setBusy(''); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!template || busy) return;
    const preview = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'preview';
    setBusy(preview ? 'preview' : 'save'); setError(''); setNotice(''); setConflict(false);
    try {
      if (preview) { const pdf = await previewManagedTemplate(template); if (mounted.current) setPreviewUrl(URL.createObjectURL(pdf)); }
      else { const saved = await saveManagedTemplate(template); setTemplate(saved); setNotice('Đã lưu mẫu và điều khoản mặc định cho các hợp đồng mới.'); }
    } catch (err) { const problem = parseProblemDetails(err); setConflict(problem.code === 'CONTRACT_TEMPLATE.CHANGED'); setError(problem.detail || problem.title || 'Không thể xử lý yêu cầu.'); }
    finally { setBusy(''); }
  };
  const mapping = template?.fieldMappings[selected];
  return <ContractPageLayout title="Quản lý mẫu hợp đồng" description="Tải PDF nền, chọn vị trí điền dữ liệu và thiết lập điều khoản cho các hợp đồng mới." backTo="/shop/contracts" backLabel="Quản lý hợp đồng">
    {busy === 'load' ? <Card><SkeletonLoading variant="list" count={3} /></Card> : !template ? <Card><p role="alert" className="text-state-danger">{error}</p></Card> :
      <form onSubmit={event => void submit(event)} className="space-y-5">
        <fieldset disabled={Boolean(busy)} className="space-y-5">
          <Card title="1. Chọn mẫu PDF" description="Tải PDF do cửa hàng tự thiết kế hoặc dùng mẫu tham khảo. PDF cũ đã tạo không thay đổi.">
            <div className="flex flex-wrap items-end gap-3"><Input type="file" accept="application/pdf,.pdf" label="Tải PDF nền (tối đa 2 MB, 20 trang)" onChange={event => void loadFile(event.target.files?.[0])} /><Button variant="outline" onClick={() => void useSample()}>Dùng mẫu tham khảo</Button><Button variant="ghost" onClick={() => void downloadSample()}>Tải PDF mẫu</Button>{template.pdfBase64 && <Button variant="ghost" onClick={() => { change({ pdfBase64: null, fieldMappings: [] }); setNotice('Đã chuyển về mẫu hệ thống.'); }}>Bỏ PDF nền</Button>}</div>
            <p className="mt-3 text-sm text-muted">{template.pdfBase64 ? 'Đã chọn PDF nền. Các vùng dữ liệu sẽ được in đè lên PDF này.' : 'Chưa chọn PDF nền: hệ thống dùng mẫu mặc định.'} Các tệp PDF phải không có mật khẩu.</p>
          </Card>
          {template.pdfBase64 && <Card title="2. Vị trí thông tin" description="Chọn thông tin và nhập vị trí theo % kích thước trang. Góc trên bên trái là 0%, 0%.">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">{template.fieldMappings.map((item, index) => <Button key={index} variant={selected === index ? 'secondary' : 'outline'} size="sm" onClick={() => setSelected(index)}>{fields.find(([key]) => key === item.field)?.[1] || item.field} · {item.page}</Button>)}<Button variant="outline" size="sm" disabled={template.fieldMappings.length >= 40} onClick={() => { setSelected(template.fieldMappings.length); change({ fieldMappings: [...template.fieldMappings, { field: 'customerName', page: 1, x: 20, y: 20, width: 50, height: 5 }] }); }}>+ Thêm vùng</Button></div>
                {mapping ? <div className="space-y-4 rounded-xl border border-border bg-surface-subtle p-4">
                  <Select label="Thông tin cần điền" value={mapping.field} onChange={e => changeMapping(selected, { field: e.target.value })}>{fields.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</Select>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{([['page', 'Trang', 1], ['x', 'Trái (%)', 0], ['y', 'Trên (%)', 0], ['width', 'Rộng (%)', 0.1], ['height', 'Cao (%)', 0.1]] as const).map(([key, label, min]) => <Input key={key} label={label} type="number" min={min} max={key === 'page' ? 20 : 100} step={key === 'page' ? 1 : 0.1} required value={mapping[key]} onChange={e => changeMapping(selected, { [key]: e.target.valueAsNumber || 0 })} />)}</div>
                  <Button variant="ghost" size="sm" onClick={() => { change({ fieldMappings: template.fieldMappings.filter((_, i) => i !== selected) }); setSelected(Math.max(0, selected - 1)); }}>Xóa vùng này</Button>
                </div> : <p className="text-sm text-muted">Chưa có vùng nào. Chọn “Thêm vùng” để bắt đầu.</p>}
                <p className="text-sm text-muted">Sơ đồ chỉ minh họa vị trí, không hiển thị nền PDF. Dùng “Xem thử PDF” để đối chiếu chính xác. Nội dung quá dài có thể bị rút gọn trên mẫu; bản đầy đủ luôn nằm trong phụ lục.</p>
              </div>
              <div><p className="mb-2 text-xs font-bold uppercase text-muted">Sơ đồ trang {mapping?.page || 1}</p><div className="relative mx-auto aspect-[210/297] w-full max-w-[240px] overflow-hidden border border-border bg-paper shadow-sm">{template.fieldMappings.map((item, index) => item.page === (mapping?.page || 1) && <button type="button" key={index} aria-label={`Chọn vùng ${fields.find(([key]) => key === item.field)?.[1] || item.field}`} onClick={() => setSelected(index)} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%` }} className={`absolute overflow-hidden border text-left text-[8px] ${selected === index ? 'z-10 border-brand-highlight bg-brand-pink/70' : 'border-brand-lavender bg-brand-pink-light/70'}`}>{fields.find(([key]) => key === item.field)?.[1]}</button>)}</div></div>
            </div>
          </Card>}
          <Card title={`${template.pdfBase64 ? '3' : '2'}. Nội dung và điều khoản mặc định`} description="Điều khoản có thể được điều chỉnh khi lập từng hợp đồng.">
            <div className="grid gap-4 md:grid-cols-2"><Input label="Tên đơn vị / cửa hàng" maxLength={200} value={template.organizationName} onChange={e => change({ organizationName: e.target.value })} /><Input label="Tiêu đề mẫu hệ thống" required maxLength={200} value={template.title} onChange={e => change({ title: e.target.value })} /></div>
            <div className="mt-4 space-y-4"><label className="block text-xs font-bold uppercase text-ink">Nội dung đầu hợp đồng<textarea rows={3} className={textArea} maxLength={1000} value={template.headerText} onChange={e => change({ headerText: e.target.value })} /></label><label className="block text-xs font-bold uppercase text-ink">Điều khoản mặc định<textarea rows={8} className={textArea} maxLength={6000} value={template.defaultTerms} onChange={e => change({ defaultTerms: e.target.value })} /><span className="mt-1 block text-xs font-normal normal-case text-muted">{template.defaultTerms.length}/6000 ký tự</span></label><label className="block text-xs font-bold uppercase text-ink">Nội dung cuối hợp đồng<textarea rows={3} className={textArea} maxLength={1000} value={template.footerText} onChange={e => change({ footerText: e.target.value })} /></label></div>
          </Card>
          {error && <p role="alert" className="rounded-xl bg-state-danger-soft p-4 text-sm text-state-danger">{error}</p>}
          {conflict && <Button variant="outline" onClick={() => { void getManagedTemplate().then(data => { setTemplate(data); setConflict(false); setError(''); setNotice('Đã tải mẫu đang lưu.'); }).catch(() => setError('Không thể tải lại mẫu.')); }}>Tải mẫu đã lưu, bỏ thay đổi đang nhập</Button>}
          {notice && <p role="status" className="rounded-xl bg-state-success-soft p-4 text-sm text-state-success">{notice}</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button type="submit" value="preview" variant="outline">Xem thử PDF</Button><Button type="submit" value="save">Lưu mẫu</Button></div>
        </fieldset>
      </form>}
    <Modal open={Boolean(previewUrl)} onClose={() => setPreviewUrl('')} title="Xem thử mẫu PDF" description="Dữ liệu minh họa; mẫu chưa được lưu." className="max-w-4xl" footer={<Button onClick={() => setPreviewUrl('')}>Quay lại chỉnh sửa</Button>}>
      {previewUrl && <><iframe src={`${previewUrl}#view=FitH`} title="Xem thử mẫu PDF" className="h-[calc(100dvh-19rem)] min-h-[160px] max-h-[70dvh] w-full rounded-xl border border-border" /><a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-highlight hover:underline">Mở trong thẻ mới</a></>}
    </Modal>
  </ContractPageLayout>;
}
