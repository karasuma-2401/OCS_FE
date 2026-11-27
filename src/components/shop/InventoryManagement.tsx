import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Copy,
  ImageOff,
  LayoutGrid,
  List,
  MapPin,
  PackageSearch,
  Printer,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  Search,
  Sparkles,
  Warehouse,
  X,
} from "lucide-react";
import {
  inventoryApi,
  type InventoryDetail,
  type InventoryLocation,
  type InventoryProduct,
  type InventorySummary,
} from "@/api/inventory";
import { formatVndPrice, type PagedResponse } from "@/api/products";
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  Combobox,
  DetailSplitLayout,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeaderCard,
  Pagination,
  SkeletonLoading,
} from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { InventoryEditModal } from "@/components/shop/InventoryEditModal";
import { PosBarcodeScannerModal } from "@/components/shop/pos/PosBarcodeScannerModal";
import { InventoryDetailPanel } from "@/components/shop/inventory/InventoryDetailPanel";
import { InventoryLocationDrawer } from "@/components/shop/inventory/InventoryLocationDrawer";
import { InventoryCheckbox } from "@/components/shop/inventory/InventoryCheckbox";
import {
  InventorySummaryStrip,
  type InventoryQuickFilter,
} from "@/components/shop/inventory/InventorySummaryStrip";
import {
  inventoryErrorText,
  saleStatuses,
  sortOptions,
  statusBadgeVariant,
  statusLabel,
  UNASSIGNED_LOCATION_VALUE,
} from "@/components/shop/inventory/inventoryHelpers";

