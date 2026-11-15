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
import { formatVndPrice } from '@/api/products';

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
                    <td className="px-4 py-3.5 text-text-primary">{item.customerName || 'Chưa có thông tin khách'}</td>
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
  const permitted = canManage || (hasPermission('appointments.staff.reception') && hasPermission('customers.read'));

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

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const totalQuantity = contract?.products?.length || 0;
  const totalListedPrice = contract?.products?.reduce((sum, p) => sum + p.listedPrice, 0) || 0;
  const totalPayoutEst = contract?.products?.reduce((sum, p) => {
    const rate = p.agreedCommissionRate ?? 20;
    return sum + (p.listedPrice * (1 - rate / 100));
  }, 0) || 0;

  return (
    <ContractPageLayout
      wide
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
          <div
            id="contract-printable-sheet"
            className="rounded-2xl border border-gray-300 bg-white p-8 sm:p-12 text-gray-900 shadow-md print:border-none print:p-0 print:shadow-none select-text"
          >
            {/* Header Quốc hiệu / Cửa hàng */}
            <div className="flex justify-between items-start border-b border-gray-400 pb-5">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-gray-900">
                  CỬA HÀNG OLD CLOTHES STORE (OCS)
                </h1>
                <p className="text-xs text-gray-600">
                  Chuỗi Cửa Hàng & Ký Gửi Thời Trang Tuyển Chọn
                </p>
                <p className="text-xs text-gray-600">
                  Địa chỉ: 123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh
                </p>
                <p className="text-xs text-gray-600">
                  Hotline: 1900 6868 · Website: ocs.fashion.vn
                </p>
              </div>

              <div className="text-right text-xs">
                <p className="font-extrabold text-gray-900 uppercase">
                  Số HĐ: <span className="font-mono text-sm">{contract.contractNumber}</span>
                </p>
                <p className="text-gray-600">
                  Ngày ký: {formatDate(contract.signedAt)}
                </p>
                <p className="text-gray-600">
                  Thời hạn đến: {formatDate(contract.endsAt)}
                </p>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="my-6 text-center">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-gray-900">
                HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG
              </h2>
              <p className="mt-1 text-xs text-gray-500 italic">
                (Căn cứ theo Bộ luật Dân sự và thỏa thuận giữa hai bên)
              </p>
            </div>

            {/* Thông tin Bên A & Bên B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-300 bg-gray-50/60 p-4 text-xs">
              {/* Bên A: Cửa hàng */}
              <div className="space-y-1.5">
                <p className="font-extrabold uppercase text-gray-900 border-b border-gray-300 pb-1">
                  BÊN A (BÊN NHẬN KÝ GỬI):
                </p>
                <div>
                  <span className="font-bold text-gray-700">Đơn vị:</span> Cửa hàng Old Clothes Store (OCS)
                </div>
                <div>
                  <span className="font-bold text-gray-700">Đại diện tiếp nhận:</span> {contract.employeeName || 'Nhân viên cửa hàng'}
                </div>
                {contract.employeeTitle && (
                  <div>
                    <span className="font-bold text-gray-700">Chức vụ:</span> {contract.employeeTitle}
                  </div>
                )}
                {contract.employeePhone && (
                  <div>
                    <span className="font-bold text-gray-700">Điện thoại liên hệ:</span> <span className="font-mono">{contract.employeePhone}</span>
                  </div>
                )}
              </div>

              {/* Bên B: Khách hàng */}
              <div className="space-y-1.5">
                <p className="font-extrabold uppercase text-gray-900 border-b border-gray-300 pb-1">
                  BÊN B (BÊN KÝ GỬI):
                </p>
                <div>
                  <span className="font-bold text-gray-700">Họ và tên:</span>{' '}
                  <span className="font-extrabold text-gray-900">{contract.customerName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Số điện thoại:</span>{' '}
                  <span className="font-mono font-semibold">{contract.customerPhone}</span>
                </div>
                {contract.customerIdentity && (
                  <div>
                    <span className="font-bold text-gray-700">Số CCCD / Định danh:</span>{' '}
                    <span className="font-mono">{contract.customerIdentity}</span>
                  </div>
                )}
                {contract.customerAddress && (
                  <div>
                    <span className="font-bold text-gray-700">Địa chỉ:</span> {contract.customerAddress}
                  </div>
                )}
                {contract.bankAccountNumber && (
                  <div>
                    <span className="font-bold text-gray-700">Tài khoản nhận tiền:</span>{' '}
                    <span className="font-mono">{contract.bankAccountNumber}</span> ({contract.bankCode || 'Ngân hàng'}) - Chủ TK: {contract.bankAccountHolderName || contract.customerName}
                  </div>
                )}
              </div>
            </div>

            {/* Thông tin thỏa thuận chung */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-xs flex flex-wrap justify-between gap-2">
              <div>
                <span className="font-bold text-gray-700">Thời hạn hợp đồng:</span> Từ {formatDate(contract.signedAt)} đến {formatDate(contract.endsAt)}
              </div>
              <div>
                <span className="font-bold text-gray-700">Hình thức xử lý khi hết hạn:</span>{' '}
                <span className="font-semibold text-gray-900">
                  {contract.expiryHandling === 'Return' ? 'Trả lại khách hàng' : 'Quyên góp theo chính sách'}
                </span>
              </div>
            </div>

            {/* Bảng danh sách sản phẩm ký gửi - In đúng, đủ, KHÔNG CÓ ẢNH */}
            <div className="mt-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-900 mb-2">
                DANH MỤC HÀNG HÓA KÝ GỬI ({contract.products.length} MÓN):
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400 text-left text-xs">
                  <thead className="bg-gray-100 text-gray-800">
                    <tr>
                      <th className="border border-gray-400 px-2.5 py-2 text-center w-10">STT</th>
                      <th className="border border-gray-400 px-2.5 py-2">Tên sản phẩm</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-center">Mã vạch (Barcode)</th>
                      <th className="border border-gray-400 px-2.5 py-2">Phân loại & Hiệu</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-center w-14">Size</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-center w-16">Tình trạng</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-right">Giá niêm yết</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-center w-16">Hoa hồng</th>
                      <th className="border border-gray-400 px-2.5 py-2 text-right">Dự kiến nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.products.map((item, idx) => {
                      const commRate = item.agreedCommissionRate ?? 20;
                      const payout = item.listedPrice * (1 - commRate / 100);
                      return (
                        <tr key={item.id || idx} className="hover:bg-gray-50/50">
                          <td className="border border-gray-400 px-2.5 py-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 font-bold text-gray-900">
                            {item.name}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 font-mono text-center text-xs">
                            {item.barcode || 'Chưa cấp'}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2">
                            {item.categoryName} {item.brandName ? `· ${item.brandName}` : ''}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 text-center font-semibold">
                            {item.size || '-'}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 text-center">
                            {item.conditionPercentage}%
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 text-right font-semibold">
                            {formatVndPrice(item.listedPrice)}
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 text-center text-gray-700">
                            {commRate}%
                          </td>
                          <td className="border border-gray-400 px-2.5 py-2 text-right font-bold text-gray-900">
                            {formatVndPrice(payout)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Dòng tổng kết */}
                    <tr className="bg-gray-100 font-extrabold text-gray-900">
                      <td colSpan={6} className="border border-gray-400 px-2.5 py-2 text-right uppercase">
                        Tổng cộng ({totalQuantity} sản phẩm):
                      </td>
                      <td className="border border-gray-400 px-2.5 py-2 text-right font-black">
                        {formatVndPrice(totalListedPrice)}
                      </td>
                      <td className="border border-gray-400 px-2.5 py-2 text-center">-</td>
                      <td className="border border-gray-400 px-2.5 py-2 text-right font-black text-rose-800">
                        {formatVndPrice(totalPayoutEst)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Điều khoản hợp đồng */}
            {contract.terms && (
              <div className="mt-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-900 mb-2">
                  ĐIỀU KHOẢN VÀ THỎA THUẬN KÝ GỬI:
                </h3>
                <div className="rounded-xl border border-gray-300 bg-gray-50/50 p-4 text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {contract.terms}
                </div>
              </div>
            )}

            {/* Lưu ý kết thúc */}
            <p className="mt-4 text-[11px] text-gray-600 italic">
              * Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản làm căn cứ đối soát và nhận tiền thanh toán khi sản phẩm được bán.
            </p>

            {/* Chữ ký xác nhận */}
            <div className="signature-block mt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <p className="font-extrabold uppercase text-gray-900">ĐẠI DIỆN BÊN A (OCS)</p>
                <p className="text-[11px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-20 flex items-center justify-center">
                  <span className="font-serif italic text-gray-400 text-sm">[Đã xác nhận điện tử]</span>
                </div>
                <p className="font-bold text-gray-900">{contract.employeeName || 'Nhân viên tiếp nhận'}</p>
                {contract.employeeTitle && <p className="text-[11px] text-gray-600">{contract.employeeTitle}</p>}
              </div>

              <div className="space-y-1">
                <p className="font-extrabold uppercase text-gray-900">ĐẠI DIỆN BÊN B (KHÁCH HÀNG)</p>
                <p className="text-[11px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
                <div className="h-20 flex items-center justify-center">
                  {contract.customerSignatureDataUrl ? (
                    <img
                      src={contract.customerSignatureDataUrl}
                      alt="Chữ ký khách hàng"
                      className="max-h-16 max-w-[80%] object-contain"
                    />
                  ) : (
                    <span className="font-serif italic text-gray-400 text-sm">[Chữ ký khách hàng]</span>
                  )}
                </div>
                <p className="font-bold text-gray-900">{contract.customerName}</p>
              </div>
            </div>
          </div>

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
