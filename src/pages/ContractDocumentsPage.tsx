import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FileCog, FileText } from 'lucide-react';
import { barcodeApi, type BarcodeLabelProduct } from '@/api/barcode';
import { BarcodePrintDialog } from '@/components/shop/BarcodeLabels';
import { getContractDocument, listContracts, type ContractListItem } from '@/api/contracts';
import { WordDocumentPreview } from '@/components/shop/WordDocumentPreview';
import { ContractTermsRequestsPanel } from '@/components/shop/ContractTermsRequestsPanel';
import { contractLoadError } from '@/api/contractErrors';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, ErrorState, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';

export function ContractListPage() {
  const { hasRole } = useAuth();
  const permitted = hasRole('Admin') || hasRole('Manager');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!permitted) return;
    let active = true;
    setLoading(true); setError('');
    listContracts(page).then(data => { if (active) setItems(data); }).catch(() => { if (active) setError('Không thể tải danh sách hợp đồng.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, permitted, retry]);
  if (!permitted) return <Navigate to="/unauthorized" replace />;
  return <ContractPageLayout title="Quản lý hợp đồng" description="Tra cứu hợp đồng đã lập và quản lý mẫu Word của cửa hàng.">
    <Card title="Danh sách hợp đồng" description="Xem các hợp đồng đã được lập tại cửa hàng." actions={<Link to="/shop/contracts/template" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-lavender bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-pink-light focus-visible:outline-2 focus-visible:outline-brand-pink-focus"><FileCog size={16} aria-hidden="true" />Quản lý mẫu Word</Link>}>
      {loading ? <SkeletonLoading variant="list" count={3} /> : error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : items.length === 0 ? <div className="py-12 text-center"><FileText className="mx-auto mb-3 text-brand-highlight" size={28} aria-hidden="true" /><p className="font-bold text-ink">Chưa có hợp đồng ở trang này</p><p className="mt-1 text-sm text-muted">Các hợp đồng được tạo sẽ xuất hiện tại đây.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-brand-pink-surface text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Mã hợp đồng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Ngày ký</th><th className="px-4 py-3">Tài liệu</th></tr></thead><tbody className="divide-y divide-border">{items.map(item => <tr key={item.id} className="hover:bg-brand-pink-surface/40"><td className="break-all px-4 py-4 font-bold text-ink">{item.contractNumber}</td><td className="px-4 py-4">{item.customerName || 'Chưa có thông tin khách'}</td><td className="px-4 py-4">{new Date(item.signedAt).toLocaleString('vi-VN')}</td><td className="px-4 py-4">{item.hasPdf ? <Link className="font-semibold text-brand-highlight hover:underline" to={`/shop/contracts/${item.id}`}>Xem tài liệu</Link> : <span className="text-muted">Chưa có tài liệu</span>}</td></tr>)}</tbody></table></div>}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4"><Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Trang trước</Button><span className="text-sm text-muted">Trang {page}</span><Button variant="outline" size="sm" disabled={items.length < 20 || loading} onClick={() => setPage(page + 1)}>Trang sau</Button></div>
    </Card>
    <ContractTermsRequestsPanel />
  </ContractPageLayout>;
}

export function ContractPdfPage() {
  const { id = '' } = useParams();
  const { hasPermission, hasRole } = useAuth();
  const canManage = hasRole('Admin') || hasRole('Manager');
  const permitted = canManage || (hasPermission('appointments.staff.reception') && hasPermission('customers.read'));
  const [url, setUrl] = useState('');
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [labels, setLabels] = useState<BarcodeLabelProduct[] | null>(null);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState('');
  useEffect(() => {
    if (!permitted || !id) return;
    let active = true; let objectUrl = '';
    setUrl(''); setError('');
    getContractDocument(id).then(blob => { if (!active) return; objectUrl = URL.createObjectURL(blob); setIsPdf(blob.type === 'application/pdf'); setUrl(objectUrl); }).catch(err => { if (active) setError(contractLoadError('Tài liệu hợp đồng', err)); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, permitted, retry]);
  if (!permitted) return <Navigate to="/unauthorized" replace />;
  return <ContractPageLayout wide title="Tài liệu hợp đồng" description="Xem và tải tài liệu hợp đồng đã lưu." backTo={canManage ? '/shop/contracts' : '/shop/consignment'} backLabel={canManage ? 'Quản lý hợp đồng' : 'Tiếp nhận ký gửi'}>
    <Card>{error ? <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} /> : url ? <><div className="mb-4 flex flex-wrap gap-3"><a href={url} download={`hop-dong-${id}.${isPdf ? 'pdf' : 'docx'}`} className="rounded-xl bg-button-pastel px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-button-pastel-hover">Tải {isPdf ? 'PDF' : 'Word'}</a><a href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-brand-lavender px-4 py-2.5 text-sm font-bold text-brand-ink hover:bg-brand-pink-light">Mở trong thẻ mới</a><Button variant="outline" loading={labelsLoading} onClick={() => { setLabelsLoading(true); setLabelsError(''); void barcodeApi.contractProducts(id).then(setLabels).catch(() => setLabelsError('Không thể tải sản phẩm để in barcode.')).finally(() => setLabelsLoading(false)); }}>In barcode sản phẩm</Button></div>{labelsError && <p role="alert" className="mb-3 text-sm text-state-danger">{labelsError}</p>}{isPdf ? <iframe src={`${url}#view=FitH`} title="PDF hợp đồng" className="h-[65dvh] min-h-[20rem] w-full rounded-xl border border-border lg:h-[calc(100dvh-12rem)] lg:min-h-[38rem]" /> : <WordDocumentPreview url={url} />}</> : <SkeletonLoading variant="list" count={3} />}</Card>
    <BarcodePrintDialog open={labels !== null} items={labels || []} onClose={() => setLabels(null)} />
  </ContractPageLayout>;
}