function ProductThumb({
  url,
  className = "size-12",
}: {
  url: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-surface-dashboard text-text-muted ${className}`}
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
        />
      ) : (
        <ImageOff size={18} aria-hidden="true" />
      )}
    </div>
  );
}

export function InventoryManagement() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Bộ lọc & phân trang
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);

  // Dữ liệu
  const [data, setData] = useState<PagedResponse<InventoryProduct> | null>(null);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState("");
  const [bulkFailures, setBulkFailures] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);

  // Modals & Drawers
  const [editOpen, setEditOpen] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [bulkOfferModalOpen, setBulkOfferModalOpen] = useState(false);

  // Chọn hàng loạt & Copy barcode
  const [selectedMap, setSelectedMap] = useState<Record<string, InventoryProduct>>({});
  const [bulkLocationId, setBulkLocationId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Record<string, number>>({});
  const [panelClosing, setPanelClosing] = useState(false);
  const flashTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const hasSwitchedViewRef = useRef(false);

  const flashUpdated = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const stamp = Date.now();
    setRecentlyUpdatedIds(Object.fromEntries(ids.map((id) => [id, stamp])));
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setRecentlyUpdatedIds({});
    }, 1500);
  }, []);

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  const detailRef = useRef<HTMLElement>(null);
  const actionErrorRef = useRef<HTMLDivElement>(null);
  const autoSelectBarcodeRef = useRef<string | null>(null);
  const tableInnerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const rowAccentVisibleRef = useRef(false);
  const [rowAccent, setRowAccent] = useState<{
    y: number;
    height: number;
    visible: boolean;
    animateMove: boolean;
  }>({ y: 0, height: 0, visible: false, animateMove: false });

  const canRead = hasPermission("products.read");
  const canEditLocation = hasPermission("products.location.update");
  const canOffer = hasPermission("products.offer");
  const canManageLocations = hasPermission("products.locations.manage");

  const hasFilters = Boolean(
    query || status || locationFilter || sourceType,
  );

  // Debounce live search nhẹ 300ms khi gõ
  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === query) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, query]);

  // Tải thống kê KPI & danh sách vị trí (chỉ reload khi mở trang hoặc có thay đổi dữ liệu)
  useEffect(() => {
    if (!canRead) {
      setSummaryLoading(false);
      return;
    }
    const controller = new AbortController();
    setSummaryLoading((prev) => (summary === null ? true : prev));
    Promise.all([
      inventoryApi.locations(controller.signal),
      inventoryApi.summary(controller.signal).catch(() => null),
    ])
      .then(([places, summaryData]) => {
        setLocations(places);
        if (summaryData) setSummary(summaryData);
      })
      .catch(() => {
        // Bỏ qua nếu bị hủy hoặc lỗi tạm thời; lỗi chính xử lý ở list
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummaryLoading(false);
      });
    return () => controller.abort();
  }, [refresh, canRead]);

  // Tải danh sách sản phẩm theo bộ lọc & phân trang (giữ danh sách hiện tại để hiệu ứng trượt không bị khựng)
  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");

    const isUnassigned = locationFilter === UNASSIGNED_LOCATION_VALUE;

    inventoryApi
      .list(
        {
          page,
          pageSize: 20,
          q: query || undefined,
          status: status || undefined,
          locationId:
            locationFilter && !isUnassigned ? locationFilter : undefined,
          unassignedLocation: isUnassigned || undefined,
          sourceType: sourceType || undefined,
          sort: sort !== "newest" ? sort : undefined,
        },
        controller.signal,
      )
      .then((items) => {
        setData(items);
        setHighlightedId((prev) =>
          prev && items.items.some((x) => x.id === prev) ? prev : null,
        );

        // Nếu vừa quét camera barcode và có kết quả khớp, tự động mở chi tiết
        if (autoSelectBarcodeRef.current && items.items.length > 0) {
          const target = autoSelectBarcodeRef.current.toLowerCase();
          const matched =
            items.items.find((x) => x.barcode.toLowerCase() === target) ??
            (items.items.length === 1 ? items.items[0] : undefined);
          if (matched) {
            setHighlightedId(matched.id);
            setSelectedId(matched.id);
          }
          autoSelectBarcodeRef.current = null;
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(inventoryErrorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [
    page,
    query,
    status,
    locationFilter,
    sourceType,
    sort,
    refresh,
    canRead,
  ]);

  // Tải chi tiết sản phẩm
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    setDetail((current) =>
      current?.product.id === selectedId ? current : null,
    );
    setDetailError("");
    setDetailLoading(true);
    inventoryApi
      .detail(selectedId, controller.signal)
      .then(setDetail)
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setDetailError(inventoryErrorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, refresh]);

  useEffect(() => {
    if (!selectedId || !window.matchMedia("(max-width: 1023px)").matches)
      return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    detailRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    detailRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

  useEffect(() => {
    if (actionError) actionErrorRef.current?.focus();
  }, [actionError]);

  const updateRowAccent = useCallback(() => {
    if (!highlightedId || viewMode !== "table") {
      rowAccentVisibleRef.current = false;
      setRowAccent((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
      return;
    }
    const rowEl = rowRefs.current[highlightedId];
    const tableEl = tableRef.current;
    if (!rowEl || !tableEl) {
      rowAccentVisibleRef.current = false;
      setRowAccent((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
      return;
    }
    const y = rowEl.offsetTop + tableEl.offsetTop;
    const height = rowEl.offsetHeight;
    const animateMove = rowAccentVisibleRef.current;
    rowAccentVisibleRef.current = true;
    setRowAccent({ y, height, visible: true, animateMove });
  }, [highlightedId, viewMode]);

  useLayoutEffect(() => {
    updateRowAccent();
  }, [updateRowAccent, data?.items]);

  useEffect(() => {
    const container = tableInnerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateRowAccent();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateRowAccent]);

  const runAction = useCallback(
    async (operation: () => Promise<unknown>, successMessage: string) => {
      setBusy(true);
      setActionError("");
      setBulkFailures([]);
      try {
        await operation();
        toast.success(successMessage);
        if (selectedId) flashUpdated([selectedId]);
        setRefresh((current) => current + 1);
        return true;
      } catch (error) {
        setActionError(inventoryErrorText(error));
        if (
          (error as { response?: { status?: number } }).response?.status === 409
        ) {
          setRefresh((current) => current + 1);
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast, selectedId, flashUpdated],
  );

  function highlightProduct(product: InventoryProduct) {
    setHighlightedId(product.id);
  }

  function selectProduct(product: InventoryProduct) {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPanelClosing(false);
    setHighlightedId(product.id);
    if (product.id === selectedId) {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        detailRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
        detailRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    setSelectedId(product.id);
    setActionError("");
  }

  function closeDetailPanel() {
    if (!selectedId || panelClosing) return;
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setSelectedId(null);
      setPanelClosing(false);
      document.getElementById("inventory-search")?.focus();
      return;
    }
    setPanelClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setSelectedId(null);
      setPanelClosing(false);
      document.getElementById("inventory-search")?.focus();
    }, 190);
  }

  function switchViewMode(nextMode: "table" | "grid") {
    if (nextMode === viewMode) return;
    hasSwitchedViewRef.current = true;
    setViewMode(nextMode);
  }

  function resetFilters() {
    setSearch("");
    setQuery("");
    setStatus("");
    setLocationFilter("");
    setSourceType("");
    setSort("newest");
    setPage(1);
    setHighlightedId(null);
    setSelectedId(null);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function handleQuickFilter(filter: InventoryQuickFilter) {
    setPage(1);
    setSearch("");
    setQuery("");
    setSourceType("");
    setHighlightedId(null);
    setSelectedId(null);
    if (filter === "all") {
      setStatus("");
      setLocationFilter("");
    } else if (filter === "pendingProcessing") {
      setStatus("PendingProcessing");
      setLocationFilter("");
    } else if (filter === "unassigned") {
      setStatus("");
      setLocationFilter(UNASSIGNED_LOCATION_VALUE);
    } else if (filter === "onSale") {
      setStatus("OnSale");
      setLocationFilter("");
    } else if (filter === "expired") {
      setStatus("Expired");
      setLocationFilter("");
    }
  }

  const activeQuickFilter = useMemo<InventoryQuickFilter | null>(() => {
    if (query || sourceType) return null;
    if (!status && !locationFilter) return "all";
    if (status === "PendingProcessing" && !locationFilter)
      return "pendingProcessing";
    if (!status && locationFilter === UNASSIGNED_LOCATION_VALUE)
      return "unassigned";
    if (status === "OnSale" && !locationFilter) return "onSale";
    if (status === "Expired" && !locationFilter) return "expired";
    return null;
  }, [query, sourceType, status, locationFilter]);

  function copyBarcode(barcode: string, id: string) {
    void navigator.clipboard?.writeText(barcode);
    setCopiedId(id);
    toast.info(`Đã sao chép barcode ${barcode}`);
    window.setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 1500);
  }

  // Chọn hàng loạt
  const itemsOnPage = data?.items ?? [];
  const selectedItems = Object.values(selectedMap);
  const selectedCount = selectedItems.length;
  const allOnPageSelected =
    itemsOnPage.length > 0 &&
    itemsOnPage.every((item) => Boolean(selectedMap[item.id]));
  const someOnPageSelected =
    itemsOnPage.some((item) => Boolean(selectedMap[item.id])) &&
    !allOnPageSelected;

  function toggleRowSelection(item: InventoryProduct) {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allOnPageSelected) {
        itemsOnPage.forEach((item) => delete next[item.id]);
      } else {
        itemsOnPage.forEach((item) => {
          next[item.id] = item;
        });
      }
      return next;
    });
  }

  async function handleBulkAssignLocation() {
    if (!bulkLocationId || selectedCount === 0 || busy) return;
    setBusy(true);
    setActionError("");
    setBulkFailures([]);
    const targetIds = selectedItems.map((x) => x.id);
    try {
      const result = await inventoryApi.bulkChangeLocation(
        selectedItems.map((x) => ({ id: x.id, expectedVersion: x.version })),
        bulkLocationId,
      );
      if (result.succeededCount > 0) {
        toast.success(`Đã xếp vị trí cho ${result.succeededCount} sản phẩm.`);
        const failedSet = new Set(result.failures.map((f) => f.id));
        flashUpdated(targetIds.filter((id) => !failedSet.has(id)));
      }
      if (result.failures.length > 0) {
        setBulkFailures(result.failures.map((f) => f.message));
      } else {
        setSelectedMap({});
        setBulkLocationId("");
      }
      setRefresh((c) => c + 1);
    } catch (error) {
      setActionError(inventoryErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkOffer() {
    if (selectedCount === 0 || busy) return;
    setBusy(true);
    setActionError("");
    setBulkFailures([]);
    const targetIds = selectedItems.map((x) => x.id);
    try {
      const result = await inventoryApi.bulkOffer(
        selectedItems.map((x) => ({ id: x.id, expectedVersion: x.version })),
      );
      setBulkOfferModalOpen(false);
      if (result.succeededCount > 0) {
        toast.success(`Đã đưa ${result.succeededCount} sản phẩm lên bán.`);
        const failedSet = new Set(result.failures.map((f) => f.id));
        flashUpdated(targetIds.filter((id) => !failedSet.has(id)));
      }
      if (result.failures.length > 0) {
        setBulkFailures(result.failures.map((f) => f.message));
      } else {
        setSelectedMap({});
      }
      setRefresh((c) => c + 1);
    } catch (error) {
      setBulkOfferModalOpen(false);
      setActionError(inventoryErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  const product =
    detail?.product.id === selectedId ? detail.product : undefined;

  if (!canRead) {
    return (
      <Card className="!bg-white">
        <p role="alert" className="text-sm text-state-danger">
          Bạn chưa được cấp quyền xem kho. Liên hệ quản trị viên để được hỗ trợ.
        </p>
      </Card>
    );
  }

  return (
    <section aria-labelledby="inventory-title" className="space-y-5">
      <PageHeaderCard
        titleId="inventory-title"
        icon={<PackageSearch size={24} aria-hidden="true" />}
        title="Sản phẩm & kho"
        description="Theo dõi trạng thái, xếp vị trí kệ kho, mở bán và in tem barcode."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              startIcon={<Warehouse size={16} aria-hidden="true" />}
              className="border-brand-lavender bg-white enabled:hover:border-brand-highlight"
              onClick={() => setLocationDrawerOpen(true)}
            >
              Vị trí kho ({locations.length})
              {(summary?.unassignedLocationCount ?? 0) > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full border border-state-warning-border bg-state-warning-muted px-2 py-0.5 align-middle text-xs font-bold text-state-warning-strong">
                  {summary?.unassignedLocationCount} chưa xếp
                </span>
              )}
            </Button>
            <Button
              size="md"
              startIcon={<Printer size={16} aria-hidden="true" />}
              onClick={() => navigate("/shop/inventory/barcode")}
            >
              In barcode
            </Button>
          </>
        }
      />

      {/* Dải KPI tương tác */}
      <InventorySummaryStrip
        summary={summary}
        loading={summaryLoading}
        activeQuickFilter={activeQuickFilter}
        onSelectQuickFilter={handleQuickFilter}
      />

      {actionError && (
        <div ref={actionErrorRef} tabIndex={-1} className="focus:outline-none">
          <AlertBanner
            variant="error"
            title="Không thể thực hiện thao tác"
            message={actionError}
            onClose={() => setActionError("")}
          />
        </div>
      )}

      {loadError && data && (
        <AlertBanner
          variant="error"
          title="Không thể cập nhật danh sách"
          message={loadError}
          action={{ label: "Thử lại", onClick: () => setRefresh((c) => c + 1) }}
          onClose={() => setLoadError("")}
        />
      )}

      {bulkFailures.length > 0 && (
        <AlertBanner
          variant="warning"
          title={`Có ${bulkFailures.length} sản phẩm chưa xử lý được`}
          description={
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {bulkFailures.slice(0, 5).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {bulkFailures.length > 5 && (
                <li>…và {bulkFailures.length - 5} mục khác.</li>
              )}
            </ul>
          }
          onClose={() => setBulkFailures([])}
        />
      )}

      <DetailSplitLayout open={Boolean(selectedId)}>
        <Card className="min-w-0 !bg-white !p-0">
          {/* Header & Bộ lọc */}
          <div className="border-b border-border px-4 py-5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-brand-ink">
                  Danh sách sản phẩm
                </h3>
                {data && !loading && !loadError && (
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Hiển thị{" "}
                    <span className="font-semibold tabular-nums text-brand-ink">
                      {data.items.length}
                    </span>{" "}
                    /{" "}
                    <span className="font-semibold tabular-nums text-brand-ink">
                      {data.totalCount.toLocaleString("vi-VN")}
                    </span>{" "}
                    sản phẩm{hasFilters ? " phù hợp bộ lọc" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div
                  role="group"
                  aria-label="Chế độ hiển thị"
                  className="relative grid grid-cols-2 rounded-xl border border-border bg-surface-dashboard p-1"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-xs transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${
                      viewMode === "grid" ? "translate-x-full" : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    aria-pressed={viewMode === "table"}
                    onClick={() => switchViewMode("table")}
                    className={`relative z-10 inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors duration-200 ${
                      viewMode === "table"
                        ? "text-brand-ink"
                        : "text-muted hover:text-brand-ink"
                    }`}
                  >
                    <List size={14} aria-hidden="true" />
                    Bảng
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => switchViewMode("grid")}
                    className={`relative z-10 inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors duration-200 ${
                      viewMode === "grid"
                        ? "text-brand-ink"
                        : "text-muted hover:text-brand-ink"
                    }`}
                  >
                    <LayoutGrid size={14} aria-hidden="true" />
                    Lưới ảnh
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Làm mới danh sách"
                  disabled={loading}
                  onClick={() => setRefresh((c) => c + 1)}
                  startIcon={
                    <RefreshCw
                      size={14}
                      aria-hidden="true"
                      className={loading ? "animate-spin motion-reduce:animate-none" : ""}
                    />
                  }
                >
                  Làm mới
                </Button>
              </div>
            </div>

            {/* Thanh tìm kiếm + Camera quét barcode */}
            <form onSubmit={submitSearch} className="mt-4 flex flex-wrap gap-2">
              <div className="min-w-[220px] flex-1">
                <Input
                  id="inventory-search"
                  aria-label="Tìm theo tên, thương hiệu hoặc barcode"
                  startAdornment={<Search size={18} aria-hidden="true" />}
                  endAdornment={
                    search ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setQuery("");
                          setPage(1);
                        }}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="rounded-md p-1 text-muted hover:bg-surface-dashboard hover:text-brand-ink"
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    ) : undefined
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên sản phẩm, thương hiệu hoặc barcode…"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setScannerOpen(true)}
                startIcon={<ScanBarcode size={17} aria-hidden="true" />}
              >
                Quét mã
              </Button>
              <Button type="submit" size="md">
                Tìm kiếm
              </Button>
            </form>

            {/* Bộ lọc 4 cột */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Combobox
                label="Trạng thái bán"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                  setHighlightedId(null);
                  setSelectedId(null);
                }}
                options={[
                  { value: "", label: "Tất cả trạng thái" },
                  ...saleStatuses.map((value) => ({
                    value,
                    label: statusLabel(value),
                  })),
                ]}
              />
              <Combobox
                label="Vị trí kho"
                value={locationFilter}
                onChange={(value) => {
                  setLocationFilter(value);
                  setPage(1);
                  setHighlightedId(null);
                  setSelectedId(null);
                }}
                options={[
                  { value: "", label: "Tất cả vị trí" },
                  {
                    value: UNASSIGNED_LOCATION_VALUE,
                    label: "Chưa xếp vị trí",
                  },
                  ...locations.map((place) => ({
                    value: place.id,
                    label: `${place.code} — ${place.name}${
                      place.productCount !== undefined
                        ? ` (${place.productCount})`
                        : ""
                    }`,
                  })),
                ]}
              />
              <Combobox
                label="Nguồn hàng"
                value={sourceType}
                onChange={(value) => {
                  setSourceType(value);
                  setPage(1);
                  setHighlightedId(null);
                  setSelectedId(null);
                }}
                options={[
                  { value: "", label: "Tất cả nguồn" },
                  { value: "Consignment", label: "Ký gửi" },
                  { value: "Buyout", label: "Mua đứt" },
                ]}
              />
              <Combobox
                label="Sắp xếp"
                value={sort}
                onChange={(value) => {
                  setSort(value);
                  setPage(1);
                }}
                options={[...sortOptions]}
              />
            </div>

            {hasFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2 animate-inv-fade-in">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setQuery("");
                      setPage(1);
                    }}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brand-pink/40 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink transition hover:border-brand-pink hover:bg-brand-pink-surface"
                  >
                    <span>Từ khóa: “{query}”</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                {status && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("");
                      setPage(1);
                      setHighlightedId(null);
                      setSelectedId(null);
                    }}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brand-pink/40 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink transition hover:border-brand-pink hover:bg-brand-pink-surface"
                  >
                    <span>Trạng thái: {statusLabel(status)}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                {locationFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationFilter("");
                      setPage(1);
                      setHighlightedId(null);
                      setSelectedId(null);
                    }}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brand-pink/40 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink transition hover:border-brand-pink hover:bg-brand-pink-surface"
                  >
                    <span>
                      Vị trí:{" "}
                      {locationFilter === UNASSIGNED_LOCATION_VALUE
                        ? "Chưa xếp"
                        : (locations.find((l) => l.id === locationFilter)?.code ??
                          "Đã chọn")}
                    </span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                {sourceType && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType("");
                      setPage(1);
                      setHighlightedId(null);
                      setSelectedId(null);
                    }}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brand-pink/40 bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink transition hover:border-brand-pink hover:bg-brand-pink-surface"
                  >
                    <span>
                      Nguồn: {sourceType === "Consignment" ? "Ký gửi" : "Mua đứt"}
                    </span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-brand-pink-surface px-2.5 py-0.5 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-light focus-visible:outline-2 focus-visible:outline-brand-highlight"
                >
                  <RotateCcw size={12} aria-hidden="true" /> Xóa tất cả
                </button>
              </div>
            )}
          </div>

          {/* Thanh tiến trình mảnh khi tải lại bộ lọc mà không xóa bảng */}
          <div className="relative h-0.5 w-full overflow-hidden bg-transparent" aria-hidden="true">
            {loading && data && (
              <div className="animate-inv-progress-indeterminate h-full w-1/3 rounded-full bg-brand-pink" />
            )}
          </div>

          {/* Nội dung danh sách */}
          {loading && !data ? (
            <SkeletonLoading
              variant={viewMode === "grid" ? "products" : "table"}
              count={5}
              columns={6}
              label="Đang tải sản phẩm trong kho"
              className="p-5 sm:p-6"
            />
          ) : loadError && !data ? (
            <div className="p-5">
              <ErrorState
                title="Không thể tải danh sách"
                description={loadError}
                onRetry={() => setRefresh((current) => current + 1)}
              />
            </div>
          ) : !data?.items.length ? (
            <EmptyState
              className="rounded-none border-0 !bg-white py-14"
              icon={<PackageSearch size={24} aria-hidden="true" />}
              title={
                hasFilters
                  ? "Không tìm thấy sản phẩm phù hợp"
                  : "Chưa có sản phẩm trong kho"
              }
              description={
                hasFilters
                  ? "Thử từ khóa khác hoặc xóa bộ lọc để xem lại toàn bộ kho."
                  : "Sản phẩm ký gửi hoặc mua đứt sau khi tiếp nhận sẽ xuất hiện tại đây."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              className={`transition-opacity duration-150 ${
                loading ? "pointer-events-none opacity-60" : "opacity-100"
              }`}
            >
              {viewMode === "grid" ? (
                <div key="grid-view" className="animate-inv-slide-from-right p-4 sm:p-6">
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs text-text-secondary">
                    <div className="inline-flex items-center gap-2 font-semibold text-brand-ink">
                      <InventoryCheckbox
                        checked={allOnPageSelected}
                        indeterminate={someOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        ariaLabel={`Chọn tất cả trên trang (${itemsOnPage.length})`}
                      />
                      <span>Chọn tất cả trên trang ({itemsOnPage.length})</span>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.items.map((item) => {
                      const isHighlighted =
                        highlightedId === item.id || selectedId === item.id;
                      const isChecked = Boolean(selectedMap[item.id]);
                      const isUpdated = Boolean(recentlyUpdatedIds[item.id]);
                      return (
                        <div
                          key={item.id}
                          onClick={() => !busy && highlightProduct(item)}
                          onDoubleClick={() => !busy && selectProduct(item)}
                          className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-paper transition-[border-color,background-color,box-shadow,transform] duration-200 ${
                            isHighlighted
                              ? "border-brand-highlight/60 bg-brand-pink-surface/50 shadow-sm"
                              : "border-border hover:-translate-y-0.5 hover:border-brand-lavender hover:shadow-md"
                          } ${isUpdated ? "animate-inv-row-flash" : ""}`}
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-dashboard">
                            {item.coverImageUrl ? (
                              <img
                                src={item.coverImageUrl}
                                alt={item.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-text-muted">
                                <ImageOff size={28} aria-hidden="true" />
                              </div>
                            )}
                            <div
                              className="absolute left-2.5 top-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <InventoryCheckbox
                                checked={isChecked}
                                onChange={() => toggleRowSelection(item)}
                                ariaLabel={`Chọn ${item.name}`}
                                className="shadow-sm"
                              />
                            </div>
                            <span className="absolute right-2.5 top-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-brand-ink shadow-xs">
                              {item.sourceType === "Consignment"
                                ? "Ký gửi"
                                : "Mua đứt"}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="line-clamp-1 text-sm font-bold text-brand-ink">
                                {item.name}
                              </h4>
                              <span className="shrink-0 text-xs font-semibold text-muted">
                                {item.conditionPercentage}%
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-text-secondary">
                              {item.brand} · Size {item.size} · {item.category}
                            </p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyBarcode(item.barcode, item.id);
                                }}
                                title="Sao chép mã barcode"
                                aria-label={`Sao chép mã barcode ${item.barcode}`}
                                className="inline-flex items-center gap-1 rounded-md bg-surface-dashboard px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-ink transition hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight"
                              >
                                {item.barcode}
                                {copiedId === item.id ? (
                                  <Check size={11} className="animate-inv-pop text-state-success" aria-hidden="true" />
                                ) : (
                                  <Copy size={10} className="text-muted" aria-hidden="true" />
                                )}
                              </button>
                              {copiedId === item.id && (
                                <span className="animate-inv-pop rounded-full bg-state-success-soft px-1.5 py-0.5 text-[10px] font-bold text-state-success-strong">
                                  Đã chép!
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              <Badge variant={statusBadgeVariant(item.status)}>
                                {item.approvalStatus === "Rejected" ? "Từ chối tiếp nhận · " : ""}{statusLabel(item.status)}
                              </Badge>
                            </div>
                            <div className="mt-auto pt-3">
                              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                                <span className="text-sm font-bold tabular-nums text-brand-highlight">
                                  {formatVndPrice(item.listedPrice)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                      item.location
                                        ? "text-text-secondary"
                                        : "text-state-warning-strong"
                                    }`}
                                  >
                                    <MapPin size={12} aria-hidden="true" />
                                    {item.location?.code ?? "Chưa xếp"}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectProduct(item);
                                    }}
                                    aria-label={`Xem chi tiết ${item.name}, barcode ${item.barcode}`}
                                    className="inline-flex size-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight"
                                  >
                                    <ChevronRight size={16} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  key="table-view"
                  className={
                    hasSwitchedViewRef.current
                      ? "animate-inv-slide-from-left"
                      : "animate-inv-fade-in"
                  }
                >
                  {/* Table Desktop */}
                  <div className="hidden overflow-x-auto md:block">
                    <div ref={tableInnerRef} className="relative min-w-[740px]">
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute left-0 top-0 z-10 w-1 rounded-r bg-brand-pink motion-reduce:transition-none ${
                          rowAccent.animateMove
                            ? "transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
                            : "transition-opacity duration-200"
                        }`}
                        style={{
                          height: `${rowAccent.height}px`,
                          transform: `translate3d(0, ${rowAccent.y}px, 0)`,
                          opacity: rowAccent.visible ? 1 : 0,
                        }}
                      />
                      <table ref={tableRef} className="w-full text-left text-sm">
                      <thead className="bg-surface-dashboard/70 text-xs font-semibold text-text-secondary">
                        <tr>
                          <th scope="col" className="w-11 px-4 py-3 text-center">
                            <InventoryCheckbox
                              checked={allOnPageSelected}
                              indeterminate={someOnPageSelected}
                              onChange={toggleSelectAllOnPage}
                              ariaLabel="Chọn tất cả sản phẩm trên trang"
                            />
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Sản phẩm
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Giá bán
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Vị trí
                          </th>
                          <th scope="col" className="px-3 py-3">
                            Trạng thái
                          </th>
                          <th scope="col" className="w-12 px-3 py-3">
                            <span className="sr-only">Chi tiết</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {data.items.map((item) => {
                          const isHighlighted =
                            highlightedId === item.id || selectedId === item.id;
                          const isChecked = Boolean(selectedMap[item.id]);
                          const isUpdated = Boolean(recentlyUpdatedIds[item.id]);
                          return (
                            <tr
                              key={item.id}
                              ref={(node) => {
                                rowRefs.current[item.id] = node;
                              }}
                              tabIndex={0}
                              aria-selected={isHighlighted || undefined}
                              onClick={() => !busy && highlightProduct(item)}
                              onDoubleClick={() => !busy && selectProduct(item)}
                              onKeyDown={(event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  if (!busy) selectProduct(item);
                                } else if (event.key === " ") {
                                  event.preventDefault();
                                  if (!busy) highlightProduct(item);
                                }
                              }}
                              className={`group cursor-pointer transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-brand-pink-focus ${
                                isHighlighted
                                  ? "bg-brand-pink-surface"
                                  : "hover:bg-surface-active"
                              } ${isUpdated ? "animate-inv-row-flash" : ""}`}
                            >
                              <td
                                className="px-4 py-3.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <InventoryCheckbox
                                  checked={isChecked}
                                  onChange={() => toggleRowSelection(item)}
                                  ariaLabel={`Chọn ${item.name}`}
                                />
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="flex min-w-0 items-center gap-3">
                                  <ProductThumb url={item.coverImageUrl} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate font-bold text-brand-ink">
                                        {item.name}
                                      </span>
                                      <span className="rounded-md bg-surface-dashboard px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                                        {item.sourceType === "Consignment"
                                          ? "Ký gửi"
                                          : "Mua đứt"}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyBarcode(item.barcode, item.id);
                                        }}
                                        title="Sao chép mã barcode"
                                        aria-label={`Sao chép mã barcode ${item.barcode}`}
                                        className="inline-flex items-center gap-1 rounded bg-surface-dashboard px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-ink transition hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight"
                                      >
                                        <span>{item.barcode}</span>
                                        {copiedId === item.id ? (
                                          <Check
                                            size={11}
                                            className="animate-inv-pop text-state-success"
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <Copy
                                            size={10}
                                            className="text-muted"
                                            aria-hidden="true"
                                          />
                                        )}
                                      </button>
                                      {copiedId === item.id && (
                                        <span className="animate-inv-pop rounded-full bg-state-success-soft px-1.5 py-0.5 text-[10px] font-bold text-state-success-strong">
                                          Đã chép!
                                        </span>
                                      )}
                                      <span>
                                        {item.brand} · Size {item.size} ·{" "}
                                        {item.conditionPercentage}%
                                      </span>
                                      {item.sourceType === "Buyout" &&
                                        item.sourceReference && (
                                          <span className="text-muted">
                                            · Phiếu {item.sourceReference}
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 font-bold tabular-nums text-brand-ink whitespace-nowrap">
                                {formatVndPrice(item.listedPrice)}
                              </td>
                              <td className="px-3 py-3.5 whitespace-nowrap">
                                {item.location ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-surface-dashboard px-2 py-1 text-xs font-semibold text-brand-ink">
                                    <MapPin
                                      size={12}
                                      className="text-brand-highlight"
                                      aria-hidden="true"
                                    />
                                    {item.location.code}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-state-warning-soft px-2 py-1 text-xs font-semibold text-state-warning-strong">
                                    Chưa xếp
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3.5">
                                <Badge
                                  variant={statusBadgeVariant(item.status)}
                                  className="whitespace-nowrap"
                                >
                                  {item.approvalStatus === "Rejected" ? "Từ chối tiếp nhận · " : ""}{statusLabel(item.status)}
                                </Badge>
                              </td>
                              <td
                                className="px-3 py-3.5 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => selectProduct(item)}
                                  aria-label={`Xem chi tiết ${item.name}, barcode ${item.barcode}`}
                                  className="inline-flex size-10 items-center justify-center rounded-xl text-text-muted transition-all duration-150 group-hover:translate-x-0.5 hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-wait"
                                >
                                  <ChevronRight size={18} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="flex items-center justify-between border-b border-border/60 bg-surface-dashboard/50 px-4 py-2.5 text-xs md:hidden">
                    <div className="inline-flex items-center gap-2 font-semibold text-brand-ink">
                      <InventoryCheckbox
                        checked={allOnPageSelected}
                        indeterminate={someOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        ariaLabel={`Chọn tất cả trên trang (${itemsOnPage.length})`}
                      />
                      <span>Chọn tất cả trên trang ({itemsOnPage.length})</span>
                    </div>
                  </div>
                  <ul className="divide-y divide-border/60 md:hidden">
                    {data.items.map((item) => {
                      const isSelectedRow = selectedId === item.id;
                      const isChecked = Boolean(selectedMap[item.id]);
                      const isUpdated = Boolean(recentlyUpdatedIds[item.id]);
                      return (
                        <li
                          key={item.id}
                          onClick={() => !busy && selectProduct(item)}
                          className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors ${
                            isSelectedRow
                              ? "bg-brand-pink-surface"
                              : "hover:bg-surface-active"
                          } ${isUpdated ? "animate-inv-row-flash" : ""}`}
                        >
                          <div
                            className="pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InventoryCheckbox
                              checked={isChecked}
                              onChange={() => toggleRowSelection(item)}
                              ariaLabel={`Chọn ${item.name}`}
                            />
                          </div>
                          <ProductThumb url={item.coverImageUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="truncate font-bold text-brand-ink">
                                {item.name}
                              </span>
                              <ChevronRight
                                size={18}
                                className="shrink-0 text-text-muted"
                                aria-hidden="true"
                              />
                            </div>
                            <p className="mt-1 font-mono text-xs font-semibold text-text-secondary">
                              {item.barcode} · {item.brand}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant={statusBadgeVariant(item.status)}>
                                {item.approvalStatus === "Rejected" ? "Từ chối tiếp nhận · " : ""}{statusLabel(item.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-text-secondary">
                              <strong className="tabular-nums text-brand-ink">
                                {formatVndPrice(item.listedPrice)}
                              </strong>{" "}
                              · {item.location?.code ?? "Chưa xếp vị trí"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Shared Pagination */}
              {data.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-6">
                  <p className="text-xs text-text-secondary">
                    Trang{" "}
                    <strong className="tabular-nums text-brand-ink">
                      {page}
                    </strong>{" "}
                    / {data.totalPages} ·{" "}
                    <strong className="tabular-nums text-brand-ink">
                      {data.totalCount.toLocaleString("vi-VN")}
                    </strong>{" "}
                    sản phẩm
                  </p>
                  <Pagination
                    page={page}
                    totalPages={data.totalPages}
                    loading={loading}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </Card>

        {selectedId && (
          <InventoryDetailPanel
            panelRef={detailRef}
            selectedId={selectedId}
            detail={detail}
            detailLoading={detailLoading}
            detailError={detailError}
            busy={busy}
            locations={locations}
            canCreate={hasPermission("products.create")}
            canOffer={canOffer}
            canEditLocation={canEditLocation}
            canUpdatePrice={hasPermission("products.price.update")}
            canReportIncident={
              hasPermission("incidents.read") && hasPermission("incidents.create")
            }
            panelClassName={
              panelClosing ? "animate-inv-panel-out" : "animate-inv-panel-in"
            }
            onClose={closeDetailPanel}
            onRetry={() => setRefresh((c) => c + 1)}
            onRunAction={runAction}
            onOpenEditModal={() => setEditOpen(true)}
            onCopiedBarcode={(barcode) =>
              toast.info(`Đã sao chép barcode ${barcode}`)
            }
          />
        )}
      </DetailSplitLayout>

      {/* Thanh tác vụ hàng loạt (Sticky Bottom Bar) */}
      {selectedCount > 0 && (
        <div
          role="region"
          aria-label="Thao tác hàng loạt"
          className="animate-inv-bar-up sticky bottom-4 z-30 mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-lavender bg-white/95 p-3.5 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span
              key={selectedCount}
              className="animate-inv-pop flex size-9 items-center justify-center rounded-xl bg-brand-highlight text-sm font-extrabold text-white"
            >
              {selectedCount}
            </span>
            <div>
              <p className="text-sm font-bold text-brand-ink">
                Đã chọn {selectedCount} sản phẩm
              </p>
              <button
                type="button"
                onClick={() => setSelectedMap({})}
                className="text-xs font-semibold text-brand-highlight hover:underline"
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditLocation && (
              <div className="flex items-center gap-1.5">
                <Combobox
                  size="sm"
                  className="w-44"
                  ariaLabel="Chọn vị trí gán hàng loạt"
                  placeholder="Chọn vị trí kho…"
                  value={bulkLocationId}
                  onChange={setBulkLocationId}
                  options={locations.map((place) => ({
                    value: place.id,
                    label: `${place.code} — ${place.name}`,
                  }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!bulkLocationId || busy}
                  onClick={() => void handleBulkAssignLocation()}
                  startIcon={<MapPin size={14} aria-hidden="true" />}
                >
                  Gán vị trí
                </Button>
              </div>
            )}

            {canOffer && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setBulkOfferModalOpen(true)}
                startIcon={<Sparkles size={14} aria-hidden="true" />}
              >
                Đưa lên bán
              </Button>
            )}

            <Button
              size="sm"
              disabled={busy}
              startIcon={<Printer size={14} aria-hidden="true" />}
              onClick={() =>
                navigate("/shop/inventory/barcode", {
                  state: { preselectedProducts: selectedItems },
                })
              }
            >
              In barcode ({selectedCount})
            </Button>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa chi tiết */}
      {editOpen && product && (
        <InventoryEditModal
          product={product}
          locations={locations}
          canEditDetails={hasPermission("products.create")}
          canEditLocation={canEditLocation}
          canOffer={canOffer}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => {
            flashUpdated([updated.id]);
            setDetail((current) =>
              current && current.product.id === updated.id
                ? {
                    ...current,
                    product: {
                      ...updated,
                      coverImageUrl: current.product.coverImageUrl,
                    },
                  }
                : current,
            );
            setRefresh((current) => current + 1);
          }}
          onStale={() => setRefresh((current) => current + 1)}
        />
      )}

      {/* Drawer Sơ đồ kệ & Vị trí kho */}
      <InventoryLocationDrawer
        open={locationDrawerOpen}
        locations={locations}
        unassignedCount={summary?.unassignedLocationCount ?? 0}
        selectedLocationId={locationFilter}
        canManageLocations={canManageLocations}
        onClose={() => setLocationDrawerOpen(false)}
        onSelectLocation={(locId) => {
          setLocationFilter(locId);
          setPage(1);
        }}
        onLocationCreated={(created) => {
          toast.success(`Đã thêm vị trí ${created.code} — ${created.name}`);
          setRefresh((c) => c + 1);
        }}
      />

      {/* Camera Quét Barcode */}
      <PosBarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          autoSelectBarcodeRef.current = code;
          setSearch(code);
          setQuery(code);
          setPage(1);
          toast.info(`Đã quét mã ${code}`);
        }}
      />

      {/* Modal xác nhận mở bán hàng loạt */}
      <Modal
        open={bulkOfferModalOpen}
        onClose={() => setBulkOfferModalOpen(false)}
        disabled={busy}
        className="max-w-md"
        title="Đưa sản phẩm lên bán hàng loạt"
        description={`Áp dụng cho ${selectedCount} sản phẩm đang chọn`}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setBulkOfferModalOpen(false)}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button loading={busy} onClick={() => void handleBulkOffer()}>
              Xác nhận mở bán
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Hệ thống sẽ đưa các sản phẩm đủ điều kiện (đã xếp vị trí
          kho, nguồn hàng còn hiệu lực) sang trạng thái{" "}
          <strong>Đang bán</strong>. Các sản phẩm chưa đủ điều kiện sẽ được liệt
          kê riêng để bạn bổ sung sau.
        </p>
      </Modal>
    </section>
  );
}
