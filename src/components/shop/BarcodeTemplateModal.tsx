import { useEffect, useState, type FormEvent } from 'react';
import { barcodeApi, type BarcodeLabelTemplate } from '@/api/barcode';
import { parseProblemDetails } from '@/api/auth';
import { Button, ErrorState, Input, Modal, SkeletonLoading } from '@/components/shared';
import { BarcodeLabel } from './BarcodeLabels';

const sample = { id: 'sample', name: 'Áo khoác denim', barcode: 'OCS-1234567890ABCDEF', listedPrice: 350000 };

export function BarcodeTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [template, setTemplate] = useState<BarcodeLabelTemplate | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    setTemplate(null); setError(''); setNotice('');
    barcodeApi.getTemplate().then(data => { if (active) setTemplate(data); }).catch(() => { if (active) setError('Không thể tải mẫu in barcode.'); });
    return () => { active = false; };
  }, [open, retry]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!template || saving) return;
    if (template.columns * template.widthMm + (template.columns - 1) * 3 > 198) { setError('Tổng chiều rộng các cột vượt quá vùng in A4.'); return; }
    setSaving(true); setError(''); setNotice('');
    try { setTemplate(await barcodeApi.saveTemplate(template)); setNotice('Đã lưu mẫu in cho toàn cửa hàng.'); }
    catch (error) { const problem = parseProblemDetails(error); setError(problem.detail || problem.title || 'Không thể lưu mẫu in.'); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title="Mẫu in barcode" description="Nhãn gồm tên sản phẩm, giá, mã vạch và mã định danh." className="max-w-3xl" disabled={saving} footer={<><Button variant="outline" onClick={onClose}>Đóng</Button><Button type="submit" form="barcode-template-form" disabled={!template} loading={saving}>Lưu mẫu</Button></>}>
    {!template ? error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : <SkeletonLoading variant="list" count={2} /> : <form id="barcode-template-form" onSubmit={event => void submit(event)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">{([['widthMm', 'Rộng (mm)', 40, 90], ['heightMm', 'Cao (mm)', 25, 60], ['columns', 'Số cột trên A4', 1, 4], ['fontSizePt', 'Cỡ chữ (pt)', 6, 12]] as const).map(([key, label, min, max]) => <Input key={key} type="number" required min={min} max={max} step={1} label={label} value={template[key]} onChange={event => setTemplate({ ...template, [key]: Number(event.target.value) })} />)}</div>
      <div className="rounded-xl bg-surface-subtle p-4"><p className="mb-3 text-xs font-bold uppercase text-muted">Nhãn minh họa</p><div className="overflow-auto"><BarcodeLabel item={sample} template={template} /></div></div>
      <p className="text-xs leading-5 text-muted">Các nhãn cách nhau 3 mm. In thử với tỷ lệ 100% và kiểm tra bằng máy quét trước khi in số lượng lớn.</p>
      {error && <div role="alert" className="text-sm text-state-danger">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Tải lại mẫu</button></div>}{notice && <p role="status" className="text-sm text-state-success">{notice}</p>}
    </form>}
  </Modal>;
}
