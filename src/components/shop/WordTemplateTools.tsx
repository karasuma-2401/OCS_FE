import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { parseProblemDetails } from '@/api/auth';
import { Button, Input, Modal } from '@/components/shared';
import { WordDocumentPreview } from './WordDocumentPreview';

type TemplateKind = 'contract' | 'product';

/** Download, check and save Word templates. */
export function WordTemplateTools({ kind }: { kind: TemplateKind }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [valid, setValid] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saved, setSaved] = useState<{ exists: boolean; version: string } | null>(null);
  const [fields, setFields] = useState<{ label: string; token: string }[]>([]);
  const refreshSaved = useCallback(async () => {
    try { setSaved((await apiClient.get<{ exists: boolean; version: string }>(`/word-template-samples/${kind}/saved`)).data); setErrors([]); }
    catch { setSaved(null); setErrors(['Không thể tải thông tin bản nháp Word.']); }
  }, [kind]);
  useEffect(() => { void refreshSaved(); }, [refreshSaved]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    let active = true;
    void apiClient.get<{ label: string; token: string }[]>(`/word-template-samples/${kind}/fields`).then(response => { if (active) setFields(response.data); }).catch(() => { if (active) setFields([]); });
    return () => { active = false; };
  }, [kind]);
  const download = async (savedCopy = false) => {
    setBusy(true); setErrors([]); setMessage('');
    try {
      const response = await apiClient.get<Blob>(`/word-template-samples/${kind}${savedCopy ? '/saved/download' : ''}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = kind === 'contract' ? 'mau-hop-dong.docx' : 'mau-thong-tin-san-pham.docx';
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setErrors(['Không thể tải mẫu Word. Vui lòng thử lại.']); }
    finally { setBusy(false); }
  };
  const validate = async (file: File | undefined) => {
    if (!file) return;
    setMessage(''); setErrors([]); setValid(false); setFile(file);
    if (!file.name.toLowerCase().endsWith('.docx') || file.size > 2 * 1024 * 1024) {
      setErrors(['Chọn tệp .docx không quá 2 MB.']); return;
    }
    setBusy(true);
    try {
      const data = new FormData(); data.append('file', file);
      const response = await apiClient.post<{ valid: boolean; errors: string[] }>(`/word-template-samples/${kind}/validate`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.valid) { setValid(true); setMessage('Các tham số hợp lệ. Bạn có thể lưu mẫu.'); }
      else setErrors(response.data.errors);
    } catch (error) {
      const problem = parseProblemDetails(error);
      setErrors([problem.detail || problem.title || 'Không thể kiểm tra mẫu Word.']);
    } finally { setBusy(false); }
  };
  const saveDraft = async () => {
    if (!file || !saved || !valid) return;
    setBusy(true); setErrors([]); setMessage('');
    try {
      const data = new FormData(); data.append('file', file); data.append('version', saved.version);
      setSaved((await apiClient.put<{ exists: boolean; version: string }>(`/word-template-samples/${kind}/saved`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data);
      setMessage(kind === 'contract' ? 'Đã lưu mẫu hợp đồng. Các hợp đồng mới sẽ dùng mẫu này.' : 'Đã lưu mẫu phiếu sản phẩm cho các lượt in tiếp theo.');
    } catch (error) {
      const problem = parseProblemDetails(error);
      setErrors([problem.detail || problem.title || 'Không thể lưu bản nháp. Nếu mẫu đã thay đổi, hãy tải lại thông tin trước khi lưu.']);
    } finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <p className="text-sm text-muted">Tải mẫu, chỉnh bố cục trong Word và giữ các tham số trong ngoặc vuông. Bạn có thể kiểm tra tệp đã chỉnh sửa tại đây.</p>
    <div className="flex flex-wrap items-end gap-3">
      <Button variant="outline" loading={busy} onClick={() => void download()}>Tải mẫu Word</Button>
      {saved?.exists && <Button variant="ghost" disabled={busy} onClick={() => void download(true)}>Tải mẫu đã lưu</Button>}
      <Input label="Kiểm tra mẫu đã chỉnh sửa" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy} onChange={event => { void validate(event.target.files?.[0]); event.target.value = ''; }} />
      <Button variant="outline" disabled={busy || !file || !valid} onClick={() => { if (file) setPreviewUrl(URL.createObjectURL(file)); }}>Xem mẫu Word</Button>
      <Button variant="secondary" disabled={busy || !saved || !valid} onClick={() => void saveDraft()}>Lưu và sử dụng</Button>
      {(!saved || errors.length > 0) && <Button variant="ghost" disabled={busy} onClick={() => void refreshSaved()}>Tải lại thông tin</Button>}
    </div>
    <p className="text-xs text-muted">{kind === 'contract' ? 'Hãy viết điều khoản của cửa hàng trong Word trước khi lưu. Mẫu mới dùng cho các hợp đồng tạo sau đó.' : 'Mỗi sản phẩm được tạo trên một trang theo bố cục và khổ giấy trong mẫu Word.'}</p>
    {fields.length > 0 && <details className="rounded-xl border border-border bg-surface-subtle p-4"><summary className="cursor-pointer text-sm font-bold text-ink">Danh sách tham số có thể chép vào Word</summary><p className="mt-2 text-xs text-muted">Chọn và sao chép nguyên tham số, kể cả dấu ngoặc vuông.</p><div className="mt-3 flex flex-wrap gap-2">{fields.map(field => <code key={field.token} className="select-all rounded-lg border border-border bg-paper px-2 py-1 text-xs text-ink">{field.token}</code>)}</div></details>}
    {message && <p role="status" className="text-sm text-state-success">{message}</p>}
    {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-state-danger">{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>}
    {kind === 'product' && previewUrl && <div className="space-y-2"><p className="text-sm text-muted">Đây là mẫu chứa tham số; bố cục xem trong trình duyệt có thể khác Word.</p><WordDocumentPreview url={previewUrl} /><Button variant="ghost" onClick={() => setPreviewUrl('')}>Đóng xem mẫu</Button></div>}
    <Modal open={kind === 'contract' && Boolean(previewUrl)} onClose={() => setPreviewUrl('')} title="Xem mẫu Word" description="Đây là mẫu chứa tham số; bản xem trong trình duyệt có thể khác Word." className="max-w-[96rem]" footer={<Button onClick={() => setPreviewUrl('')}>Đóng</Button>}>
      {previewUrl && <WordDocumentPreview url={previewUrl} />}
    </Modal>
  </div>;
}
