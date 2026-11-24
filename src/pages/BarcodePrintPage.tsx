import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileCog,
  MapPin,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react';
import { ContractPageLayout } from '@/components/shop/ContractPageLayout';
import { inventoryApi, type InventoryLocation, type InventoryProduct } from '@/api/inventory';
import { barcodeApi, type BarcodeLabelProduct, type BarcodeLabelTemplate } from '@/api/barcode';
import { formatVndPrice, type PagedResponse } from '@/api/products';
import { BarcodePrintDialog, DEFAULT_BARCODE_TEMPLATE } from '@/components/shop/BarcodeLabels';
import { BarcodeTemplateModal } from '@/components/shop/BarcodeTemplateModal';
import { clampBarcodeCopies, estimateA4BarcodeLayout } from '@/components/shop/barcodeGeometry';
import { InventoryCheckbox } from '@/components/shop/inventory/InventoryCheckbox';
import {
  UNASSIGNED_LOCATION_VALUE,
  approvalStatuses,
  inventoryErrorText,
  saleStatuses,
  statusBadgeVariant,
  statusLabel,
} from '@/components/shop/inventory/inventoryHelpers';
import { PosBarcodeScannerModal } from '@/components/shop/pos/PosBarcodeScannerModal';
import {
  Badge,
  Button,
  Card,
  Combobox,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  SkeletonLoading,
  type ComboboxOption,
} from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const ALL_APPROVAL_OPTIONS = [...approvalStatuses, 'Rejected'] as const;

function toBarcodeLabelProduct(product: InventoryProduct): BarcodeLabelProduct {
  return {
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    listedPrice: product.listedPrice,
    size: product.size || undefined,
    brand: product.brand || undefined,
    condition: product.conditionPercentage ? `${product.conditionPercentage}%` : undefined,
  };
}

