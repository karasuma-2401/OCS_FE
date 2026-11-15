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
import { inventoryApi, type InventoryProduct } from '@/api/inventory';
import { formatVndPrice, type PagedResponse } from '@/api/products';
import { BarcodePrintDialog } from '@/components/shop/BarcodeLabels';
import { BarcodeTemplateModal } from '@/components/shop/BarcodeTemplateModal';
import type { BarcodeLabelProduct } from '@/api/barcode';
import { Badge, Button, Card, ErrorState, SkeletonLoading } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';

const statusLabels: Record<string, string> = {
  PendingProcessing: 'Chờ xử lý',
  OnSale: 'Đang bán',
  Sold: 'Đã bán',
  Returned: 'Đã trả',
  Disposed: 'Đã hủy',
};

const statusBadgeVariant = (val: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (val === 'OnSale') return 'success';
  if (val === 'PendingProcessing') return 'warning';
  if (val === 'Disposed' || val === 'Cancelled') return 'danger';
  return 'neutral';
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
      className={`group relative inline-flex h-4.5 w-4.5 cursor-pointer items-center justify-center rounded-[6px] border transition-all select-none ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : checked || indeterminate
          ? 'border-brand-highlight bg-brand-highlight text-white shadow-sm ring-2 ring-brand-pink-light'
          : 'border-border bg-white hover:border-brand-highlight hover:bg-brand-pink-surface'
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
      {checked && <Check size={13} strokeWidth={3} className="text-white animate-in zoom-in-75 duration-150" />}
      {indeterminate && !checked && (
        <Minus size={13} strokeWidth={3} className="text-white animate-in zoom-in-75 duration-150" />
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

  // Dữ liệu
  const [data, setData] = useState<PagedResponse<InventoryProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chọn sản phẩm để in
  const [selectedMap, setSelectedMap] = useState<Record<string, InventoryProduct>>({});
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  // Dialog in & Mẫu barcode
  const [printItems, setPrintItems] = useState<BarcodeLabelProduct[] | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Tải sản phẩm theo bộ lọc & phân trang (không lọc theo vị trí kho)
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
  }, [page, query, status, approval]);

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
      setSelectedMap(prev => {
        const next = { ...prev };
        itemsOnCurrentPage.forEach(item => {
          delete next[item.id];
        });
        return next;
      });
      setSelectingAllMatching(false);
    } else {
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
      const allMatching = await inventoryApi.list({
        page: 1,
        pageSize: Math.min(data.totalCount, 300),
        q: query || undefined,
        status: status || undefined,
        approval: approval || undefined,
      });

      const next: Record<string, InventoryProduct> = { ...selectedMap };
      allMatching.items.forEach(p => {
        next[p.id] = p;
      });
      setSelectedMap(next);
      setSelectingAllMatching(true);
    } catch {
      // Giữ nguyên lựa chọn nếu lỗi
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
    setPage(1);
  };

  const hasActiveFilters = Boolean(query || status || approval);

  return (
    <ContractPageLayout
      activeItem="inventory"
      title="In tem barcode"
      description="Lọc và chọn sản phẩm để in nhãn mã vạch chuẩn kích thước theo mẫu."
      icon={<Printer size={22} aria-hidden="true" />}
      backTo="/admin/products"
      backLabel="Quản lý sản phẩm"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateOpen(true)}
            startIcon={<FileCog size={15} aria-hidden="true" />}
            className="whitespace-nowrap shrink-0"
          >
            {canManageTemplate ? 'Cấu hình mẫu' : 'Xem mẫu in'}
          </Button>

          <Button
            size="sm"
            disabled={selectedCount === 0}
            onClick={() => handleOpenPrint()}
            startIcon={<Printer size={15} aria-hidden="true" />}
            className="whitespace-nowrap shrink-0"
          >
            In đã chọn ({selectedCount})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Bộ lọc sản phẩm gọn gàng */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              <SlidersHorizontal size={14} className="shrink-0" /> Bộ lọc sản phẩm
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-highlight hover:underline whitespace-nowrap"
              >
                <RotateCcw size={12} className="shrink-0" /> Đặt lại bộ lọc
              </button>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <input
                type="text"
                placeholder="Tìm tên sản phẩm, mã barcode..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-muted focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-muted pointer-events-none shrink-0" />
            </div>

            <div className="w-44 shrink-0">
              <select
                value={status}
                onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PendingProcessing">Chờ xử lý</option>
                <option value="OnSale">Đang bán</option>
                <option value="Sold">Đã bán</option>
                <option value="Returned">Đã trả</option>
                <option value="Disposed">Đã hủy</option>
              </select>
            </div>

            <div className="w-40 shrink-0">
              <select
                value={approval}
                onChange={e => { setApproval(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight"
              >
                <option value="">Tất cả duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="PendingReview">Chờ duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="whitespace-nowrap shrink-0"
            >
              Tìm kiếm
            </Button>
          </form>
        </Card>

        {/* Banner thông minh khi chọn tất cả trên trang */}
        {allCurrentPageSelected && data && data.totalCount > itemsOnCurrentPage.length && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-lavender/60 bg-brand-pink-surface px-4 py-2.5 text-xs text-brand-ink animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-brand-highlight shrink-0" />
              <span>
                Đã chọn tất cả <strong>{itemsOnCurrentPage.length}</strong> sản phẩm trên trang này.
              </span>
            </div>
            {!selectingAllMatching ? (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                disabled={selectAllLoading}
                className="font-bold text-brand-highlight underline hover:text-brand-ink disabled:opacity-50 whitespace-nowrap"
              >
                {selectAllLoading
                  ? 'Đang chọn toàn bộ...'
                  : `Chọn tất cả ${data.totalCount.toLocaleString('vi-VN')} sản phẩm trong kết quả lọc`}
              </button>
            ) : (
              <span className="font-bold text-state-success whitespace-nowrap">
                ✓ Đã chọn toàn bộ sản phẩm phù hợp bộ lọc!
              </span>
            )}
          </div>
        )}

        {/* Bảng danh sách sản phẩm: gọn gàng, không hiện vị trí kho */}
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
              <p className="font-bold text-text-primary">Không có sản phẩm nào phù hợp</p>
              <p className="mt-1 text-xs text-muted">Hãy thử thay đổi từ khóa hoặc bộ lọc phía trên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-surface-dashboard/70 text-xs font-semibold text-text-secondary select-none">
                  <tr>
                    <th scope="col" className="w-11 px-3 py-3 text-center">
                      <CustomCheckbox
                        checked={allCurrentPageSelected}
                        indeterminate={someCurrentPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        ariaLabel="Chọn tất cả sản phẩm trên trang"
                      />
                    </th>
                    <th scope="col" className="w-40 px-3 py-3 font-semibold">Mã Barcode</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th scope="col" className="w-32 px-3 py-3 text-right font-semibold whitespace-nowrap">Giá niêm yết</th>
                    <th scope="col" className="w-28 px-3 py-3 text-center font-semibold whitespace-nowrap">Trạng thái</th>
                    <th scope="col" className="w-24 px-3 py-3 text-right font-semibold whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.items.map(item => {
                    const isSelected = Boolean(selectedMap[item.id]);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => toggleItem(item)}
                        className={`cursor-pointer transition-colors border-t border-border/60 ${
                          isSelected
                            ? 'bg-brand-pink-surface'
                            : 'hover:bg-surface-active'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="px-3 py-3 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <CustomCheckbox
                            checked={isSelected}
                            onChange={() => toggleItem(item)}
                            ariaLabel={`Chọn in tem cho ${item.name}`}
                          />
                        </td>

                        {/* Mã Barcode */}
                        <td className="px-3 py-3 font-mono font-bold text-xs text-text-primary tracking-wider whitespace-nowrap">
                          {item.barcode}
                        </td>

                        {/* Tên sản phẩm & Phân loại */}
                        <td className="px-4 py-3">
                          <p className="line-clamp-1 font-semibold text-brand-ink text-sm" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {item.category}{item.brand ? ` · ${item.brand}` : ''}{item.size ? ` · Size ${item.size}` : ''}
                          </p>
                        </td>

                        {/* Giá niêm yết */}
                        <td className="px-3 py-3 text-right font-bold text-text-primary tabular-nums whitespace-nowrap">
                          {formatVndPrice(item.listedPrice)}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-3 py-3 text-center">
                          <Badge variant={statusBadgeVariant(item.status)} className="whitespace-nowrap">
                            {statusLabels[item.status] || item.status}
                          </Badge>
                        </td>

                        {/* Nút in nhanh 1 tem */}
                        <td
                          className="px-3 py-3 text-right"
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPrint([item])}
                            startIcon={<Printer size={13} aria-hidden="true" />}
                            className="whitespace-nowrap shrink-0 !py-1 !px-2.5 text-xs"
                          >
                            In tem
                          </Button>
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-xs text-muted">
              <span>
                Hiển thị trang {data.page} / {data.totalPages} ({data.totalCount} sản phẩm)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  startIcon={<ChevronLeft size={14} aria-hidden="true" />}
                  className="whitespace-nowrap shrink-0"
                >
                  Trước
                </Button>
                <span className="font-semibold text-text-primary whitespace-nowrap">Trang {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage(p => p + 1)}
                  endIcon={<ChevronRight size={14} aria-hidden="true" />}
                  className="whitespace-nowrap shrink-0"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Thanh tác vụ nổi (Sticky Bottom Bar) khi đã chọn sản phẩm */}
        {selectedCount > 0 && (
          <div className="sticky bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-brand-lavender bg-white/95 p-3 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-highlight text-white font-extrabold text-xs">
                {selectedCount}
              </div>
              <div>
                <p className="text-xs font-bold text-text-primary">
                  Đã chọn {selectedCount} sản phẩm
                </p>
                <p className="text-[11px] text-muted">
                  Sẵn sàng in tem barcode Code 128
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs text-text-muted hover:text-text-primary whitespace-nowrap shrink-0"
              >
                Bỏ chọn
              </Button>

              <Button
                size="sm"
                onClick={() => handleOpenPrint()}
                startIcon={<Printer size={14} aria-hidden="true" />}
                className="whitespace-nowrap shrink-0"
              >
                In {selectedCount} tem
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
