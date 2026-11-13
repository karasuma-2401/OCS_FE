import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import JsBarcode from 'jsbarcode';
import { Button, ErrorState, Modal, SkeletonLoading } from '@/components/shared';
import { apiClient } from '@/api/client';
import { parseProblemDetails } from '@/api/auth';
import type { BarcodeLabelProduct, BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice } from '@/api/products';
import { barcodeOptions, canEncodeBarcode } from './barcodeGeometry';
import { WordDocumentPreview } from './WordDocumentPreview';

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
    <p className="line-clamp-2 break-words font-bold leading-tight" title={item.name}>{item.name}</p><p className="font-semibold leading-tight">{formatVndPrice(item.listedPrice)}</p>
    <BarcodeSymbol value={item.barcode} className="min-h-0 w-full flex-1" /><p className="break-all text-center font-mono leading-none" style={{ fontSize: '6pt' }}>{item.barcode || 'Chưa có barcode'}</p>
  </div>;
}

export function BarcodePrintDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: BarcodeLabelProduct[] }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const ids = items.map(item => item.id).join(',');
  useEffect(() => {
    if (!open || !ids) return;
    let active = true; let objectUrl = '';
    const controller = new AbortController();
    setUrl(''); setError(''); setLoading(true);
    void apiClient.post<Blob>('/product-documents/preview', { productIds: ids.split(',') }, { responseType: 'blob', signal: controller.signal })
      .then(response => { if (active) { objectUrl = URL.createObjectURL(response.data); setUrl(objectUrl); } })
      .catch(async failure => {
        if (!active) return;
        if (axios.isAxiosError(failure) && failure.response?.data instanceof Blob) {
          try { failure.response.data = JSON.parse(await failure.response.data.text()); } catch { /* Keep original error. */ }
        }
        if (active) { const problem = parseProblemDetails(failure); setError(problem.detail || problem.title || 'Không thể tạo phiếu sản phẩm.'); }
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, ids, retry]);
  return <Modal open={open} onClose={onClose} title="Xem trước phiếu sản phẩm" description={`${items.length} sản phẩm · Mỗi sản phẩm trên một trang Word.`} className="max-w-[96rem]"
    footer={<><Button variant="outline" onClick={onClose}>Đóng</Button>{url && <a href={url} download="phieu-san-pham.docx" className="rounded-xl bg-button-pastel px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-button-pastel-hover">Tải Word</a>}</>}>
    {loading ? <SkeletonLoading variant="list" count={2} /> : error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : url ? <><p className="mb-3 text-sm text-muted">In thử ở tỷ lệ 100% và kiểm tra barcode bằng máy quét trước khi in hàng loạt. Bố cục xem trong trình duyệt có thể khác Word.</p><WordDocumentPreview url={url} showPrint /></> : <p className="text-sm text-muted">Chọn ít nhất một sản phẩm.</p>}
  </Modal>;
}
