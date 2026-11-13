import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Button, ErrorState, Modal, SkeletonLoading } from '@/components/shared';
import { barcodeApi, type BarcodeLabelProduct, type BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice } from '@/api/products';
import { barcodeModuleWidthMm, barcodeOptions, canEncodeBarcode } from './barcodeGeometry';

function drawBarcode(svg: SVGSVGElement, value: string) {
  JsBarcode(svg, value, barcodeOptions);
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.removeAttribute('width'); svg.removeAttribute('height');
}

export function BarcodeSymbol({ value, className = '' }: { value: string; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => { if (svg.current && canEncodeBarcode(value)) drawBarcode(svg.current, value); }, [value]);
  return canEncodeBarcode(value) ? <svg ref={svg} role="img" aria-label={`Barcode ${value}`} className={className} /> : <span className="text-state-danger">Mã không hỗ trợ Code 128</span>;
}

export function BarcodeLabel({ item, template }: { item: BarcodeLabelProduct; template: BarcodeLabelTemplate }) {
  return <div className="flex shrink-0 flex-col overflow-hidden border border-border bg-white p-1 text-black" style={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm`, fontSize: `${template.fontSizePt}pt` }}>
    <p className="line-clamp-2 break-words font-bold leading-tight" title={item.name}>{item.name}</p>
    <p className="font-semibold leading-tight">{formatVndPrice(item.listedPrice)}</p>
    <BarcodeSymbol value={item.barcode} className="min-h-0 w-full flex-1" />
    <p className="break-all text-center font-mono leading-none" style={{ fontSize: '6pt' }}>{item.barcode || 'Chưa có barcode'}</p>
  </div>;
}

function printLabels(items: BarcodeLabelProduct[], template: BarcodeLabelTemplate): boolean {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) return false;
  const document = popup.document;
  document.title = 'In nhãn barcode';
  const style = document.createElement('style');
  style.textContent = `@page{size:A4;margin:6mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.sheet{display:grid;grid-template-columns:repeat(${template.columns},${template.widthMm}mm);gap:3mm;align-content:start}.label{width:${template.widthMm}mm;height:${template.heightMm}mm;border:.2mm solid #bbb;padding:1mm;overflow:hidden;display:flex;flex-direction:column;font-size:${template.fontSizePt}pt}.name{font-weight:bold;line-height:1.1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}.price{font-weight:bold;line-height:1.1}.code{font-family:monospace;text-align:center;line-height:1;font-size:6pt;overflow-wrap:anywhere}.label svg{display:block;min-height:0;width:100%;flex:1}@media print{.label{break-inside:avoid}}`;
  document.head.append(style);
  const sheet = document.createElement('main'); sheet.className = 'sheet'; document.body.append(sheet);
  for (const item of items) {
    const label = document.createElement('section'); label.className = 'label';
    const name = document.createElement('div'); name.className = 'name'; name.textContent = item.name;
    const price = document.createElement('div'); price.className = 'price'; price.textContent = formatVndPrice(item.listedPrice);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); drawBarcode(svg, item.barcode);
    const code = document.createElement('div'); code.className = 'code'; code.textContent = item.barcode;
    label.append(name, price, svg, code); sheet.append(label);
  }
  popup.focus(); popup.print();
  return true;
}

export function BarcodePrintDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: BarcodeLabelProduct[] }) {
  const [template, setTemplate] = useState<BarcodeLabelTemplate | null>(null);
  const [error, setError] = useState('');
  const [printError, setPrintError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setTemplate(null); setError(''); setPrintError('');
    barcodeApi.getTemplate().then(data => { if (active) setTemplate(data); }).catch(() => { if (active) setError('Không thể tải mẫu in barcode.'); });
    return () => { active = false; };
  }, [open, retry]);
  const invalid = items.filter(item => !canEncodeBarcode(item.barcode));
  const narrow = template ? items.filter(item => canEncodeBarcode(item.barcode) && barcodeModuleWidthMm(item.barcode, template.widthMm) < 0.254).length : 0;
  return <Modal open={open} onClose={onClose} title="Xem trước nhãn barcode" description={`${items.length} sản phẩm · In trên giấy A4 theo mẫu cửa hàng.`} className="max-w-5xl" error={printError} footer={<><Button variant="outline" onClick={onClose}>Đóng</Button><Button disabled={!template || !items.length || invalid.length > 0} onClick={() => { setPrintError(''); if (template && !printLabels(items, template)) setPrintError('Trình duyệt đã chặn cửa sổ in. Hãy cho phép cửa sổ bật lên và thử lại.'); }}>In nhãn</Button></>}>
    {error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : !template ? <SkeletonLoading variant="list" count={2} /> : <div className="space-y-3"><p className="text-sm text-muted">Kiểm tra máy in và chọn tỷ lệ 100% / kích thước thực. Tên dài có thể được rút gọn trên nhãn; nên thử quét một nhãn trước khi in hàng loạt.</p>{invalid.length > 0 && <p role="alert" className="text-sm text-state-danger">Có {invalid.length} sản phẩm chưa có mã hoặc chứa ký tự không hỗ trợ Code 128; không thể in những nhãn này.</p>}{narrow > 0 && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{narrow} mã có vạch nhỏ, có thể khó quét khi in. Hãy nhờ quản lý tăng chiều rộng nhãn hoặc giảm số cột, rồi in và quét thử ở tỷ lệ 100%.</p>}<div className="max-h-[55vh] overflow-auto rounded-xl bg-surface-subtle p-4"><div style={{ display: 'grid', gridTemplateColumns: `repeat(${template.columns}, ${template.widthMm}mm)`, gap: '3mm', width: 'fit-content' }}>{items.map(item => <BarcodeLabel key={item.id} item={item} template={template} />)}</div></div></div>}
  </Modal>;
}
