import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  ImageOff,
  Plus,
  Printer,
  PackageSearch,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import {
  inventoryApi,
  type InventoryDetail,
  type InventoryLocation,
  type InventoryProduct,
} from "@/api/inventory";
import { formatVndPrice, type PagedResponse } from "@/api/products";
import {
  Badge,
  Button,
  Combobox,
  ErrorState,
  Input,
  Modal,
  PageHeaderCard,
  SkeletonLoading,
} from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { BarcodePrintDialog } from "@/components/shop/BarcodeLabels";
import { BarcodeTemplateModal } from "@/components/shop/BarcodeTemplateModal";
import type { BarcodeLabelProduct } from "@/api/barcode";

const control =
  "w-full min-h-10 rounded-control border border-border bg-white px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight";
const fieldLabel = "block text-sm font-medium text-text-primary";
const statusLabels: Record<string, string> = {
  PendingProcessing: "Chờ xử lý",
  OnSale: "Đang bán",
  Sold: "Đã bán",
  Expired: "Hết hạn",
  Donated: "Đã quyên góp",
  Returned: "Đã trả",
  EarlyWithdrawn: "Rút trước hạn",
  Compensated: "Đã bồi thường",
  Cancelled: "Đã hủy",
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Từ chối",
};
const saleStatuses = [
  "PendingProcessing",
  "OnSale",
  "Sold",
  "Expired",
  "Returned",
  "Donated",
  "EarlyWithdrawn",
  "Compensated",
  "Cancelled",
];
const approvalStatuses = ["Pending", "Approved"];
const label = (value: string | null) =>
  value ? (statusLabels[value] ?? value) : "—";

function errorText(error: unknown) {
  const problem = error as {
    response?: { status?: number; data?: { title?: string } };
  };
  if (problem.response?.status === 403)
    return "Tài khoản không có quyền thực hiện thao tác này.";
  return (
    problem.response?.data?.title ||
    "Không thể hoàn tất thao tác. Vui lòng thử lại."
  );
}

function StatusBadge({ value }: { value: string }) {
  const variant =
    value === "Approved" || value === "OnSale"
      ? "success"
      : value === "Pending" || value === "PendingProcessing"
        ? "warning"
        : value === "Rejected" || value === "Cancelled"
          ? "danger"
          : "neutral";
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {label(value)}
    </Badge>
  );
}

