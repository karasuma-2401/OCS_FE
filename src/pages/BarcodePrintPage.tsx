import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Printer,
  Search,
  RotateCcw,
  Tag,
  Check,
  Minus,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FileCog,
} from 'lucide-react';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { inventoryApi, type InventoryLocation, type InventoryProduct } from '@/api/inventory';
import { formatVndPrice, type PagedResponse } from '@/api/products';
import { BarcodePrintDialog, BarcodeSymbol } from '@/components/shop/BarcodeLabels';
import { BarcodeTemplateModal } from '@/components/shop/BarcodeTemplateModal';
import type { BarcodeLabelProduct } from '@/api/barcode';
import { Button, Card, ErrorState, SkeletonLoading } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';

const statusLabels: Record<string, string> = {
  PendingProcessing: 'Chờ xử lý',
  OnSale: 'Đang bán',
  Sold: 'Đã bán',
  Returned: 'Đã trả',
  Disposed: 'Đã hủy',
};

const approvalLabels: Record<string, string> = {
  PendingReview: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

interface CustomCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

function CustomCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
}: CustomCheckboxProps) {
  return (
    <label
      className={`group relative inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-[6px] border transition-all select-none ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : checked || indeterminate
          ? 'border-pink-600 bg-pink-600 text-white shadow-sm ring-2 ring-pink-200/50'
          : 'border-gray-300 bg-white hover:border-pink-500 hover:bg-pink-50/20'
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={e => onChange(e.target.checked)}
      />
      {checked && <Check size={14} strokeWidth={3} className="text-white animate-in zoom-in-75 duration-150" />}
      {indeterminate && !checked && (
        <Minus size={14} strokeWidth={3} className="text-white animate-in zoom-in-75 duration-150" />
      )}
    </label>
  );
}

export function BarcodePrintPage() {
  const { hasRole } = useAuth();
  const canManageTemplate = hasRole('Admin') || hasRole('Manager');
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // Bộ lọc
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [status, setStatus] = useState('');
  const [approval, setApproval] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Dữ liệu
  const [data, setData] = useState<PagedResponse<InventoryProduct> | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chọn sản phẩm để in
  const [selectedMap, setSelectedMap] = useState<Record<string, InventoryProduct>>({});
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  // Dialog in & Mẫu barcode
  const [printItems, setPrintItems] = useState<BarcodeLabelProduct[] | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Tải danh sách vị trí kho 1 lần
  useEffect(() => {
    inventoryApi.locations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  // Tải sản phẩm theo bộ lọc & phân trang
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    inventoryApi.list(
      {
        page,
        pageSize: 20,
        q: query || undefined,
        status: status || undefined,
        approval: approval || undefined,
        locationId: locationFilter || undefined,
      },
      controller.signal,
    )
      .then(res => {
        setData(res);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm.';
          setError(msg);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, query, status, approval, locationFilter]);

  const itemsOnCurrentPage = data?.items || [];
  const selectedCount = Object.keys(selectedMap).length;

  // Tính trạng thái checkbox header cho trang hiện tại
  const allCurrentPageSelected = useMemo(() => {
    return (
      itemsOnCurrentPage.length > 0 &&
      itemsOnCurrentPage.every(item => Boolean(selectedMap[item.id]))
    );
  }, [itemsOnCurrentPage, selectedMap]);

  const someCurrentPageSelected = useMemo(() => {
    return (
      itemsOnCurrentPage.some(item => Boolean(selectedMap[item.id])) &&
      !allCurrentPageSelected
    );
  }, [itemsOnCurrentPage, selectedMap, allCurrentPageSelected]);

  // Chọn / bỏ chọn 1 sản phẩm
  const toggleItem = (item: InventoryProduct) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
    setSelectingAllMatching(false);
  };

  // Chọn / bỏ chọn tất cả trên trang hiện tại
  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      // Bỏ chọn tất cả sản phẩm trên trang hiện tại
      setSelectedMap(prev => {
        const next = { ...prev };
        itemsOnCurrentPage.forEach(item => {
          delete next[item.id];
        });
        return next;
      });
      setSelectingAllMatching(false);
    } else {
      // Chọn tất cả sản phẩm trên trang hiện tại
      setSelectedMap(prev => {
        const next = { ...prev };
        itemsOnCurrentPage.forEach(item => {
          next[item.id] = item;
        });
        return next;
      });
    }
  };

  // Chọn tất cả sản phẩm trong toàn bộ kết quả lọc
  const handleSelectAllMatching = async () => {
    if (!data || data.totalCount === 0 || selectAllLoading) return;
    setSelectAllLoading(true);
    try {
      // Tải tối đa 300 sản phẩm theo bộ lọc hiện tại
      const allMatching = await inventoryApi.list({
        page: 1,
        pageSize: Math.min(data.totalCount, 300),
        q: query || undefined,
        status: status || undefined,
        approval: approval || undefined,
        locationId: locationFilter || undefined,
      });

      const next: Record<string, InventoryProduct> = { ...selectedMap };
      allMatching.items.forEach(p => {
        next[p.id] = p;
      });
      setSelectedMap(next);
      setSelectingAllMatching(true);
    } catch {
      // Nếu lỗi thì giữ nguyên lựa chọn hiện tại
    } finally {
      setSelectAllLoading(false);
    }
  };

  // Bỏ chọn tất cả
  const handleClearSelection = () => {
    setSelectedMap({});
    setSelectingAllMatching(false);
  };

  // Mở modal in ấn cho các sản phẩm đã chọn
  const handleOpenPrint = (targetItems?: InventoryProduct[]) => {
    const list = targetItems || Object.values(selectedMap);
    if (list.length === 0) return;

    setPrintItems(
      list.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        listedPrice: p.listedPrice,
      })),
    );
  };

  // Tìm kiếm
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setQuery('');
    setStatus('');
    setApproval('');
    setLocationFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(query || status || approval || locationFilter);

  return (
    <ContractPageLayout
      wide
      activeItem="inventory"
      title="In tem nhãn & Barcode sản phẩm"
      description="Lọc danh sách sản phẩm, chọn nhiều hoặc chọn tất cả để xem trước và in tem barcode chuẩn theo mẫu."
      backTo="/admin/products"
      backLabel="Quản lý sản phẩm"
    >
      <div className="space-y-5">
        {/* Header Actions Card */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-paper p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
              <Printer size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink">
                Khu vực in ấn Barcode sản phẩm
              </p>
              <p className="text-xs text-muted">
                {data ? `${data.totalCount.toLocaleString('vi-VN')} sản phẩm phù hợp` : 'Đang tải...'}
                {selectedCount > 0 && (
                  <span className="ml-2 font-bold text-pink-700">
                    · Đã chọn {selectedCount} sản phẩm
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setTemplateOpen(true)}
              className="gap-2"
            >
              <FileCog size={16} /> {canManageTemplate ? 'Cấu hình mẫu in barcode' : 'Xem mẫu in barcode'}
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={selectedCount === 0}
              onClick={() => handleOpenPrint()}
              className="gap-2"
            >
              <Printer size={16} /> In barcode đã chọn ({selectedCount})
            </Button>
          </div>
        </div>

        {/* Thanh Bộ Lọc */}
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              <SlidersHorizontal size={14} /> Bộ lọc sản phẩm
            </div>

            <form onSubmit={handleSearchSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {/* Tìm kiếm */}
              <div className="relative sm:col-span-2">
                <input
                  type="text"
                  placeholder="Tìm tên sản phẩm, mã barcode, SKU..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
                <Search size={16} className="absolute left-3 top-3 text-muted pointer-events-none" />
              </div>

              {/* Vị trí kho */}
              <select
                value={locationFilter}
                onChange={e => { setLocationFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Tất cả vị trí kho</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>

              {/* Trạng thái duyệt */}
              <select
                value={approval}
                onChange={e => { setApproval(e.target.value); setPage(1); }}
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Tất cả duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="PendingReview">Chờ duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>

              {/* Trạng thái bán */}
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PendingProcessing">Chờ xử lý</option>
                <option value="OnSale">Đang bán</option>
                <option value="Sold">Đã bán</option>
                <option value="Returned">Đã trả</option>
                <option value="Disposed">Đã hủy</option>
              </select>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-xs">
              <span className="text-muted">
                Nhấn Enter hoặc chọn bộ lọc để tự động cập nhật danh sách.
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 font-semibold text-pink-700 hover:underline"
                >
                  <RotateCcw size={12} /> Đặt lại bộ lọc
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Banner thông minh khi chọn tất cả trên trang */}
        {allCurrentPageSelected && data && data.totalCount > itemsOnCurrentPage.length && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink-200 bg-pink-50/80 px-4 py-3 text-xs text-pink-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-pink-600 shrink-0" />
              <span>
                Đã chọn tất cả <strong>{itemsOnCurrentPage.length}</strong> sản phẩm trên trang này.
              </span>
            </div>
            {!selectingAllMatching ? (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                disabled={selectAllLoading}
                className="font-bold text-pink-700 underline hover:text-pink-900 disabled:opacity-50"
              >
                {selectAllLoading
                  ? 'Đang chọn toàn bộ...'
                  : `Chọn tất cả ${data.totalCount.toLocaleString('vi-VN')} sản phẩm trong toàn bộ kết quả lọc`}
              </button>
            ) : (
              <span className="font-bold text-emerald-700">
                ✓ Đã chọn toàn bộ sản phẩm phù hợp bộ lọc!
              </span>
            )}
          </div>
        )}

        {/* Bảng danh sách sản phẩm */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-6">
              <SkeletonLoading variant="list" count={5} />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState description={error} />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <Tag size={36} className="mx-auto mb-2 text-muted" />
              <p className="font-bold text-ink">Không có sản phẩm nào phù hợp</p>
              <p className="mt-1 text-xs text-muted">Hãy thử thay đổi từ khóa hoặc bộ lọc phía trên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs font-bold uppercase tracking-wider text-muted select-none">
                  <tr>
                    {/* Header Checkbox */}
                    <th scope="col" className="w-12 px-4 py-3 text-center">
                      <CustomCheckbox
                        checked={allCurrentPageSelected}
                        indeterminate={someCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        ariaLabel="Chọn tất cả sản phẩm trên trang"
                      />
                    </th>
                    <th scope="col" className="px-4 py-3">Mã Barcode</th>
                    <th scope="col" className="px-4 py-3">Tên sản phẩm</th>
                    <th scope="col" className="px-4 py-3">Phân loại & Hiệu</th>
                    <th scope="col" className="w-16 px-3 py-3 text-center">Size</th>
                    <th scope="col" className="px-4 py-3 text-right">Giá niêm yết</th>
                    <th scope="col" className="px-3 py-3 text-center">Vị trí kho</th>
                    <th scope="col" className="px-3 py-3 text-center">Trạng thái</th>
                    <th scope="col" className="w-24 px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {data.items.map(item => {
                    const isSelected = Boolean(selectedMap[item.id]);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-pink-50/60 hover:bg-pink-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Row Checkbox */}
                        <td
                          className="px-4 py-3 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <CustomCheckbox
                            checked={isSelected}
                            onChange={() => toggleItem(item)}
                            ariaLabel={`Chọn in tem cho ${item.name}`}
                          />
                        </td>

                        {/* Barcode SVG & Code */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <BarcodeSymbol value={item.barcode} className="h-6 w-28" />
                            <span className="font-mono text-[11px] font-bold text-gray-800 tracking-wider">
                              {item.barcode}
                            </span>
                          </div>
                        </td>

                        {/* Tên sản phẩm */}
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 font-bold text-ink" title={item.name}>
                            {item.name}
                          </p>
                          <span className="text-[11px] text-muted">
                            Nguồn: {item.sourceType === 'Consignment' ? 'Ký gửi' : 'Thu mua đứt'}
                          </span>
                        </td>

                        {/* Danh mục & Thương hiệu */}
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-ink">{item.category}</p>
                          <p className="text-muted">{item.brand}</p>
                        </td>

                        {/* Size */}
                        <td className="px-3 py-3 text-center text-xs font-semibold">
                          {item.size || '—'}
                        </td>

                        {/* Giá niêm yết */}
                        <td className="px-4 py-3 text-right font-extrabold text-ink tabular-nums">
                          {formatVndPrice(item.listedPrice)}
                        </td>

                        {/* Vị trí kho */}
                        <td className="px-3 py-3 text-center text-xs">
                          {item.location ? (
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono font-semibold text-slate-800">
                              {item.location.code}
                            </span>
                          ) : (
                            <span className="text-muted italic">Chưa xếp</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-3 text-center text-xs">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                item.status === 'OnSale'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'PendingProcessing'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {statusLabels[item.status] || item.status}
                            </span>
                            {item.approvalStatus && (
                              <span className="text-[10px] text-muted">
                                {approvalLabels[item.approvalStatus] || item.approvalStatus}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nút in nhanh 1 tem */}
                        <td
                          className="px-4 py-3 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenPrint([item])}
                            title="In tem cho sản phẩm này"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:border-pink-500 hover:text-pink-700 transition"
                          >
                            <Printer size={13} /> In tem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Phân trang */}
          {data && data.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
              <span>
                Hiển thị trang {data.page} / {data.totalPages} ({data.totalCount} sản phẩm)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft size={14} /> Trước
                </Button>
                <span className="font-semibold text-ink">Trang {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="gap-1"
                >
                  Sau <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Thanh tác vụ nổi (Sticky Bottom Bar) khi đã chọn sản phẩm */}
        {selectedCount > 0 && (
          <div className="sticky bottom-4 z-30 mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-pink-300 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-600 text-white font-black text-sm">
                {selectedCount}
              </div>
              <div>
                <p className="text-xs font-extrabold text-ink">
                  Đã chọn {selectedCount} sản phẩm
                </p>
                <p className="text-[11px] text-muted">
                  Sẵn sàng in tem barcode chuẩn theo mẫu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs text-muted hover:text-ink"
              >
                Bỏ chọn tất cả
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => handleOpenPrint()}
                className="gap-2 shadow-md"
              >
                <Printer size={16} /> In {selectedCount} tem barcode
              </Button>
            </div>
          </div>
        )}

        {/* Modal in tem barcode */}
        <BarcodePrintDialog
          open={printItems !== null}
          items={printItems || []}
          onClose={() => setPrintItems(null)}
        />

        {/* Modal cấu hình mẫu in barcode */}
        <BarcodeTemplateModal
          open={templateOpen}
          onClose={() => setTemplateOpen(false)}
        />
      </div>
    </ContractPageLayout>
  );
}
export default BarcodePrintPage;
