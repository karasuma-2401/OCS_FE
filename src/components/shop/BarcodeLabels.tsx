import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import JsBarcode from 'jsbarcode';
import { Button, ErrorState, Modal, SkeletonLoading } from '@/components/shared';
import { apiClient } from '@/api/client';
import { parseProblemDetails } from '@/api/auth';
import type { BarcodeLabelProduct, BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice } from '@/api/products';
import { barcodeOptions, canEncodeBarcode } from './barcodeGeometry';

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
  const [wordUrl, setWordUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const ids = items.map(item => item.id).join(',');

  useEffect(() => {
    if (!open || !ids) return;
    let active = true;
    let objectUrl = '';
    let docxUrl = '';
    const controller = new AbortController();
    setUrl('');
    setWordUrl('');
    setError('');
    setLoading(true);

    void apiClient.post<Blob>('/product-documents/preview', { productIds: ids.split(',') }, { responseType: 'blob', signal: controller.signal })
      .then(response => {
        if (active) {
          objectUrl = URL.createObjectURL(response.data);
          setUrl(objectUrl);
        }
      })
      .catch(async failure => {
        if (!active) return;
        if (axios.isAxiosError(failure) && failure.response?.data instanceof Blob) {
          try { failure.response.data = JSON.parse(await failure.response.data.text()); } catch { /* Keep original error. */ }
        }
        if (active) {
          const problem = parseProblemDetails(failure);
          setError(problem.detail || problem.title || 'Không thể tạo phiếu sản phẩm.');
        }
      }).finally(() => { if (active) setLoading(false); });

    void apiClient.post<Blob>('/product-documents/word', { productIds: ids.split(',') }, { responseType: 'blob', signal: controller.signal })
      .then(response => {
        if (active) {
          docxUrl = URL.createObjectURL(response.data);
          setWordUrl(docxUrl);
        }
      })
      .catch(() => { /* Word download is secondary */ });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (docxUrl) URL.revokeObjectURL(docxUrl);
    };
  }, [open, ids, retry]);

  return <Modal open={open} onClose={onClose} title="Xem trước phiếu sản phẩm & Barcode" description={`${items.length} sản phẩm · Xem trước dưới dạng PDF theo mẫu Word.`} className="max-w-[96rem]"
    footer={<>
      <Button variant="outline" onClick={onClose}>Đóng</Button>
      {url && <Button variant="outline" onClick={() => frameRef.current?.contentWindow?.print()}>In tài liệu</Button>}
      {url && <a href={url} download="phieu-san-pham.pdf" className="rounded-xl bg-button-pastel px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-button-pastel-hover">Tải PDF</a>}
      {wordUrl && <a href={wordUrl} download="phieu-san-pham.docx" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle">Tải Word</a>}
    </>}>
    {loading ? <SkeletonLoading variant="list" count={2} /> : error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : url ? <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>Bản xem trước PDF chuẩn theo thông tin sản phẩm và barcode. Bạn có thể in trực tiếp hoặc tải tệp PDF / Word.</p>
        <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-brand-highlight hover:underline">Mở PDF trong thẻ mới</a>
      </div>
      <iframe ref={frameRef} src={`${url}#view=FitH`} title="Xem trước PDF phiếu sản phẩm & Barcode" className="h-[60dvh] min-h-[18rem] w-full rounded-xl border border-border sm:h-[72dvh]" />
    </> : <p className="text-sm text-muted">Chọn ít nhất một sản phẩm.</p>}
  </Modal>;
}
