import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FileCog, FileText, Printer, RotateCcw, Search, Tag } from 'lucide-react';
import { barcodeApi, type BarcodeLabelProduct } from '@/api/barcode';
import { BarcodePrintDialog } from '@/components/shop/BarcodeLabels';
import { getContractDetail, listContracts, type ContractListItem, type ContractDetail } from '@/api/contracts';
import { ContractTermsRequestsPanel } from '@/components/shop/ContractTermsRequestsPanel';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, Combobox, DatePicker, EmptyState, ErrorState, Input, SkeletonLoading } from '@/components/shared';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { UnifiedContractSheet } from '@/components/shop/UnifiedContractSheet';

const statusLabels: Record<string, string> = {
  Active: 'Đang hiệu lực',
  Completed: 'Đã hoàn tất',
  Cancelled: 'Đã hủy',
};

const statusVariants: Record<string, 'success' | 'info' | 'danger' | 'neutral'> = {
  Active: 'success',
  Completed: 'info',
  Cancelled: 'danger',
};

export function ContractListPage() {
  const { hasRole } = useAuth();
  const permitted = hasRole('Admin') || hasRole('Manager');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [items, setItems] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const hasFilter = Boolean(query.trim() || status || fromDate || toDate);

  const handleResetFilters = () => {
    setQuery('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  useEffect(() => {
    if (!permitted) return;
    let active = true;
    setLoading(true);
    setError('');
    listContracts({
      page,
      query: query.trim() || undefined,
      status: status || undefined,
      fromDate: fromDate ? `${fromDate}T00:00:00Z` : undefined,
      toDate: toDate ? `${toDate}T23:59:59Z` : undefined,
    })
      .then(data => { if (active) setItems(data); })
      .catch(() => { if (active) setError('Không thể tải danh sách hợp đồng.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, permitted, retry, query, status, fromDate, toDate]);

  if (!permitted) return <Navigate to="/unauthorized" replace />;

  return (
    <ContractPageLayout
      title="Quản lý hợp đồng"
      description="Tra cứu hợp đồng đã lập và quản lý mẫu hợp đồng của cửa hàng."
      icon={<FileText size={22} aria-hidden="true" />}
      headerActions={
        <Link
          to="/shop/contracts/template"
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-lavender bg-white px-3.5 py-2 text-xs font-bold text-brand-ink hover:bg-brand-pink-surface hover:border-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-pink-focus transition whitespace-nowrap shrink-0"
        >
          <FileCog size={15} aria-hidden="true" />
          Quản lý mẫu hợp đồng
        </Link>
      }
    >
      <Card
        title="Danh sách hợp đồng"
        description={items.length > 0 ? 'Danh sách các hợp đồng dịch vụ ký gửi đã lập tại cửa hàng.' : 'Hiện chưa có hợp đồng nào trong danh sách.'}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="contract-search"
            label="Tìm kiếm hợp đồng"
            placeholder="Mã hợp đồng, tên khách..."
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            startAdornment={<Search size={15} className="text-text-muted shrink-0" />}
          />
          <Combobox
            label="Trạng thái hợp đồng"
            value={status}
            onChange={val => { setStatus(val); setPage(1); }}
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'Active', label: 'Đang hiệu lực' },
              { value: 'Completed', label: 'Đã hoàn tất' },
              { value: 'Cancelled', label: 'Đã hủy' },
            ]}
          />
          <DatePicker
            label="Từ ngày ký"
            value={fromDate}
            onChange={val => { setFromDate(val); setPage(1); }}
          />
          <DatePicker
            label="Đến ngày ký"
            value={toDate}
            onChange={val => { setToDate(val); setPage(1); }}
          />
        </div>

        {hasFilter && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-surface-dashboard/70 px-4 py-2 text-xs">
            <span className="font-medium text-text-secondary">Đang áp dụng bộ lọc</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 font-bold text-brand-highlight hover:underline whitespace-nowrap"
            >
              <RotateCcw size={13} /> Đặt lại bộ lọc
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonLoading variant="list" count={3} />
        ) : error ? (
          <ErrorState description={error} onRetry={() => setRetry(value => value + 1)} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileText size={36} className="text-brand-highlight" />}
            title={hasFilter ? 'Không tìm thấy hợp đồng' : 'Chưa có hợp đồng nào'}
            description={
              hasFilter
                ? 'Không tìm thấy hợp đồng nào khớp với các điều kiện tìm kiếm hiện tại.'
                : 'Chưa có hợp đồng nào được tạo trong hệ thống. Khi nhân viên lập hợp đồng mới tại quầy, hợp đồng sẽ xuất hiện tại đây.'
            }
            action={
              hasFilter ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="whitespace-nowrap shrink-0">
                  Đặt lại bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-surface-dashboard/70 text-xs font-semibold text-text-secondary">
                <tr>
                  <th scope="col" className="w-44 px-4 py-3 font-semibold">Mã hợp đồng</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Khách hàng</th>
                  <th scope="col" className="w-44 px-4 py-3 font-semibold whitespace-nowrap">Ngày ký</th>
                  <th scope="col" className="w-32 px-4 py-3 text-center font-semibold whitespace-nowrap">Trạng thái</th>
                  <th scope="col" className="w-36 px-4 py-3 text-right font-semibold whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map(item => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-surface-active transition-colors">
                    <td className="break-all px-4 py-3.5 font-bold font-mono text-xs text-text-primary">{item.contractNumber}</td>
                    <td className="px-4 py-3.5 text-text-primary">{item.customerName || (item as any).CustomerName || (item as any).customerNameSnapshot || (item as any).CustomerNameSnapshot || 'Khách hàng'}</td>
                    <td className="px-4 py-3.5 text-text-secondary whitespace-nowrap text-xs">{new Date(item.signedAt).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={statusVariants[item.status || 'Active'] || 'neutral'} className="whitespace-nowrap">
                        {statusLabels[item.status || 'Active'] || item.status || 'Đang hiệu lực'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        className="inline-flex items-center gap-1 font-semibold text-brand-highlight hover:underline whitespace-nowrap shrink-0 text-xs"
                        to={`/shop/contracts/${item.id}`}
                      >
                        <FileText size={14} className="shrink-0" /> Xem & In hợp đồng
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-3">
          <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage(page - 1)} className="whitespace-nowrap shrink-0">
            Trang trước
          </Button>
          <span className="text-xs text-text-muted whitespace-nowrap">Trang {page}</span>
          <Button variant="outline" size="sm" disabled={items.length < 20 || loading} onClick={() => setPage(page + 1)} className="whitespace-nowrap shrink-0">
            Trang sau
          </Button>
        </div>
      </Card>
      <ContractTermsRequestsPanel />
    </ContractPageLayout>
  );
}

export function ContractPdfPage() {
  const { id = '' } = useParams();
  const { hasPermission, hasRole } = useAuth();
  const canManage = hasRole('Admin') || hasRole('Manager');
  const permitted = canManage || hasRole('Staff') || (hasPermission('appointments.staff.reception') && hasPermission('customers.read'));

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const [labels, setLabels] = useState<BarcodeLabelProduct[] | null>(null);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState('');

  useEffect(() => {
    if (!permitted || !id) return;
    let active = true;
    setLoading(true);
    setError('');

    getContractDetail(id)
      .then(data => {
        if (active) setContract(data);
      })
      .catch(err => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết hợp đồng.';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id, permitted, retry]);

  if (!permitted) return <Navigate to="/unauthorized" replace />;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenLabels = () => {
    if (contract && contract.products.length > 0) {
      setLabels(contract.products.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        listedPrice: p.listedPrice,
        size: p.size || undefined,
        brand: p.brandName || undefined,
        condition: p.conditionPercentage ? `${p.conditionPercentage}%` : undefined,
      })));
    } else {
      setLabelsLoading(true);
      setLabelsError('');
      barcodeApi.contractProducts(id)
        .then(setLabels)
        .catch(() => setLabelsError('Không thể tải sản phẩm để in barcode.'))
        .finally(() => setLabelsLoading(false));
    }
  };

  return (
    <ContractPageLayout
      title="Chi tiết & In hợp đồng"
      description="Xem và in hợp đồng ký gửi thời trang trực tiếp qua giao diện web chuẩn khổ giấy A4."
      backTo={canManage ? '/shop/contracts' : '/shop/consignment'}
      backLabel={canManage ? 'Quản lý hợp đồng' : 'Tiếp nhận ký gửi'}
    >
      {/* CSS @media print chuyên dụng cho văn bản hợp đồng chuẩn A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #contract-printable-sheet, #contract-printable-sheet * {
            visibility: visible !important;
          }
          #contract-printable-sheet {
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
          }
          #contract-printable-sheet tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #contract-printable-sheet .signature-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {loading ? (
        <SkeletonLoading variant="list" count={4} />
      ) : error ? (
        <ErrorState description={error} onRetry={() => setRetry(val => val + 1)} />
      ) : !contract ? (
        <Card>
          <div className="py-8 text-center text-muted">
            <p>Không tìm thấy thông tin hợp đồng.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-paper p-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-ink">
                HĐ #{contract.contractNumber}
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {contract.status === 'Active' ? 'Hiệu lực' : contract.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                loading={labelsLoading}
                onClick={handleOpenLabels}
                className="gap-2"
              >
                <Tag size={16} /> In barcode sản phẩm ({contract.products.length})
              </Button>

              <Button
                variant="primary"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer size={16} /> In hợp đồng (Khổ A4)
              </Button>
            </div>
          </div>

          {labelsError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-state-danger print:hidden">
              {labelsError}
            </p>
          )}

          {/* Printable Web Contract Sheet */}
          <UnifiedContractSheet
            contractNumber={contract.contractNumber}
            title={contract.title}
            organizationName={contract.organizationName}
            headerText={contract.headerText}
            footerText={contract.footerText}
            signedAt={contract.signedAt}
            endsAt={contract.endsAt}
            expiryHandling={contract.expiryHandling}
            employeeName={contract.employeeName}
            employeeTitle={contract.employeeTitle}
            employeePhone={contract.employeePhone}
            customerName={contract.customerName}
            customerPhone={contract.customerPhone}
            customerEmail={contract.customerEmail}
            customerIdentity={contract.customerIdentity}
            customerAddress={contract.customerAddress}
            bankCode={contract.bankCode}
            bankAccountNumber={contract.bankAccountNumber}
            bankAccountHolderName={contract.bankAccountHolderName}
            products={contract.products}
            terms={contract.terms}
            signatureDataUrl={contract.customerSignatureDataUrl}
            printableId="contract-printable-sheet"
          />

          {/* Barcode Print Modal */}
          <BarcodePrintDialog
            open={labels !== null}
            items={labels || []}
            onClose={() => setLabels(null)}
          />
        </div>
      )}
    </ContractPageLayout>
  );
}
