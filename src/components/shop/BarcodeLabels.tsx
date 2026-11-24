import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';
import { Button, ErrorState, Modal, SkeletonLoading } from '@/components/shared';
import { barcodeApi, type BarcodeLabelProduct, type BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice } from '@/api/products';
import {
  BARCODE_GRID_GAP_MM,
  barcodeOptions,
  canEncodeBarcode,
  chunkBarcodePages,
  clampBarcodeCopies,
  estimateA4BarcodeLayout,
  expandBarcodeItems,
} from './barcodeGeometry';
import { Minus, Plus, Printer, Tag } from 'lucide-react';

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
          <span className="truncate max-w-[42%]" title={`Hãng: ${brandDisplay || 'OCS'}`}>
            HÃNG: {brandDisplay || 'OCS'}
          </span>
          <span className="shrink-0 text-gray-600 font-bold">
            SIZE: {sizeDisplay || '—'} · ĐỘ MỚI: {conditionDisplay || '—'}
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

export const DEFAULT_BARCODE_TEMPLATE: BarcodeLabelTemplate = {
  widthMm: 60,
  heightMm: 35,
  columns: 3,
  fontSizePt: 8,
  version: '00000000-0000-0000-0000-000000000000',
  updatedAt: null,
};

export interface BarcodePrintDialogProps {
  open: boolean;
  onClose: () => void;
  items: BarcodeLabelProduct[];
  copiesMap?: Record<string, number>;
  onCopiesChange?: (productId: string, copies: number) => void;
  templateOverride?: BarcodeLabelTemplate | null;
}