function CopyStepControl({
  value,
  itemName,
  onChange,
}: {
  value: number;
  itemName: string;
  onChange: (next: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-1 py-0.5"
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={`Giảm số bản in cho ${itemName}`}
        className="flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={12} aria-hidden="true" />
      </button>
      <span
        className="min-w-6 text-center text-xs font-bold tabular-nums text-ink"
        title="Số bản sao tem sẽ in"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= 50}
        aria-label={`Tăng số bản in cho ${itemName}`}
        className="flex h-6 w-6 items-center justify-center rounded text-muted transition hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

export function BarcodePrintPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const canManageTemplate = hasRole('Admin') || hasRole('Manager');
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialQuery = searchParams.get('q') || '';
  const preselectedProducts = (location.state as { preselectedProducts?: InventoryProduct[] } | null)?.preselectedProducts;

  // Bộ lọc & phân trang
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [status, setStatus] = useState('');
  const [approval, setApproval] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // Dữ liệu danh sách, vị trí kho & mẫu tem hiện hành
  const [data, setData] = useState<PagedResponse<InventoryProduct> | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<BarcodeLabelTemplate>(DEFAULT_BARCODE_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Chọn sản phẩm & số lượng bản sao cho từng sản phẩm
  const [selectedMap, setSelectedMap] = useState<Record<string, InventoryProduct>>(() => {
    if (!Array.isArray(preselectedProducts)) return {};
    return Object.fromEntries(preselectedProducts.map(item => [item.id, item]));
  });
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>(() => {
    if (!Array.isArray(preselectedProducts)) return {};
    return Object.fromEntries(preselectedProducts.map(item => [item.id, 1]));
  });
  const [selectingAllMatching, setSelectingAllMatching] = useState(false);
  const [selectAllLoading, setSelectAllLoading] = useState(false);

  // Tương tác phụ: copy mã, quét camera, dialog in & modal mẫu
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [printItems, setPrintItems] = useState<BarcodeLabelProduct[] | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Tải danh sách vị trí kho 1 lần khi vào trang
  useEffect(() => {
    const controller = new AbortController();
    inventoryApi.locations(controller.signal)
      .then(res => setLocations(res))
      .catch(() => {
        if (!controller.signal.aborted) setLocations([]);
      });
    return () => controller.abort();
  }, []);

  // Tải mẫu tem barcode hiện hành (đồng thời làm mới sau khi đóng modal cấu hình mẫu)
  useEffect(() => {
    if (templateOpen) return;
    let active = true;
    barcodeApi.getTemplate()
      .then(res => {
        if (active) setActiveTemplate(res);
      })
      .catch(() => {
        // Giữ mẫu mặc định nếu chưa tải được
      });
    return () => { active = false; };
  }, [templateOpen]);

  // Cleanup timer copy
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Tải sản phẩm theo bộ lọc & phân trang
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const unassignedLocation = locationFilter === UNASSIGNED_LOCATION_VALUE ? true : undefined;
    const locationId = locationFilter && !unassignedLocation ? locationFilter : undefined;

    inventoryApi.list(
      {
        page,
        pageSize: 20,
        q: query || undefined,
        status: status || undefined,
        approval: approval || undefined,
        locationId,
        unassignedLocation,
      },
      controller.signal,
    )
      .then(res => {
        setData(res);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(inventoryErrorText(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, query, status, approval, locationFilter, reloadKey]);

  const statusOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '', label: 'Tất cả trạng thái' },
      ...saleStatuses.map(code => ({ value: code, label: statusLabel(code) })),
    ],
    [],
  );

  const approvalOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '', label: 'Tất cả duyệt' },
      ...ALL_APPROVAL_OPTIONS.map(code => ({ value: code, label: statusLabel(code) })),
    ],
    [],
  );

  const locationOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '', label: 'Tất cả vị trí kho' },
      { value: UNASSIGNED_LOCATION_VALUE, label: 'Chưa xếp vị trí' },
      ...locations.map(loc => ({ value: loc.id, label: `${loc.code} — ${loc.name}` })),
    ],
    [locations],
  );

  const itemsOnCurrentPage = useMemo(() => data?.items || [], [data]);
  const selectedProducts = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const selectedCount = selectedProducts.length;

  const totalSelectedLabels = useMemo(
    () => selectedProducts.reduce((sum, item) => sum + clampBarcodeCopies(copiesMap[item.id] ?? 1), 0),
    [selectedProducts, copiesMap],
  );

  const selectedLayoutEstimate = useMemo(
    () => estimateA4BarcodeLayout(totalSelectedLabels, activeTemplate),
    [totalSelectedLabels, activeTemplate],
  );

  const allCurrentPageSelected = useMemo(
    () => itemsOnCurrentPage.length > 0 && itemsOnCurrentPage.every(item => Boolean(selectedMap[item.id])),
    [itemsOnCurrentPage, selectedMap],
  );

  const someCurrentPageSelected = useMemo(
    () => itemsOnCurrentPage.some(item => Boolean(selectedMap[item.id])) && !allCurrentPageSelected,
    [itemsOnCurrentPage, selectedMap, allCurrentPageSelected],
  );

  const updateCopies = useCallback((productId: string, nextValue: number) => {
    const clamped = clampBarcodeCopies(nextValue);
    setCopiesMap(prev => ({ ...prev, [productId]: clamped }));
  }, []);

  const toggleItem = useCallback((item: InventoryProduct) => {
    setSelectedMap(prev => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
    setCopiesMap(prev => (prev[item.id] ? prev : { ...prev, [item.id]: 1 }));
    setSelectingAllMatching(false);
  }, []);

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
      setCopiesMap(prev => {
        const next = { ...prev };
        itemsOnCurrentPage.forEach(item => {
          if (!next[item.id]) next[item.id] = 1;
        });
        return next;
      });
    }
  };

  const handleSelectAllMatching = async () => {
    if (!data || data.totalCount === 0 || selectAllLoading) return;
    setSelectAllLoading(true);
    const unassignedLocation = locationFilter === UNASSIGNED_LOCATION_VALUE ? true : undefined;
    const locationId = locationFilter && !unassignedLocation ? locationFilter : undefined;

    try {
      const allMatching = await inventoryApi.list({
        page: 1,
        pageSize: Math.min(data.totalCount, 300),
        q: query || undefined,
        status: status || undefined,
        approval: approval || undefined,
        locationId,
        unassignedLocation,
      });

      const next: Record<string, InventoryProduct> = { ...selectedMap };
      const nextCopies: Record<string, number> = { ...copiesMap };
      allMatching.items.forEach(p => {
        next[p.id] = p;
        if (!nextCopies[p.id]) nextCopies[p.id] = 1;
      });
      setSelectedMap(next);
      setCopiesMap(nextCopies);
      setSelectingAllMatching(true);
    } catch (err) {
      toast.error(inventoryErrorText(err));
    } finally {
      setSelectAllLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedMap({});
    setSelectingAllMatching(false);
  };

  const handleOpenPrint = (targetItems?: InventoryProduct[]) => {
    const list = targetItems || selectedProducts;
    if (list.length === 0) return;
    setPrintItems(list.map(toBarcodeLabelProduct));
  };

  const handleCopyBarcode = async (item: InventoryProduct) => {
    if (!item.barcode) return;
    try {
      await navigator.clipboard?.writeText(item.barcode);
      setCopiedId(item.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
      toast.success(`Đã sao chép mã ${item.barcode}`);
    } catch {
      toast.error('Không thể sao chép mã barcode vào clipboard.');
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const handleScanSuccess = (scannedBarcode: string) => {
    const normalized = scannedBarcode.trim();
    if (!normalized) return;
    setSearchInput(normalized);
    setQuery(normalized);
    setPage(1);
    toast.success(`Đã quét mã: ${normalized}`);
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
  const selectedLocationLabel = locationOptions.find(opt => opt.value === locationFilter)?.label;

  return (
    <ContractPageLayout
      activeItem="inventory"
      title="In tem barcode"
      description="Lọc và chọn sản phẩm, chỉnh số bản sao để in nhãn mã vạch Code 128 chuẩn khổ A4."
      icon={<Printer size={22} aria-hidden="true" />}
      backTo="/shop/inventory"
      backLabel="Quản lý kho"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
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
            {selectedCount > 0 ? `In ${totalSelectedLabels} tem (${selectedCount} SP)` : 'In đã chọn (0)'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Bộ lọc sản phẩm */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-muted uppercase">
              <SlidersHorizontal size={14} className="shrink-0" aria-hidden="true" />
              <span>Bộ lọc sản phẩm</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="hidden sm:inline">
                Mẫu hiện hành: <strong className="text-ink">{activeTemplate.widthMm}×{activeTemplate.heightMm}mm</strong> ({activeTemplate.columns} cột)
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 font-semibold text-brand-highlight hover:underline whitespace-nowrap"
                >
                  <RotateCcw size={12} className="shrink-0" aria-hidden="true" /> Đặt lại bộ lọc
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-12 lg:items-center">
            <div className="flex items-center gap-2 lg:col-span-5">
              <div className="flex-1">
                <Input
                  type="text"
                  aria-label="Tìm tên sản phẩm hoặc mã barcode"
                  placeholder="Tìm tên sản phẩm, mã barcode..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  startAdornment={<Search size={15} aria-hidden="true" />}
                  endAdornment={
                    searchInput ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          if (query) {
                            setQuery('');
                            setPage(1);
                          }
                        }}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="rounded p-0.5 text-muted transition hover:bg-surface-subtle hover:text-ink"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    ) : undefined
                  }
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setScannerOpen(true)}
                startIcon={<Camera size={15} aria-hidden="true" />}
                className="shrink-0 whitespace-nowrap"
                title="Quét mã vạch bằng camera"
              >
                Quét mã
              </Button>
            </div>

            <div className="lg:col-span-2">
              <Combobox
                ariaLabel="Lọc theo trạng thái bán"
                options={statusOptions}
                value={status}
                onChange={val => {
                  setStatus(val);
                  setPage(1);
                }}
              />
            </div>

            <div className="lg:col-span-2">
              <Combobox
                ariaLabel="Lọc theo trạng thái duyệt"
                options={approvalOptions}
                value={approval}
                onChange={val => {
                  setApproval(val);
                  setPage(1);
                }}
              />
            </div>

            <div className="lg:col-span-2">
              <Combobox
                ariaLabel="Lọc theo vị trí kho"
                options={locationOptions}
                value={locationFilter}
                onChange={val => {
                  setLocationFilter(val);
                  setPage(1);
                }}
              />
            </div>

            <div className="lg:col-span-1">
              <Button
                type="submit"
                variant="outline"
                className="w-full whitespace-nowrap"
              >
                Tìm
              </Button>
            </div>
          </form>

          {/* Chip hiển thị bộ lọc đang bật */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-xs">
              <span className="text-muted">Đang lọc:</span>
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setQuery('');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-medium text-ink transition hover:border-brand-highlight"
                >
                  Từ khóa: “{query}” <X size={12} aria-hidden="true" />
                </button>
              )}
              {status && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus('');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-medium text-ink transition hover:border-brand-highlight"
                >
                  Trạng thái: {statusLabel(status)} <X size={12} aria-hidden="true" />
                </button>
              )}
              {approval && (
                <button
                  type="button"
                  onClick={() => {
                    setApproval('');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-medium text-ink transition hover:border-brand-highlight"
                >
                  Duyệt: {statusLabel(approval)} <X size={12} aria-hidden="true" />
                </button>
              )}
              {locationFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationFilter('');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-medium text-ink transition hover:border-brand-highlight"
                >
                  Vị trí: {selectedLocationLabel || locationFilter} <X size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Banner thông minh khi chọn tất cả trên trang */}
        {allCurrentPageSelected && data && data.totalCount > itemsOnCurrentPage.length && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-lavender/60 bg-brand-pink-surface px-4 py-2.5 text-xs text-brand-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-brand-highlight" aria-hidden="true" />
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

        {/* Bảng Desktop & Danh sách Card Mobile */}
        <Card className="overflow-hidden p-0">
          {/* Thanh tiến trình mảnh khi đang chuyển trang / lọc để giữ danh sách không giật */}
          <div className="h-0.5 w-full overflow-hidden bg-transparent" aria-hidden="true">
            {loading && data && (
              <div className="animate-inv-progress-indeterminate h-full w-1/3 bg-brand-highlight" />
            )}
          </div>

          {loading && !data ? (
            <div className="p-6">
              <SkeletonLoading variant="list" count={5} />
            </div>
          ) : error && !data ? (
            <div className="p-6">
              <ErrorState
                description={error}
                onRetry={() => setReloadKey(prev => prev + 1)}
              />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Tag size={22} aria-hidden="true" />}
                title="Không có sản phẩm nào phù hợp"
                description="Hãy thử thay đổi từ khóa, trạng thái hoặc vị trí kho để tìm sản phẩm cần in tem."
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                      Đặt lại bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity duration-150' : 'transition-opacity duration-150'}>
              {error && (
                <div className="border-b border-border/60 p-4">
                  <ErrorState
                    description={error}
                    onRetry={() => setReloadKey(prev => prev + 1)}
                  />
                </div>
              )}

              {/* Mobile header bar cho Chọn tất cả */}
              <div className="flex items-center justify-between border-b border-border/60 bg-surface-subtle/60 px-4 py-2.5 md:hidden">
                <div className="flex items-center gap-2.5">
                  <InventoryCheckbox
                    checked={allCurrentPageSelected}
                    indeterminate={someCurrentPageSelected}
                    onChange={toggleSelectAllCurrentPage}
                    ariaLabel="Chọn tất cả sản phẩm trên trang"
                  />
                  <span className="text-xs font-semibold text-ink">
                    Chọn tất cả trên trang ({itemsOnCurrentPage.length})
                  </span>
                </div>
                <span className="text-xs text-muted">Chạm 1 lần để chọn</span>
              </div>

              {/* Mobile Cards View (< md) */}
              <div className="divide-y divide-border/60 md:hidden">
                {data.items.map(item => {
                  const isSelected = Boolean(selectedMap[item.id]);
                  const qty = clampBarcodeCopies(copiesMap[item.id] ?? 1);
                  const isCopied = copiedId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      onDoubleClick={() => handleOpenPrint([item])}
                      className={`relative cursor-pointer border-l-[3px] p-4 transition-colors ${
                        isSelected
                          ? 'border-l-brand-highlight bg-brand-pink-surface'
                          : 'border-l-transparent bg-paper hover:bg-surface-subtle/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                          <InventoryCheckbox
                            checked={isSelected}
                            onChange={() => toggleItem(item)}
                            ariaLabel={`Chọn in tem cho ${item.name}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold text-brand-ink">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                {item.category}
                                {item.brand ? ` · ${item.brand}` : ''}
                                {item.size ? ` · Size ${item.size}` : ''}
                                {item.conditionPercentage ? ` · Mới ${item.conditionPercentage}%` : ''}
                              </p>
                            </div>
                            <Badge variant={statusBadgeVariant(item.status)} className="shrink-0 whitespace-nowrap">
                              {statusLabel(item.status)}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleCopyBarcode(item);
                              }}
                              title="Nhấn để sao chép mã barcode"
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-ink transition hover:border-brand-highlight"
                            >
                              <span>{item.barcode}</span>
                              {isCopied ? (
                                <Check size={12} className="text-state-success" aria-hidden="true" />
                              ) : (
                                <Copy size={12} className="text-muted" aria-hidden="true" />
                              )}
                            </button>

                            <span className="text-sm font-bold tabular-nums text-ink">
                              {formatVndPrice(item.listedPrice)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            {item.location ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <MapPin size={12} className="shrink-0 text-brand-highlight" aria-hidden="true" />
                                {item.location.code}
                              </span>
                            ) : (
                              <span className="text-xs text-muted">Chưa xếp vị trí</span>
                            )}

                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              {isSelected && (
                                <CopyStepControl
                                  value={qty}
                                  itemName={item.name}
                                  onChange={next => updateCopies(item.id, next)}
                                />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPrint([item])}
                                startIcon={<Printer size={13} aria-hidden="true" />}
                                className="whitespace-nowrap shrink-0"
                              >
                                In tem
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-surface-dashboard/70 text-xs font-semibold text-text-secondary select-none">
                    <tr>
                      <th scope="col" className="w-12 px-3 py-3 text-center">
                        <InventoryCheckbox
                          checked={allCurrentPageSelected}
                          indeterminate={someCurrentPageSelected}
                          onChange={toggleSelectAllCurrentPage}
                          ariaLabel="Chọn tất cả sản phẩm trên trang"
                        />
                      </th>
                      <th scope="col" className="w-48 px-3 py-3 font-semibold">Mã Barcode</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Sản phẩm</th>
                      <th scope="col" className="w-32 px-3 py-3 text-right font-semibold whitespace-nowrap">Giá niêm yết</th>
                      <th scope="col" className="w-32 px-3 py-3 text-center font-semibold whitespace-nowrap">Trạng thái</th>
                      <th scope="col" className="w-52 px-3 py-3 text-right font-semibold whitespace-nowrap">Bản sao & In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.items.map(item => {
                      const isSelected = Boolean(selectedMap[item.id]);
                      const qty = clampBarcodeCopies(copiesMap[item.id] ?? 1);
                      const isCopied = copiedId === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleItem(item)}
                          onDoubleClick={() => handleOpenPrint([item])}
                          title="Nhấp để chọn in · Nhấp đúp để xem bản in nhanh"
                          className={`cursor-pointer border-t border-border/60 transition-colors ${
                            isSelected
                              ? 'bg-brand-pink-surface'
                              : 'hover:bg-surface-active'
                          }`}
                        >
                          {/* Checkbox với chỉ báo cạnh trái phẳng khi được chọn */}
                          <td
                            className={`relative px-3 py-3 text-center ${
                              isSelected ? 'shadow-[inset_3px_0_0_0_var(--color-brand-highlight)]' : ''
                            }`}
                            onClick={e => e.stopPropagation()}
                            onDoubleClick={e => e.stopPropagation()}
                          >
                            <InventoryCheckbox
                              checked={isSelected}
                              onChange={() => toggleItem(item)}
                              ariaLabel={`Chọn in tem cho ${item.name}`}
                            />
                          </td>

                          {/* Mã Barcode 1-click copy */}
                          <td
                            className="px-3 py-3 whitespace-nowrap"
                            onClick={e => e.stopPropagation()}
                            onDoubleClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopyBarcode(item)}
                              title="Nhấn để sao chép mã barcode"
                              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-white px-2 py-1 font-mono text-xs font-bold tracking-wider text-ink transition hover:border-brand-highlight"
                            >
                              <span>{item.barcode}</span>
                              {isCopied ? (
                                <Check size={12} className="text-state-success" aria-hidden="true" />
                              ) : (
                                <Copy size={12} className="text-muted" aria-hidden="true" />
                              )}
                            </button>
                          </td>

                          {/* Tên sản phẩm, thuộc tính & vị trí kho */}
                          <td className="px-4 py-3">
                            <p className="line-clamp-1 text-sm font-semibold text-brand-ink" title={item.name}>
                              {item.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                              <span>
                                {item.category}
                                {item.brand ? ` · ${item.brand}` : ''}
                                {item.size ? ` · Size ${item.size}` : ''}
                                {item.conditionPercentage ? ` · Mới ${item.conditionPercentage}%` : ''}
                              </span>
                              {item.location && (
                                <span className="inline-flex items-center gap-1 rounded bg-surface-subtle px-1.5 py-0.5 text-[11px] font-medium text-ink">
                                  <MapPin size={10} className="text-brand-highlight" aria-hidden="true" />
                                  {item.location.code}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Giá niêm yết */}
                          <td className="px-3 py-3 text-right font-bold tabular-nums text-ink whitespace-nowrap">
                            {formatVndPrice(item.listedPrice)}
                          </td>

                          {/* Trạng thái */}
                          <td className="px-3 py-3 text-center">
                            <Badge variant={statusBadgeVariant(item.status)} className="whitespace-nowrap">
                              {statusLabel(item.status)}
                            </Badge>
                          </td>

                          {/* Số lượng bản sao + Nút in nhanh */}
                          <td
                            className="px-3 py-3 text-right"
                            onClick={e => e.stopPropagation()}
                            onDoubleClick={e => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-2">
                              {isSelected && (
                                <CopyStepControl
                                  value={qty}
                                  itemName={item.name}
                                  onChange={next => updateCopies(item.id, next)}
                                />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPrint([item])}
                                startIcon={<Printer size={13} aria-hidden="true" />}
                                className="whitespace-nowrap shrink-0"
                              >
                                In tem
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phân trang chuẩn OCS */}
          {data && data.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-xs text-muted">
              <span>
                Trang {data.page} / {data.totalPages} · Tổng {data.totalCount.toLocaleString('vi-VN')} sản phẩm
              </span>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
                loading={loading}
              />
            </div>
          )}
        </Card>

        {/* Thanh tác vụ nổi (Sticky Bottom Bar) phẳng theo chuẩn OCS */}
        {selectedCount > 0 && (
          <div className="sticky bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-highlight/60 bg-paper/95 p-3 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-highlight text-xs font-extrabold text-white">
                {selectedCount}
              </div>
              <div>
                <p className="text-xs font-bold text-ink">
                  Đã chọn {selectedCount} sản phẩm · {totalSelectedLabels} tem nhãn
                </p>
                <p className="text-[11px] text-muted">
                  Ước tính {selectedLayoutEstimate.estimatedPages} trang A4 ({selectedLayoutEstimate.labelsPerPage} tem/trang · mẫu {activeTemplate.widthMm}×{activeTemplate.heightMm}mm)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="text-xs text-muted hover:text-ink whitespace-nowrap shrink-0"
              >
                Bỏ chọn
              </Button>

              <Button
                size="sm"
                onClick={() => handleOpenPrint()}
                startIcon={<Printer size={14} aria-hidden="true" />}
                className="whitespace-nowrap shrink-0"
              >
                In {totalSelectedLabels} tem
              </Button>
            </div>
          </div>
        )}

        {/* Modal quét mã vạch bằng camera */}
        <PosBarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Modal in tem barcode */}
        <BarcodePrintDialog
          open={printItems !== null}
          items={printItems || []}
          copiesMap={copiesMap}
          onCopiesChange={updateCopies}
          templateOverride={activeTemplate}
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
