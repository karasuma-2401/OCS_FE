import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Download, FileText, Package, Search } from 'lucide-react';
import { getConsignmentDocument, getConsignmentProductDetail, getConsignmentProductImage, type Consignment, type ConsignmentProduct, type ConsignmentProductDetail } from '@/api/consignments';
import { ProductImageGallery, type ProductGalleryImage } from '@/components/customer/ProductImageGallery';
import { AlertBanner, Badge, Button, Card, EmptyState, ErrorState, Input, Loading, Modal, Pagination, Skeleton, SkeletonLoading, Table, TableDetailButton, type BadgeVariant, type TableColumn } from '@/components/shared';
import { settlementsApi, type Payout } from '@/api/settlements';

const PRODUCTS_PER_PAGE = 5;
const productStatuses: Record<string, [string, BadgeVariant]> = {
  PendingProcessing: ['Chờ xử lý', 'warning'], OnSale: ['Đang bán', 'info'], Sold: ['Đã bán', 'success'], IncidentPending: ['Đang xác minh sự cố', 'warning'],
  Expired: ['Hết hạn, chờ xử lý', 'warning'], Donated: ['Đã quyên góp', 'neutral'], Returned: ['Đã trả lại', 'neutral'],
  EarlyWithdrawn: ['Đã rút trước hạn', 'neutral'], Compensated: ['Đã bồi thường', 'success'], Cancelled: ['Đã hủy', 'danger'],
};
const contractStatuses: Record<string, [string, BadgeVariant]> = {
  Active: ['Đang hiệu lực', 'success'], Completed: ['Đã hoàn tất', 'info'], Cancelled: ['Đã hủy', 'danger'],
};
const money = (value: number | null) => value == null ? 'Chưa có thông tin' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} ₫`;
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN');
};
function Status({ value, labels }: { value: string; labels: Record<string, [string, BadgeVariant]> }) {
  const [label, variant] = labels[value] ?? [value || 'Chưa có thông tin', 'neutral'];
  return <Badge variant={variant}>{label}</Badge>;
}

function ProductDetailSkeleton() {
  return <div role="status" aria-live="polite" aria-busy="true" className="space-y-5">
    <span className="sr-only">Đang tải thông tin và ảnh sản phẩm...</span>
    <div className="rounded-xl bg-brand-pink-surface p-4" aria-hidden="true"><Skeleton className="h-3 w-28" /><Skeleton className="mt-3 h-7 w-2/3" /><Skeleton className="mt-3 h-4 w-40" /></div>
    <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-xl border border-border bg-paper p-4"><Skeleton className="h-3 w-3/4" /><Skeleton className="mt-3 h-6 w-2/3" /></div>)}</div>
    <Skeleton className="h-3 w-4/5" />
    <div className="rounded-xl border border-border bg-paper p-4" aria-hidden="true"><Skeleton className="h-5 w-40" /><div className="mt-4 grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-5 w-32" /></div>)}</div><div className="mt-5 border-t border-border pt-4"><Skeleton className="mb-3 h-5 w-32" /><Skeleton className="h-[clamp(190px,36vh,300px)] w-full" /></div></div>
  </div>;
}

const productColumns: TableColumn<ConsignmentProduct>[] = [
  { key: 'name', header: 'Sản phẩm', render: product => <div><p className="font-bold text-brand-ink">{product.name}</p><p className="mt-0.5 text-xs text-muted">{product.barcode}</p></div> },
  { key: 'status', header: 'Trạng thái', render: product => <div><Status value={product.status} labels={productStatuses} />{product.handledAt && <p className="mt-1 text-xs text-muted">Xử lý: {date(product.handledAt)}</p>}</div> },
  { key: 'listedPrice', header: 'Giá niêm yết', render: product => money(product.listedPrice), cellClassName: 'whitespace-nowrap' },
  { key: 'commission', header: 'Hoa hồng', render: product => product.agreedCommissionRate == null ? 'Chưa có thông tin' : `${product.agreedCommissionRate}%` },
  { key: 'estimatedPayout', header: 'Dự kiến nhận', render: product => <strong className="whitespace-nowrap text-brand-highlight">{money(product.estimatedPayout)}</strong> },
];

export function ConsignmentDetailsModal({ item, onClose }: { item: Consignment | null; onClose: () => void }) {
  const [mode, setMode] = useState<'details' | 'document' | 'product'>('details');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<ConsignmentProductDetail | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState(false);
  const [productRetryKey, setProductRetryKey] = useState(0);
  const [galleryImages, setGalleryImages] = useState<ProductGalleryImage[]>([]);
  const [imagesError, setImagesError] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const filteredProducts = useMemo(() => (item?.products ?? []).filter(product =>
    `${product.name} ${product.barcode}`.toLocaleLowerCase('vi-VN').includes(productQuery.trim().toLocaleLowerCase('vi-VN')),
  ), [item, productQuery]);
  const productPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const visibleProducts = filteredProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
  const selectedProduct = item?.products.find(product => product.id === selectedProductId) ?? null;
  const columns: TableColumn<ConsignmentProduct>[] = [...productColumns, { key: 'action', header: 'Thao tác', render: product => <TableDetailButton onClick={() => { setProductLoading(true); setProductDetail(null); setGalleryImages([]); setSelectedProductId(product.id); setMode('product'); }} /> }];

  useEffect(() => {
    if (mode !== 'document' || !item?.contractDocument) return;
    let active = true;
    let objectUrl: string | null = null;
    setDocumentLoading(true);
    setDocumentError(false);
    setDocumentUrl(null);
    getConsignmentDocument(item.contractId).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setDocumentUrl(objectUrl);
    }).catch(() => { if (active) setDocumentError(true); }).finally(() => { if (active) setDocumentLoading(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item, mode, retryKey]);

  useEffect(() => {
    if (mode !== 'product' || !item || !selectedProduct) return;
    let active = true;
    const objectUrls: string[] = [];
    setProductLoading(true);
    setProductError(false);
    setImagesError(false);
    setProductDetail(null);
    setGalleryImages([]);
    const loadProduct = async () => {
      try {
        const data = await getConsignmentProductDetail(item.contractId, selectedProduct.id);
        const results = await Promise.allSettled(data.imageUrls.map(getConsignmentProductImage));
        if (!active) return;
        const images = results.flatMap((result, index) => {
          if (result.status !== 'fulfilled') return [];
          const src = URL.createObjectURL(result.value);
          objectUrls.push(src);
          return [{ src, label: `Ảnh ${index + 1}` }];
        });
        setGalleryImages(images);
        setImagesError(data.imageUrls.length > 0 && images.length === 0);
        setProductDetail(data);
      } catch { if (active) setProductError(true); }
      finally { if (active) setProductLoading(false); }
    };
    void loadProduct();
    return () => { active = false; objectUrls.forEach(URL.revokeObjectURL); };
  }, [item, mode, selectedProduct, productRetryKey]);

  if (!item) return null;
  const document = item.contractDocument;
  const expiryHandling = ({ Return: 'Trả lại', Donate: 'Quyên góp' } as Record<string, string>)[item.expiryHandling] ?? (item.expiryHandling || 'Chưa có thông tin');
  return <div className="[&_h2]:!mt-0 [&_h2]:!text-lg [&_h2]:!leading-normal [&_h2]:!tracking-normal">
    <Modal open onClose={onClose} className="!w-[calc(100vw-2rem)] !max-w-[800px] max-h-[90vh] overflow-y-auto [&>header]:sticky [&>header]:top-0 [&>header]:z-10" title={mode === 'document' ? `Tệp hợp đồng ${item.contractNumber}` : mode === 'product' ? `Sản phẩm ${selectedProduct?.barcode ?? ''}` : `Chi tiết hợp đồng ${item.contractNumber}`} description={mode === 'document' ? document?.fileName : mode === 'product' ? item.contractNumber : 'Theo dõi sản phẩm và khoản quyết toán của đợt ký gửi'} footer={mode === 'document' && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" startIcon={<ArrowLeft size={16} />} onClick={() => setMode('details')}>Thông tin hợp đồng</Button>{documentUrl && document && <a href={documentUrl} download={document.fileName} className="inline-flex min-h-8 items-center gap-2 rounded-xl bg-button-pastel px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-button-pastel-hover"><Download size={16} aria-hidden="true" /> Tải xuống</a>}</div>}>
      {mode === 'document' ? documentLoading ? <Loading label="Đang tải tệp hợp đồng..." className="min-h-48" /> : documentError ? <ErrorState title="Không thể mở hợp đồng" description="Vui lòng thử lại. Nếu lỗi tiếp diễn, hãy liên hệ OCS." onRetry={() => setRetryKey(key => key + 1)} /> : documentUrl && document ? document.contentType.startsWith('image/') ? <img src={documentUrl} alt={`Ảnh hợp đồng ${item.contractNumber}`} className="mx-auto max-h-[65vh] object-contain" /> : document.contentType === 'application/pdf' ? <iframe src={documentUrl} title={`PDF hợp đồng ${item.contractNumber}`} className="h-[65vh] w-full rounded-xl border border-border bg-white" /> : <div className="rounded-xl border border-border bg-paper p-5 text-sm text-text-secondary">Hợp đồng ở định dạng Word. Chọn <strong>Tải xuống</strong> để mở tệp trên thiết bị.</div> : null : mode === 'product' && selectedProduct ? <div className="space-y-5">
        <Button variant="ghost" size="sm" startIcon={<ArrowLeft size={16} />} onClick={() => setMode('details')}>Trở về hợp đồng</Button>
        {productLoading ? <ProductDetailSkeleton /> : productError ? <ErrorState title="Không thể tải chi tiết sản phẩm" description="Vui lòng thử lại." onRetry={() => { setProductLoading(true); setProductRetryKey(key => key + 1); }} /> : productDetail ? <>
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-brand-pink-surface p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Sản phẩm ký gửi</p><h3 className="mt-1 text-xl font-bold text-brand-ink">{productDetail?.name ?? selectedProduct.name}</h3><p className="mt-1 text-sm text-text-secondary">Mã sản phẩm: {selectedProduct.barcode}</p></div><Status value={productDetail?.status ?? selectedProduct.status} labels={productStatuses} /></div>
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-paper p-4"><p className="text-xs text-muted">Giá niêm yết</p><p className="mt-1 text-lg font-bold text-ink">{money(productDetail?.listedPrice ?? selectedProduct.listedPrice)}</p></div><div className="rounded-xl border border-border bg-paper p-4"><p className="text-xs text-muted">Hoa hồng thỏa thuận</p><p className="mt-1 text-lg font-bold text-ink">{(productDetail ?? selectedProduct).agreedCommissionRate == null ? 'Chưa có thông tin' : `${(productDetail ?? selectedProduct).agreedCommissionRate}%`}</p></div><div className="rounded-xl border border-brand-lavender/50 bg-brand-pink-surface p-4"><p className="text-xs text-muted">Dự kiến nhận</p><p className="mt-1 text-lg font-bold text-brand-highlight">{money((productDetail ?? selectedProduct).estimatedPayout)}</p></div></div>
        <p className="text-xs text-muted">Tiền dự kiến được tính theo giá niêm yết và tỷ lệ hoa hồng; không phải khoản quyết toán thực tế của riêng sản phẩm.</p>
        <section aria-label="Thông tin bổ sung" className="rounded-xl border border-border bg-paper p-4"><h4 className="font-bold text-brand-ink">Thông tin sản phẩm</h4><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted">Thương hiệu</dt><dd className="mt-1 font-semibold text-ink">{productDetail.brandName || 'Chưa có thông tin'}</dd></div><div><dt className="text-xs text-muted">Danh mục</dt><dd className="mt-1 font-semibold text-ink">{productDetail.categoryName || 'Chưa có thông tin'}</dd></div><div><dt className="text-xs text-muted">Kích cỡ</dt><dd className="mt-1 font-semibold text-ink">{productDetail.size || 'Chưa có thông tin'}</dd></div><div><dt className="text-xs text-muted">Tình trạng</dt><dd className="mt-1 font-semibold text-ink">{productDetail.condition || 'Chưa có thông tin'}</dd></div></dl>{productDetail.description && <p className="mt-4 text-sm leading-relaxed text-text-secondary">{productDetail.description}</p>}<div className="mt-5 border-t border-border pt-4"><h4 className="mb-3 font-bold text-brand-ink">Ảnh sản phẩm</h4>{productDetail.imageUrls.length === 0 ? <p className="rounded-xl bg-surface p-4 text-sm text-muted">Sản phẩm này chưa có ảnh để xem.</p> : imagesError ? <ErrorState title="Không thể tải ảnh sản phẩm" description="Vui lòng thử lại." onRetry={() => { setProductLoading(true); setProductRetryKey(key => key + 1); }} /> : galleryImages.length > 0 && <ProductImageGallery key={selectedProduct.id} productName={productDetail.name} images={galleryImages} />}</div></section>
        </> : null}
      </div> : <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-pink-surface p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted">Mã hợp đồng</p><p className="mt-1 text-lg font-bold text-brand-ink">{item.contractNumber}</p></div><Status value={item.status} labels={contractStatuses} /></div>
        <section aria-label="Thông tin hợp đồng" className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl border border-border bg-paper p-4"><p className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays size={14} /> Ngày ký</p><p className="mt-1 font-semibold text-ink">{date(item.signedAt)}</p></div><div className="rounded-xl border border-border bg-paper p-4"><p className="text-xs text-muted">Ngày hết hạn</p><p className="mt-1 font-semibold text-ink">{date(item.endsAt)}</p></div><div className="rounded-xl border border-border bg-paper p-4"><p className="text-xs text-muted">Xử lý khi hết hạn</p><p className="mt-1 font-semibold text-ink">{expiryHandling}</p></div></section>
        {item.expiryProcessingType && <section aria-label="Xử lý hàng hết hạn" className="rounded-xl border border-border bg-paper p-4 text-sm"><h3 className="font-bold text-brand-ink">Xử lý hàng hết hạn</h3><p className="mt-2">Phương án hiện tại: {item.expiryProcessingType === 'Return' ? 'Trả hàng' : item.expiryProcessingType === 'Donate' ? 'Quyên góp' : item.expiryProcessingType}</p><p className="mt-1">Trạng thái phiếu: {({ Pending: 'Chờ xử lý', OverdueDonated: 'Đã duyệt, chờ bàn giao quyên góp', Completed: 'Đã xử lý tất cả các món' } as Record<string, string>)[item.expiryProcessingStatus ?? ''] ?? 'Chưa có thông tin'}</p>{item.expiryProcessingType === 'Return' && <p className="mt-1">Hạn nhận hàng: {item.collectionDeadline ? date(item.collectionDeadline) : 'Chưa cấu hình'}</p>}<p className="mt-2 text-xs text-muted">Trạng thái của từng món được thể hiện trong danh sách sản phẩm bên dưới.</p></section>}
        <section aria-label="Tài chính hợp đồng" className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-brand-lavender/50 bg-brand-pink-surface p-4"><p className="text-xs font-semibold text-text-secondary">Tổng dự kiến nhận</p><p className="mt-1 text-xl font-bold text-brand-highlight">{money(item.estimatedPayout)}</p></div><div className="rounded-xl border border-state-success-border bg-state-success-soft p-4"><p className="text-xs font-semibold text-text-secondary">Đã quyết toán</p><p className="mt-1 text-xl font-bold text-state-success-strong">{money(item.settledAmount)}</p></div></section>
        <CustomerPayouts contractId={item.contractId} />
        <p className="text-xs leading-relaxed text-muted">Tiền dự kiến giả định tất cả sản phẩm bán đúng giá niêm yết; đây không phải khoản chắc chắn nhận và không thể dùng để tính số tiền còn phải trả.</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-lavender/40 bg-paper p-4"><div><p className="flex items-center gap-2 text-sm font-bold text-ink"><FileText size={18} className="text-brand-highlight" /> Tệp hợp đồng</p><p className="mt-1 text-xs text-muted">{document ? document.uploadedAt === null ? 'Bản xem dựng từ thông tin hiện tại, có thể khác hợp đồng đã ký.' : document.fileName : 'Chưa có tệp hợp đồng.'}</p></div><Button variant="outline" size="sm" disabled={!document} onClick={() => setMode('document')}>Xem tệp</Button></div>
        <section aria-label="Sản phẩm trong hợp đồng"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="flex items-center gap-2 text-base font-bold text-brand-ink"><Package size={18} className="text-brand-highlight" /> Sản phẩm <span className="text-brand-highlight">({item.products.length})</span></h3></div>{item.products.length > PRODUCTS_PER_PAGE && <div className="w-full sm:w-64"><Input aria-label="Tìm sản phẩm" placeholder="Tìm tên hoặc mã sản phẩm" value={productQuery} onChange={event => { setProductQuery(event.target.value); setProductPage(1); }} startAdornment={<Search size={15} />} /></div>}</div><p className="mb-2 text-right text-xs text-muted sm:hidden">Vuốt ngang để xem đầy đủ bảng</p><Table className="[&_th]:!px-3 [&_td]:!px-3" columns={columns} data={visibleProducts} rowKey="id" selectedRowKey={selectedProductId} onRowClick={product => setSelectedProductId(product.id)} emptyTitle={item.products.length ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm'} emptyMessage={item.products.length ? 'Thử tìm bằng tên hoặc mã khác.' : 'Hợp đồng này chưa có sản phẩm.'} />{productPages > 1 && <Pagination className="mt-4" page={productPage} totalPages={productPages} onPageChange={setProductPage} aria-label="Phân trang sản phẩm" />}</section>
      </div>}
    </Modal>
  </div>;
}

function CustomerPayouts({ contractId }: { contractId: string }) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    settlementsApi.customerPayouts().then(rows => { if (active) setPayouts(rows.filter(row => row.contractId === contractId)); })
      .catch(() => { if (active) setError('Không thể tải lịch sử giải ngân. Vui lòng thử lại.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [contractId, refresh]);
  const confirm = async (payout: Payout) => {
    setBusyId(payout.id); setError('');
    try {
      const updated = await settlementsApi.confirmReceived(payout.id);
      setPayouts(current => current.map(row => row.id === updated.id ? updated : row));
    } catch { setError('Không thể xác nhận đã nhận tiền. Vui lòng thử lại.'); }
    finally { setBusyId(null); }
  };
  const names: Record<string, string> = { SaleProceeds: 'Tiền bán', Commission: 'Hoa hồng', Compensation: 'Bồi thường', ServiceFee: 'Phí dịch vụ' };
  const states: Record<Payout['status'], [string, BadgeVariant]> = {
    Pending: ['Đang chờ cửa hàng duyệt', 'warning'],
    Approved: ['Đã duyệt', 'info'],
    Transferred: ['Đã chuyển khoản · cần xác nhận', 'payment'],
    Completed: ['Đã hoàn tất', 'success'],
    Rejected: ['Đã từ chối', 'danger'],
  };
  return <Card title="Lịch sử giải ngân" className="!p-4" actions={<Button variant="ghost" size="sm" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Làm mới</Button>}>
    {error && <AlertBanner variant="error" message={error} className="mb-3" />}
    {loading ? <SkeletonLoading variant="list" count={2} label="Đang tải các đợt giải ngân..." />
      : payouts.length === 0 ? <EmptyState title="Chưa có đợt giải ngân" />
      : <div className="space-y-3">{payouts.map(payout => <article key={payout.id} className="rounded-xl border border-border bg-paper p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-semibold text-ink">{payout.payoutNumber}</p><p className="text-xs text-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(payout.createdAt))}</p></div>
          <Badge variant={states[payout.status][1]}>{states[payout.status][0]}</Badge>
        </div>
        <div className="mt-3 divide-y divide-border border-y border-border">{payout.lines.map((line, index) => <div key={line.type + (line.productId ?? line.incidentReportId ?? index)} className="flex justify-between gap-3 py-2 text-xs text-ink"><span><strong>{names[line.type] ?? line.type}</strong><br />{line.description}</span><strong className="whitespace-nowrap">{money(line.amount)}</strong></div>)}</div>
        <div className="mt-2 flex justify-between text-sm font-bold text-brand-ink"><span>Tổng chi</span><span>{money(payout.totalAmount)}</span></div>
        {payout.proofUrl && <PayoutProofImage payoutId={payout.id} />}
        {payout.bankTransactionReference && <p className="mt-2 text-xs text-muted">Mã giao dịch: {payout.bankTransactionReference}</p>}
        {payout.status === 'Transferred' && <AlertBanner variant="info" className="mt-3" message={<><p>Cửa hàng đã chuyển khoản lúc {payout.transferredAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(payout.transferredAt)) : '—'}. Vui lòng kiểm tra tài khoản.</p><Button className="mt-2" size="sm" onClick={() => void confirm(payout)} loading={busyId === payout.id}>Tôi đã nhận tiền</Button></>} />}
        {payout.status === 'Completed' && <AlertBanner variant="success" compact className="mt-3" message={payout.customerConfirmedAt ? 'Bạn đã xác nhận nhận khoản tiền này.' : 'Đợt giải ngân tự hoàn tất sau 48 giờ.'} />}
      </article>)}</div>}
  </Card>;
}

function PayoutProofImage({ payoutId }: { payoutId: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    settlementsApi.readProof(payoutId, true).then(blob => { objectUrl = URL.createObjectURL(blob); if (active) setSrc(objectUrl); }).catch(() => setSrc(''));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [payoutId]);
  return src ? <a className="mt-3 block" href={src} target="_blank" rel="noreferrer"><img src={src} alt="Chứng từ giải ngân" className="max-h-56 rounded-xl border border-border object-contain" /></a> : <p className="mt-2 text-xs text-muted">Đang tải chứng từ…</p>;
}
