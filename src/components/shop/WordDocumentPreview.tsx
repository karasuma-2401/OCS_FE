import { useEffect, useRef, useState } from 'react';

/** Render locally inside a script-disabled frame; the original Word file remains available to download. */
export function WordDocumentPreview({ url, showPrint = false }: { url: string; showPrint?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ready || !url) return;
    let active = true;
    const element = frame.current?.contentDocument?.body;
    if (!element) { setError('Không thể mở bản xem trước Word.'); return; }
    setError('');
    void fetch(url).then(response => {
      if (!response.ok) throw new Error('Không thể đọc tài liệu.');
      return response.blob();
    }).then(async blob => {
      const { renderAsync } = await import('docx-preview');
      if (active) await renderAsync(blob, element, element, { renderAltChunks: false, useBase64URL: true });
    })
      .catch(() => { if (active) setError('Không thể xem trực tiếp. Hãy tải tài liệu Word để mở.'); });
    return () => { active = false; };
  }, [url, ready]);
  return <div>
    {error && <p role="alert" className="mb-2 text-sm text-state-danger">{error}</p>}
    {showPrint && <button type="button" onClick={() => frame.current?.contentWindow?.print()} className="mb-3 rounded-xl bg-button-pastel px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-button-pastel-hover">In tài liệu</button>}
    <iframe ref={frame} title="Xem trước tài liệu Word" sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)}
      srcDoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>body{margin:0;background:#f3f4f6}.docx-wrapper{padding:12px!important}@media(max-width:700px){.docx-wrapper{padding:4px!important;align-items:flex-start!important}}</style></head><body></body></html>"
      className="h-[60dvh] min-h-[18rem] w-full rounded-xl border border-border sm:h-[72dvh]" />
  </div>;
}