export function BarcodePrintDialog({
  open,
  onClose,
  items,
  copiesMap,
  onCopiesChange,
  templateOverride,
}: BarcodePrintDialogProps) {
  const [template, setTemplate] = useState<BarcodeLabelTemplate>(templateOverride || DEFAULT_BARCODE_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localCopies, setLocalCopies] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, number> = {};
    for (const item of items) {
      initial[item.id] = clampBarcodeCopies(copiesMap?.[item.id] ?? 1);
    }
    setLocalCopies(initial);
  }, [open, items, copiesMap]);

  useEffect(() => {
    if (open) {
      document.body.setAttribute('data-print-mode', 'barcode');
      return () => {
        document.body.removeAttribute('data-print-mode');
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (templateOverride) {
      setTemplate(templateOverride);
      setLoading(false);
      setError('');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    barcodeApi.getTemplate()
      .then(data => {
        if (active) setTemplate(data);
      })
      .catch(() => {
        if (active) setTemplate(DEFAULT_BARCODE_TEMPLATE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open, templateOverride]);

  const updateItemCopies = (productId: string, nextValue: number) => {
    const clamped = clampBarcodeCopies(nextValue);
    setLocalCopies(prev => ({ ...prev, [productId]: clamped }));
    onCopiesChange?.(productId, clamped);
  };

  const expandedLabels = useMemo(
    () => expandBarcodeItems(items, localCopies),
    [items, localCopies],
  );

  const layout = useMemo(
    () => estimateA4BarcodeLayout(expandedLabels.length, template),
    [expandedLabels.length, template],
  );

  const a4Pages = useMemo(
    () => chunkBarcodePages(expandedLabels, layout.labelsPerPage),
    [expandedLabels, layout.labelsPerPage],
  );

  const handlePrint = () => {
    window.print();
  };

  const descriptionText = items.length > 0
    ? `${items.length} sản phẩm · ${expandedLabels.length} tem nhãn · Ước tính ${layout.estimatedPages} trang A4`
    : 'In trực tiếp qua giao diện web chuẩn khổ giấy A4';

  return (
    <>
      {/* CSS @media print chuyên dụng cho tem barcode: đặt ngoài Modal để luôn áp dụng, ghi đè visibility:hidden từ các print CSS khác */}
      {open && (
        <style>{`
          #barcode-print-root {
            display: none;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            html:has(body[data-print-mode="barcode"]),
            body[data-print-mode="barcode"] {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              height: auto !important;
            }
            body[data-print-mode="barcode"] > *:not(#barcode-print-root) {
              display: none !important;
            }
            body[data-print-mode="barcode"] #barcode-print-root,
            body[data-print-mode="barcode"] #barcode-print-root * {
              visibility: visible !important;
            }
            body[data-print-mode="barcode"] #barcode-print-root {
              display: block !important;
              position: static !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            .barcode-print-sheet {
              display: grid !important;
              grid-template-columns: repeat(${template.columns}, ${template.widthMm}mm) !important;
              justify-content: center !important;
              gap: ${BARCODE_GRID_GAP_MM}mm !important;
              break-after: page;
              page-break-after: always;
            }
            .barcode-print-sheet:last-child {
              break-after: auto;
              page-break-after: auto;
            }
            .barcode-print-item {
              width: ${template.widthMm}mm !important;
              height: ${template.heightMm}mm !important;
              font-size: ${template.fontSizePt}pt !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
      )}

      <Modal
        open={open}
        onClose={onClose}
        title="In tem nhãn & Barcode sản phẩm"
        description={descriptionText}
        className="max-w-6xl"
        footerClassName="print:hidden"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">
              Khổ tem: {template.widthMm}mm × {template.heightMm}mm · {template.columns} tem/hàng · Tối đa {layout.labelsPerPage} tem/trang A4
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
              {expandedLabels.length > 0 && (
                <Button
                  variant="primary"
                  onClick={handlePrint}
                  disabled={loading}
                  startIcon={<Printer size={16} aria-hidden="true" />}
                >
                  In {expandedLabels.length} tem ({layout.estimatedPages} trang A4)
                </Button>
              )}
            </div>
          </div>
        }
      >

        {loading ? (
          <SkeletonLoading variant="list" count={3} />
        ) : error ? (
          <ErrorState description={error} />
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted">
            <Tag className="mx-auto mb-2 text-muted" size={32} aria-hidden="true" />
            <p className="font-semibold">Chưa có sản phẩm nào được chọn để in nhãn.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Thanh điều chỉnh nhanh số lượng bản sao cho từng sản phẩm */}
            <div className="rounded-xl border border-border bg-surface-subtle p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">
                  Số lượng tem cho từng sản phẩm ({items.length} sản phẩm)
                </span>
                <span className="font-semibold text-brand-ink">
                  Tổng: {expandedLabels.length} tem · {layout.estimatedPages} trang A4
                </span>
              </div>
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                {items.map(item => {
                  const qty = clampBarcodeCopies(localCopies[item.id] ?? 1);
                  return (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1 text-xs"
                    >
                      <span className="max-w-[160px] truncate font-medium text-ink" title={item.name}>
                        {item.name}
                      </span>
                      <div className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-surface-subtle px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateItemCopies(item.id, qty - 1)}
                          disabled={qty <= 1}
                          aria-label={`Giảm số bản in cho ${item.name}`}
                          className="rounded p-0.5 text-muted transition hover:bg-white hover:text-ink disabled:opacity-40"
                        >
                          <Minus size={12} aria-hidden="true" />
                        </button>
                        <span className="min-w-4 text-center font-bold tabular-nums text-ink">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateItemCopies(item.id, qty + 1)}
                          disabled={qty >= 50}
                          aria-label={`Tăng số bản in cho ${item.name}`}
                          className="rounded p-0.5 text-muted transition hover:bg-white hover:text-ink disabled:opacity-40"
                        >
                          <Plus size={12} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Khung xem trước từng trang A4 mô phỏng thực tế */}
            <div
              id="barcode-printable-area"
              className="max-h-[54vh] space-y-5 overflow-auto rounded-xl border border-border bg-slate-100/80 p-4"
            >
              {a4Pages.map((pageItems, pageIdx) => (
                <div key={pageIdx} className="mx-auto w-fit">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
                    <span>Trang {pageIdx + 1} / {a4Pages.length} (Khổ A4 · lề 8mm)</span>
                    <span>{pageItems.length} / {layout.labelsPerPage} tem</span>
                  </div>
                  <div
                    className="rounded-lg border border-border bg-white shadow-sm"
                    style={{ padding: '8mm' }}
                  >
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${template.columns}, ${template.widthMm}mm)`,
                        justifyContent: 'center',
                        gap: `${BARCODE_GRID_GAP_MM}mm`,
                      }}
                    >
                      {pageItems.map((item, idx) => (
                        <BarcodeLabel key={`${item.id}-${pageIdx}-${idx}`} item={item} template={template} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {open && expandedLabels.length > 0 && createPortal(
        <div id="barcode-print-root" aria-hidden="true">
          {a4Pages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className="barcode-print-sheet">
              {pageItems.map((item, idx) => (
                <BarcodeLabel key={`print-${item.id}-${pageIdx}-${idx}`} item={item} template={template} />
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
