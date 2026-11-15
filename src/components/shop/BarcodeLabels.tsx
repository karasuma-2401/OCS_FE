import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Button, ErrorState, Modal, SkeletonLoading } from '@/components/shared';
import { barcodeApi, type BarcodeLabelProduct, type BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice } from '@/api/products';
import { barcodeOptions, canEncodeBarcode } from './barcodeGeometry';
import { Printer, Tag } from 'lucide-react';

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
  const brandDisplay = (item.brand || '').trim();
  const sizeDisplay = (item.size || '').trim();
  const rawCondition = (item.condition || '').trim();
  const conditionDisplay = rawCondition
    ? /^\d+$/.test(rawCondition)
      ? `${rawCondition}%`
      : rawCondition
    : '';

  const basePt = template.fontSizePt || 8;
  const headerPt = Math.max(Math.round(basePt * 0.8), 6);
  const barcodePt = Math.max(Math.round(basePt * 0.75), 6);

  const rightParts = [
    sizeDisplay ? `SIZE: ${sizeDisplay}` : null,
    conditionDisplay ? `ĐỘ MỚI: ${conditionDisplay}` : null,
  ].filter(Boolean);
  const rightText = rightParts.length > 0 ? rightParts.join(' · ') : 'CHÍNH HÃNG';

  return (
    <div
      className="barcode-print-item flex shrink-0 flex-col justify-between overflow-hidden border border-gray-400 bg-white p-2 text-black select-none"
      style={{
        width: `${template.widthMm}mm`,
        height: `${template.heightMm}mm`,
        fontSize: `${basePt}pt`,
        boxSizing: 'border-box',
      }}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Hàng tiêu đề: Hãng (Brand) bên trái, Size & Độ mới bên phải */}
        <div
          className="flex items-center justify-between border-b border-gray-300 pb-0.5 font-bold tracking-tight uppercase text-gray-700"
          style={{ fontSize: `${headerPt}pt` }}
        >
          <span className="truncate max-w-[48%]" title={brandDisplay ? `Hãng: ${brandDisplay}` : 'OCS FASHION'}>
            {brandDisplay ? `HÃNG: ${brandDisplay}` : 'OCS FASHION'}
          </span>
          <span className="shrink-0 text-gray-600 font-bold">
            {rightText}
          </span>
        </div>

        {/* Tên sản phẩm */}
        <p
          className="mt-0.5 line-clamp-2 font-bold leading-tight text-gray-900"
          title={item.name}
          style={{ fontSize: `${basePt}pt` }}
        >
          {item.name}
        </p>

        {/* Giá niêm yết */}
        <p
          className="font-extrabold text-black leading-tight"
          style={{ fontSize: `${Math.round(basePt * 1.05)}pt` }}
        >
          {formatVndPrice(item.listedPrice)}
        </p>
      </div>

      {/* Barcode Code 128 */}
      <div className="flex min-h-0 flex-col items-center justify-center pt-0.5">
        <BarcodeSymbol value={item.barcode} className="h-6.5 w-full max-w-[96%]" />
        <p
          className="break-all text-center font-mono leading-none tracking-wider text-gray-800"
          style={{ fontSize: `${barcodePt}pt` }}
        >
          {item.barcode || 'Chưa có barcode'}
        </p>
      </div>
    </div>
  );
}

const DEFAULT_TEMPLATE: BarcodeLabelTemplate = {
  widthMm: 65,
  heightMm: 35,
  columns: 2,
  fontSizePt: 8,
  version: '00000000-0000-0000-0000-000000000000',
  updatedAt: null,
};

export function BarcodePrintDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: BarcodeLabelProduct[] }) {
  const [template, setTemplate] = useState<BarcodeLabelTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');

    barcodeApi.getTemplate()
      .then(data => {
        if (active) setTemplate(data);
      })
      .catch(() => {
        if (active) setTemplate(DEFAULT_TEMPLATE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="In tem nhãn & Barcode sản phẩm"
      description={`${items.length} sản phẩm · In trực tiếp qua giao diện web chuẩn khổ giấy A4`}
      className="max-w-6xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-muted">
            Khổ tem: {template.widthMm}mm × {template.heightMm}mm · {template.columns} tem/hàng · Khổ A4
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            {items.length > 0 && (
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={loading}
                className="gap-2"
              >
                <Printer size={16} /> In tem barcode (Web)
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* CSS @media print chuyên dụng cho tem barcode */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #barcode-printable-area, #barcode-printable-area * {
            visibility: visible !important;
          }
          #barcode-printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            display: grid !important;
            justify-content: center !important;
            gap: 3mm !important;
          }
          .barcode-print-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {loading ? (
        <SkeletonLoading variant="list" count={3} />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted">
          <Tag className="mx-auto mb-2 text-muted" size={32} />
          <p className="font-semibold">Chưa có sản phẩm nào được chọn để in nhãn.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-subtle px-4 py-2 text-xs text-muted">
            <span>
              Xem trước bố cục in web ({template.columns} cột trên trang A4).
            </span>
            <span className="font-semibold text-brand-ink">
              Tổng cộng: {items.length} nhãn in
            </span>
          </div>

          <div
            id="barcode-printable-area"
            className="grid max-h-[60vh] gap-3 overflow-y-auto rounded-xl border border-border bg-slate-50 p-4 print:max-h-none print:border-none print:bg-white print:p-0"
            style={{
              gridTemplateColumns: `repeat(${template.columns}, ${template.widthMm}mm)`,
              justifyContent: 'center',
            }}
          >
            {items.map((item, idx) => (
              <BarcodeLabel key={item.id || idx} item={item} template={template} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
