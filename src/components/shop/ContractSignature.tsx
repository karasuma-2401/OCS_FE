import { useRef, useState, type PointerEvent } from 'react';
import type { ContractImage } from '@/api/contracts';

interface Props { value: ContractImage | null; onChange: (value: ContractImage | null) => void; disabled: boolean; onReadingChange: (reading: boolean) => void }

export function ContractSignature({ value, onChange, disabled, onReadingChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * event.currentTarget.width / rect.width, y: (event.clientY - rect.top) * event.currentTarget.height / rect.height };
  };
  const clear = () => {
    const el = canvas.current;
    el?.getContext('2d')?.clearRect(0, 0, el.width, el.height);
    setUploaded(false); setError(''); onChange(null);
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (uploaded) clear();
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    ctx.strokeStyle = '#171717'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y + 0.01); ctx.stroke();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext('2d'); if (!ctx) return;
    const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const finish = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    const data = event.currentTarget.toDataURL('image/png').split(',')[1];
    onChange({ contentType: 'image/png', data });
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size === 0 || file.size > 512 * 1024) { setError('Chọn ảnh PNG hoặc JPEG tối đa 512 KB.'); return; }
    onReadingChange(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') { setError('Không thể đọc ảnh chữ ký.'); onReadingChange(false); return; }
      const image = new Image();
      image.onload = () => {
        if (image.width > 3000 || image.height > 3000 || !image.width || !image.height) { setError('Kích thước ảnh tối đa 3000 × 3000 pixel.'); onReadingChange(false); return; }
        canvas.current?.getContext('2d')?.clearRect(0, 0, 800, 250);
        setError(''); setUploaded(true); onChange({ contentType: file.type, data: (reader.result as string).split(',')[1] });
        onReadingChange(false);
      };
      image.onerror = () => { setError('Không thể đọc ảnh chữ ký.'); onReadingChange(false); };
      image.src = reader.result;
    };
    reader.onerror = () => { setError('Không thể đọc ảnh chữ ký.'); onReadingChange(false); };
    reader.readAsDataURL(file);
  };
  return <section><h2 className="text-lg font-bold">Chữ ký khách hàng</h2><p className="mt-1 text-sm text-gray-600">Ký trực tiếp bằng chuột hoặc màn hình cảm ứng, hoặc chọn ảnh chữ ký. Ảnh sẽ được chèn vào PDF.</p>
    <canvas ref={canvas} width={800} height={250} aria-label="Vùng ký tên khách hàng" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} className="mt-3 h-40 w-full touch-none rounded-xl border border-gray-300 bg-white" />
    {uploaded && value && <img src={`data:${value.contentType};base64,${value.data}`} alt="Ảnh chữ ký đã chọn" className="mt-3 max-h-28 max-w-full rounded border object-contain p-2" />}
    <div className="mt-3 flex flex-wrap items-center gap-4"><label className="text-sm font-semibold">Chọn ảnh chữ ký<input type="file" accept="image/png,image/jpeg" disabled={disabled} className="ml-2 text-sm" onChange={e => { upload(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} /></label><button type="button" disabled={disabled || !value} onClick={clear} className="text-sm text-red-700 underline disabled:opacity-50">Xóa chữ ký</button>{value && <span className="text-sm text-green-700">Đã có chữ ký</span>}</div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}<p className="mt-2 text-xs text-gray-500">Ảnh tối đa 512 KB. Đây là ảnh chữ ký, không phải chữ ký số.</p>
  </section>;
}