function ProductImage({
  url,
  large = false,
}: {
  url: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return (
    <div
      className={
        "grid shrink-0 place-items-center overflow-hidden rounded-control bg-surface-dashboard text-text-muted " +
        (large ? "size-20" : "size-12")
      }
    >
      {url && !failed ? (
        <img
          src={url}
          alt=""
          width={large ? 80 : 48}
          height={large ? 80 : 48}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageOff size={large ? 22 : 18} aria-hidden="true" />
      )}
    </div>
  );
}

export function InventoryManagement() {
  const { hasPermission, hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [approval, setApproval] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResponse<InventoryProduct> | null>(
    null,
  );
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [priceReason, setPriceReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [verifiedPrice, setVerifiedPrice] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Record<string, InventoryProduct>>({});
  const [labels, setLabels] = useState<BarcodeLabelProduct[] | null>(null);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const actionErrorRef = useRef<HTMLDivElement>(null);
  const canRead = hasPermission("products.read");
  const hasFilters = Boolean(query || status || approval || locationFilter);
  const printCount = Object.keys(selectedForPrint).length;

  function toggleForPrint(item: InventoryProduct) {
    setSelectedForPrint(current => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id]; else next[item.id] = item;
      return next;
    });
  }

  async function previewLabels(items: InventoryProduct[]) {
    if (!items.length || labelsLoading) return;
    if (items.length > 100) { setActionError('Mỗi lần chỉ in tối đa 100 sản phẩm.'); return; }
    setLabelsLoading(true); setActionError('');
    try {
      const latest = await Promise.all(items.map(item => inventoryApi.detail(item.id)));
      setLabels(latest.map(({ product }) => ({ id: product.id, name: product.name, barcode: product.barcode, listedPrice: product.listedPrice })));
    } catch { setActionError('Không thể tải thông tin sản phẩm để in barcode. Vui lòng thử lại.'); }
    finally { setLabelsLoading(false); }
  }

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    Promise.all([
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
      ),
      inventoryApi.locations(controller.signal),
    ])
      .then(([items, places]) => {
        setData(items);
        setLocations(places);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, query, status, approval, locationFilter, refresh, canRead]);

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
        if (!controller.signal.aborted) setDetailError(errorText(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, refresh]);

  useEffect(() => {
    if (!selectedId || !window.matchMedia("(max-width: 1279px)").matches)
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

  const run = useCallback(
    async (operation: () => Promise<unknown>, success: string) => {
      setBusy(true);
      setActionError("");
      setMessage("");
      try {
        await operation();
        setMessage(success);
        setPriceReason("");
        setEvidence("");
        setVerifiedPrice("");
        setNewPrice("");
        setRefresh((current) => current + 1);
      } catch (error) {
        setActionError(errorText(error));
        if (
          (error as { response?: { status?: number } }).response?.status === 409
        )
          setRefresh((current) => current + 1);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  function selectProduct(product: InventoryProduct) {
    if (product.id === selectedId) {
      if (window.matchMedia("(max-width: 1279px)").matches) {
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
    setPriceReason("");
    setEvidence("");
    setVerifiedPrice("");
    setNewPrice("");
    setNewLocation(product.location?.id ?? "");
    setActionError("");
    setMessage("");
  }

  function resetFilters() {
    setSearch("");
    setQuery("");
    setStatus("");
    setApproval("");
    setLocationFilter("");
    setPage(1);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function closeLocationModal() {
    setLocationOpen(false);
    setLocationCode("");
    setLocationName("");
    setLocationError("");
  }

  async function createLocation(event: FormEvent) {
    event.preventDefault();
    if (locationSaving) return;
    setLocationSaving(true);
    setLocationError("");
    try {
      await inventoryApi.createLocation(
        locationCode.trim(),
        locationName.trim(),
      );
      closeLocationModal();
      setActionError("");
      setMessage("Đã thêm vị trí kho.");
      setRefresh((current) => current + 1);
    } catch (error) {
      setLocationError(errorText(error));
    } finally {
      setLocationSaving(false);
    }
  }

  const product =
    detail?.product.id === selectedId ? detail.product : undefined;

  if (!canRead)
    return (
      <div className="rounded-card bg-white p-6">
        <p role="alert">
          Bạn chưa được cấp quyền xem kho. Liên hệ quản trị viên để được hỗ trợ.
        </p>
      </div>
    );

  return (
    <section aria-labelledby="inventory-title" className="space-y-5">
      <PageHeaderCard
        titleId="inventory-title"
        icon={<PackageSearch size={24} aria-hidden="true" />}
        title="Sản phẩm & kho"
        description="Quản lý sản phẩm và vị trí kho."
        actions={
          <>
            {data && !loading && !loadError && (
              <p className="self-center text-sm text-text-secondary">
                <span className="font-semibold tabular-nums text-brand-ink">
                  {data.totalCount.toLocaleString("vi-VN")}
                </span>{" "}
                sản phẩm{hasFilters ? " phù hợp" : " trong kho"}
              </p>
            )}
            {hasPermission("products.locations.manage") && (
              <Button
                size="md"
                startIcon={<Plus size={16} aria-hidden="true" />}
                onClick={() => setLocationOpen(true)}
              >
                Thêm vị trí
              </Button>
            )}
            {(hasRole('Admin') || hasRole('Manager')) && <Button variant="outline" size="md" onClick={() => setTemplateOpen(true)}>Mẫu in barcode</Button>}
            {!selectionMode ? <Button variant="outline" size="md" startIcon={<Printer size={16} aria-hidden="true" />} onClick={() => setSelectionMode(true)}>Chọn in barcode</Button> : <><Button variant="outline" size="md" onClick={() => { setSelectionMode(false); setSelectedForPrint({}); }}>Hủy chọn</Button><Button size="md" disabled={!printCount} loading={labelsLoading} onClick={() => void previewLabels(Object.values(selectedForPrint))}>Xem trước ({printCount})</Button></>}
          </>
        }
      />

      {actionError && (
        <div
          ref={actionErrorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start justify-between gap-3 rounded-card bg-state-danger-soft px-4 py-3 text-sm text-state-danger-strong focus:outline-none"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Đóng thông báo lỗi"
            className="shrink-0 rounded-control p-1 focus-visible:outline-2 focus-visible:outline-brand-highlight"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-card bg-state-success-soft px-4 py-3 text-sm text-state-success-strong"
        >
          <Check size={17} aria-hidden="true" />
          {message}
        </div>
      )}

      <div
        className={
          "grid items-start gap-5 " +
          (selectedId ? "xl:grid-cols-[minmax(0,1fr)_400px]" : "")
        }
      >
        <div className="min-w-0 rounded-card bg-white">
          <div className="border-b border-border px-4 py-5 sm:px-6">
            <h3 className="font-bold text-brand-ink">Danh sách sản phẩm</h3>

            <form onSubmit={submitSearch} className="mt-5 flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  id="inventory-search"
                  aria-label="Tìm theo tên hoặc barcode"
                  startAdornment={<Search size={18} aria-hidden="true" />}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên sản phẩm hoặc barcode…"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" size="sm" className="min-h-10 px-4">
                Tìm kiếm
              </Button>
            </form>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Combobox
                label="Trạng thái bán"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Tất cả trạng thái" },
                  ...saleStatuses.map((value) => ({
                    value,
                    label: label(value),
                  })),
                ]}
              />
              <Combobox
                label="Trạng thái duyệt"
                value={approval}
                onChange={(value) => {
                  setApproval(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Tất cả trạng thái" },
                  ...approvalStatuses.map((value) => ({
                    value,
                    label: label(value),
                  })),
                ]}
              />
              <Combobox
                label="Vị trí"
                value={locationFilter}
                onChange={(value) => {
                  setLocationFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "Tất cả vị trí" },
                  ...locations.map((place) => ({
                    value: place.id,
                    label: `${place.code} — ${place.name}`,
                  })),
                ]}
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand-highlight hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
              >
                <RotateCcw size={14} aria-hidden="true" /> Xóa bộ lọc
              </button>
            )}
          </div>

          {loading ? (
            <SkeletonLoading
              variant="list"
              count={4}
              label="Đang tải sản phẩm"
              className="p-5 sm:p-6"
            />
          ) : loadError ? (
            <div className="p-5">
              <ErrorState
                title="Không thể tải danh sách"
                description={loadError}
                onRetry={() => setRefresh((current) => current + 1)}
              />
            </div>
          ) : !data?.items.length ? (
            <div className="px-5 py-14 text-center">
              <PackageSearch
                size={26}
                className="mx-auto text-text-muted"
                aria-hidden="true"
              />
              <h4 className="mt-3 font-semibold text-brand-ink">
                {hasFilters
                  ? "Không tìm thấy sản phẩm phù hợp"
                  : "Chưa có sản phẩm trong kho"}
              </h4>
              <p className="mt-1 text-sm text-text-secondary">
                {hasFilters
                  ? "Thử từ khóa khác hoặc xóa bộ lọc để xem lại danh sách."
                  : "Sản phẩm được tiếp nhận sẽ xuất hiện tại đây."}
              </p>
              {hasFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[610px] text-left text-sm">
                  <thead className="bg-surface-dashboard/70 text-xs font-semibold text-text-secondary">
                    <tr>
                      {selectionMode && <th scope="col" className="px-3 py-3"><span className="sr-only">Chọn in</span></th>}
                      <th scope="col" className="px-6 py-3">
                        Sản phẩm
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Vị trí
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Duyệt
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-4 py-3">
                        <span className="sr-only">Chi tiết</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr
                        key={item.id}
                        onDoubleClick={() => {
                          if (!busy) selectProduct(item);
                        }}
                        className={
                          "border-t border-border/60 " +
                          (selectedId === item.id
                            ? "bg-brand-pink-surface"
                            : "hover:bg-surface-active")
                        }
                      >
                        {selectionMode && <td className="px-3 py-3"><input type="checkbox" aria-label={`Chọn in barcode ${item.name}`} checked={Boolean(selectedForPrint[item.id])} onChange={() => toggleForPrint(item)} /></td>}
                        <td className="px-6 py-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => selectProduct(item)}
                            aria-label={
                              "Xem chi tiết " +
                              item.name +
                              ", barcode " +
                              item.barcode
                            }
                            aria-current={
                              selectedId === item.id ? "true" : undefined
                            }
                            className="flex min-w-0 items-center gap-3 rounded-control text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight disabled:cursor-wait"
                          >
                            <ProductImage url={item.coverImageUrl} />
                            <span className="min-w-0">
                              <span className="block max-w-64 truncate font-semibold text-brand-ink">
                                {item.name}
                              </span>
                              <span className="mt-1 block text-xs text-text-secondary">
                                {item.barcode} · {item.brand}
                              </span>
                              <span className="mt-1 block text-xs font-semibold tabular-nums text-text-primary">
                                {formatVndPrice(item.listedPrice)}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {item.location?.code ?? "Chưa xếp"}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge value={item.approvalStatus} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge value={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => selectProduct(item)}
                            aria-label={
                              "Xem chi tiết " +
                              item.name +
                              ", barcode " +
                              item.barcode
                            }
                            className="rounded-control p-2 text-text-muted hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-wait"
                          >
                            <ChevronRight size={18} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-border/60 md:hidden">
                {data.items.map((item) => (
                  <li key={item.id} className="flex items-center">
                    {selectionMode && <input type="checkbox" className="ml-4 shrink-0" aria-label={`Chọn in barcode ${item.name}`} checked={Boolean(selectedForPrint[item.id])} onChange={() => toggleForPrint(item)} />}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => selectProduct(item)}
                      onDoubleClick={() => {
                        if (!busy) selectProduct(item);
                      }}
                      aria-current={selectedId === item.id ? "true" : undefined}
                      className={
                        "flex w-full items-start gap-3 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-highlight disabled:cursor-wait " +
                        (selectedId === item.id
                          ? "bg-brand-pink-surface"
                          : "hover:bg-surface-active")
                      }
                    >
                      <ProductImage url={item.coverImageUrl} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-brand-ink">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs text-text-secondary">
                          {item.barcode} · {item.brand}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusBadge value={item.approvalStatus} />
                          <StatusBadge value={item.status} />
                        </span>
                        <span className="mt-2 block text-xs text-text-secondary">
                          {item.location?.code ?? "Chưa xếp vị trí"} ·{" "}
                          {formatVndPrice(item.listedPrice)}
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        className="mt-1 shrink-0 text-text-muted"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
              {data.totalPages > 1 && (
                <nav
                  aria-label="Phân trang kho"
                  className="flex items-center justify-between gap-3 border-t border-border px-4 py-4 text-sm sm:px-6"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    startIcon={<ArrowLeft size={15} aria-hidden="true" />}
                  >
                    Trang trước
                  </Button>
                  <span className="text-text-secondary">
                    Trang{" "}
                    <span className="font-semibold tabular-nums text-brand-ink">
                      {page}
                    </span>{" "}
                    / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    endIcon={<ArrowRight size={15} aria-hidden="true" />}
                  >
                    Trang sau
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>

        {selectedId && (
          <aside
            ref={detailRef}
            tabIndex={-1}
            aria-label="Chi tiết sản phẩm"
            className="scroll-mt-4 rounded-card bg-white focus:outline-none xl:sticky xl:top-4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="font-bold text-brand-ink">Chi tiết sản phẩm</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Thông tin và thao tác theo quyền của bạn
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                aria-label="Đóng chi tiết sản phẩm"
                onClick={() => {
                  setSelectedId(null);
                  document.getElementById("inventory-search")?.focus();
                }}
                className="rounded-control p-2 text-text-secondary hover:bg-surface-dashboard focus-visible:outline-2 focus-visible:outline-brand-highlight disabled:cursor-wait"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {detailLoading && !product ? (
              <SkeletonLoading
                variant="list"
                count={3}
                label="Đang tải chi tiết sản phẩm"
                className="p-5"
              />
            ) : detailError ? (
              <div className="p-5">
                <ErrorState
                  title="Không thể tải chi tiết"
                  description={detailError}
                  onRetry={() => setRefresh((current) => current + 1)}
                />
              </div>
            ) : product && detail ? (
              <fieldset disabled={detailLoading} className="min-w-0 p-5">
                {detailLoading && (
                  <p role="status" className="mb-3 text-sm text-text-secondary">
                    Đang cập nhật thông tin…
                  </p>
                )}
                <div className="flex items-start gap-4">
                  <ProductImage url={product.coverImageUrl} large />
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-base font-bold text-brand-ink">
                      {product.name}
                    </h4>
                    <p className="mt-1 break-words text-sm text-text-secondary">
                      {product.barcode} · {product.brand} · {product.size}
                    </p>
                    <p className="mt-2 font-bold tabular-nums text-brand-ink">
                      {formatVndPrice(product.listedPrice)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge value={product.approvalStatus} />
                  <StatusBadge value={product.status} />
                  <Button variant="outline" size="sm" loading={labelsLoading} startIcon={<Printer size={15} aria-hidden="true" />} onClick={() => void previewLabels([product])}>In barcode</Button>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-border py-4 text-sm">
                  <div>
                    <dt className="text-text-secondary">Nguồn hàng</dt>
                    <dd className="mt-1 font-semibold text-brand-ink">
                      {product.sourceType === "Consignment"
                        ? "Ký gửi"
                        : "Mua đứt"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Vị trí</dt>
                    <dd className="mt-1 break-words font-semibold text-brand-ink">
                      {product.location
                        ? product.location.code + " — " + product.location.name
                        : "Chưa xếp"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Danh mục</dt>
                    <dd className="mt-1 font-semibold text-brand-ink">
                      {product.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Tình trạng</dt>
                    <dd className="mt-1 font-semibold text-brand-ink">
                      {product.conditionPercentage}%
                    </dd>
                  </div>
                </dl>
                {product.sourceReference && (
                  <p className="mt-4 break-words text-sm text-text-secondary">
                    {product.sourceType === "Consignment"
                      ? "Hợp đồng"
                      : "Phiếu mua đứt"}
                    :{" "}
                    <span className="font-semibold text-brand-ink">
                      {product.sourceReference}
                    </span>
                  </p>
                )}
                {product.description && (
                  <p className="mt-3 break-words text-sm leading-6 text-text-secondary">
                    {product.description}
                  </p>
                )}
                {detail.images.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-brand-ink">
                      Hình ảnh
                    </h4>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {detail.images.map((image) => (
                        <a
                          key={image.id}
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={"Mở ảnh " + image.imageType}
                          className="shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                        >
                          <img
                            src={image.url}
                            alt=""
                            width={64}
                            height={64}
                            loading="lazy"
                            className="size-16 rounded-control object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {product.status === "PendingProcessing" &&
                  product.approvalStatus !== "Approved" &&
                  hasPermission("products.create") && (
                    <InventoryEditor
                      key={product.id}
                      product={product}
                      busy={busy}
                      run={run}
                    />
                  )}

                {hasPermission("products.location.update") &&
                  (product.status === "PendingProcessing" ||
                    product.status === "OnSale") && (
                    <form
                      className="mt-5 border-t border-border pt-5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void run(
                          () =>
                            inventoryApi.changeLocation(
                              product.id,
                              product.version,
                              newLocation,
                            ),
                          "Đã cập nhật vị trí.",
                        );
                      }}
                    >
                      <div className="flex items-end gap-2">
                        <Combobox
                          className="min-w-0 flex-1"
                          label="Chuyển vị trí"
                          value={newLocation || product.location?.id || ""}
                          onChange={setNewLocation}
                          placeholder="Chọn vị trí"
                          options={locations.map((place) => ({
                            value: place.id,
                            label: `${place.code} — ${place.name}`,
                          }))}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          className="min-h-10 shrink-0"
                          disabled={
                            busy ||
                            !newLocation ||
                            newLocation === product.location?.id
                          }
                        >
                          Lưu
                        </Button>
                      </div>
                      {locations.length === 0 && (
                        <p className="mt-2 text-xs text-text-secondary">
                          Chưa có vị trí hoạt động. Liên hệ người quản lý để
                          thêm vị trí.
                        </p>
                      )}
                    </form>
                  )}

                {product.approvalStatus === "Pending" &&
                  product.status === "PendingProcessing" &&
                  hasPermission("products.approve") && (
                    <div className="mt-5 border-t border-border pt-5">
                      <h4 className="font-semibold text-brand-ink">
                        Xét duyệt sản phẩm
                      </h4>
                      {product.sourceType === "Consignment" && (
                        <>
                          <p className="mt-1 text-sm leading-6 text-text-secondary">
                            Đối chiếu giá với hợp đồng đã được khách đồng ý
                            trước khi duyệt.
                          </p>
                          <label className={fieldLabel + " mt-3"}>
                            Giá đã đối chiếu
                            <input
                              className={control + " mt-1.5"}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.01"
                              value={verifiedPrice}
                              onChange={(event) =>
                                setVerifiedPrice(event.target.value)
                              }
                            />
                          </label>
                          <label className={fieldLabel + " mt-3"}>
                            Thông tin bằng chứng thỏa thuận
                            <input
                              className={control + " mt-1.5"}
                              value={evidence}
                              maxLength={1000}
                              onChange={(event) =>
                                setEvidence(event.target.value)
                              }
                              placeholder="Mã hợp đồng và thông tin đối chiếu"
                            />
                          </label>
                        </>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          loading={busy}
                          disabled={
                            product.sourceType === "Consignment" &&
                            (!verifiedPrice || !evidence.trim())
                          }
                          onClick={() =>
                            void run(
                              () =>
                                inventoryApi.review(
                                  product.id,
                                  product.version,
                                  true,
                                  undefined,
                                  product.sourceType === "Consignment"
                                    ? Number(verifiedPrice)
                                    : undefined,
                                  evidence || undefined,
                                ),
                              "Đã duyệt sản phẩm.",
                            )
                          }
                        >
                          Duyệt sản phẩm
                        </Button>
                      </div>
                    </div>
                  )}

                {product.approvalStatus === "Rejected" &&
                  product.status === "PendingProcessing" &&
                  hasPermission("products.create") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () =>
                            inventoryApi.resubmit(product.id, product.version),
                          "Đã gửi duyệt lại.",
                        )
                      }
                    >
                      Gửi duyệt lại
                    </Button>
                  )}
                {product.approvalStatus === "Approved" &&
                  product.status === "PendingProcessing" &&
                  hasPermission("products.offer") && (
                    <div className="mt-5 rounded-control bg-brand-pink-surface p-4">
                      <p className="text-sm text-brand-ink">
                        Sản phẩm đã được duyệt. Kiểm tra vị trí trước khi đưa
                        lên bán.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Đưa sản phẩm này lên bán?"))
                            void run(
                              () =>
                                inventoryApi.offer(product.id, product.version),
                              "Sản phẩm đã được đưa lên bán.",
                            );
                        }}
                      >
                        Đưa lên bán
                      </Button>
                    </div>
                  )}

                {product.sourceType === "Consignment" ? (
                  <p className="mt-5 text-xs leading-5 text-text-secondary">
                    Giá ký gửi được giữ theo thỏa thuận. Đổi giá cần thỏa thuận
                    mới với khách.
                  </p>
                ) : (
                  hasPermission("products.price.update") && (
                    <details className="group mt-5 border-t border-border pt-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight">
                        Đổi giá hàng mua đứt{" "}
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className="group-open:rotate-180"
                        />
                      </summary>
                      <form
                        className="mt-3 space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (
                            window.confirm(
                              "Xác nhận thay đổi giá bán sản phẩm?",
                            )
                          )
                            void run(
                              () =>
                                inventoryApi.changePrice(
                                  product.id,
                                  product.version,
                                  Number(newPrice),
                                  priceReason,
                                ),
                              "Đã cập nhật giá bán.",
                            );
                        }}
                      >
                        <label className={fieldLabel}>
                          Giá mới
                          <input
                            className={control + " mt-1.5"}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            required
                            value={newPrice}
                            onChange={(event) =>
                              setNewPrice(event.target.value)
                            }
                          />
                        </label>
                        <label className={fieldLabel}>
                          Lý do
                          <input
                            className={control + " mt-1.5"}
                            required
                            maxLength={1000}
                            value={priceReason}
                            onChange={(event) =>
                              setPriceReason(event.target.value)
                            }
                          />
                        </label>
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                        >
                          Lưu giá
                        </Button>
                      </form>
                    </details>
                  )
                )}

                <details className="group mt-5 border-t border-border pt-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight">
                    <span className="flex items-center gap-2">
                      <Clock3 size={16} aria-hidden="true" /> Lịch sử thay đổi{" "}
                      {detail.history.length > 0 && (
                        <span className="font-normal text-text-secondary">
                          ({detail.history.length})
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className="group-open:rotate-180"
                    />
                  </summary>
                  {detail.history.length ? (
                    <ol className="mt-4 space-y-4">
                      {detail.history.map((item, index) => (
                        <li
                          key={item.occurredAt + "-" + index}
                          className="text-sm"
                        >
                          <p className="break-words font-medium text-brand-ink">
                            {item.action === "Details" ? (
                              "Cập nhật thông tin sản phẩm"
                            ) : (
                              <>
                                {item.action === "Approval"
                                  ? "Duyệt"
                                  : item.action === "Status"
                                    ? "Trạng thái"
                                    : item.action === "Location"
                                      ? "Vị trí"
                                      : "Giá"}
                                : {label(item.previousValue)} →{" "}
                                {label(item.newValue)}
                              </>
                            )}
                          </p>
                          <p className="mt-1 break-all text-xs text-text-secondary">
                            {new Date(item.occurredAt).toLocaleString("vi-VN")}
                            {item.actorAccountId
                              ? " · " + item.actorAccountId
                              : ""}
                          </p>
                          {item.reason && (
                            <p className="mt-1 break-words text-xs text-text-secondary">
                              {item.reason}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-sm text-text-secondary">
                      Chưa có lịch sử thay đổi.
                    </p>
                  )}
                </details>
              </fieldset>
            ) : null}
          </aside>
        )}
      </div>
      <BarcodePrintDialog open={labels !== null} items={labels || []} onClose={() => setLabels(null)} />
      <BarcodeTemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} />
      <Modal
        open={locationOpen}
        onClose={closeLocationModal}
        appearance="simple"
        className="max-w-md"
        title="Thêm vị trí kho"
        description="Nhập mã và tên để dễ tìm vị trí trong kho."
        error={locationError}
        disabled={locationSaving}
        footer={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={closeLocationModal}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="create-inventory-location"
              loading={locationSaving}
              disabled={!locationCode.trim() || !locationName.trim()}
            >
              Thêm vị trí
            </Button>
          </>
        }
      >
        <form
          id="create-inventory-location"
          className="space-y-4"
          onSubmit={(event) => void createLocation(event)}
        >
          <Input
            label="Mã vị trí"
            name="locationCode"
            value={locationCode}
            maxLength={50}
            required
            onChange={(event) => setLocationCode(event.target.value)}
            placeholder="Ví dụ: A-01"
          />
          <Input
            label="Tên vị trí"
            name="locationName"
            value={locationName}
            maxLength={200}
            required
            onChange={(event) => setLocationName(event.target.value)}
            placeholder="Ví dụ: Kệ áo A"
          />
        </form>
      </Modal>
    </section>
  );
}

function InventoryEditor({
  product,
  busy,
  run,
}: {
  product: InventoryProduct;
  busy: boolean;
  run: (operation: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [size, setSize] = useState(product.size);
  const [description, setDescription] = useState(product.description ?? "");
  const [condition, setCondition] = useState(
    String(product.conditionPercentage),
  );
  return (
    <details className="group mt-5 border-t border-border pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight">
        Sửa thông tin sản phẩm{" "}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="group-open:rotate-180"
        />
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            () =>
              inventoryApi.changeDetails(
                product.id,
                product.version,
                name,
                size,
                description,
                Number(condition),
              ),
            "Đã cập nhật thông tin sản phẩm.",
          );
        }}
      >
        <label className={fieldLabel}>
          Tên sản phẩm
          <input
            className={control + " mt-1.5"}
            value={name}
            required
            maxLength={200}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={fieldLabel}>
          Kích thước
          <input
            className={control + " mt-1.5"}
            value={size}
            required
            maxLength={30}
            onChange={(event) => setSize(event.target.value)}
          />
        </label>
        <label className={fieldLabel}>
          Tình trạng (%)
          <input
            className={control + " mt-1.5"}
            type="number"
            min="0"
            max="100"
            step="1"
            required
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
          />
        </label>
        <label className={fieldLabel}>
          Mô tả
          <textarea
            className={control + " mt-1.5"}
            value={description}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <Button type="submit" variant="outline" size="sm" disabled={busy}>
          Lưu thông tin
        </Button>
      </form>
    </details>
  );
}
