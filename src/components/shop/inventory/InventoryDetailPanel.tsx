import { useEffect, useState, type FormEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Edit3,
  ImageOff,
  MapPin,
  Printer,
  RotateCcw,
  Tag,
  ZoomIn,
} from "lucide-react";
import {
  inventoryApi,
  type InventoryDetail,
  type InventoryLocation,
  type InventoryProduct,
} from "@/api/inventory";
import { formatVndPrice } from "@/api/products";
import { screenPaths } from "@/auth/permissions";
import {
  Badge,
  Button,
  Combobox,
  DetailPanel,
  ErrorState,
  Input,
  Modal,
  SkeletonLoading,
} from "@/components/shared";
import {
  InventoryImageLightbox,
  type LightboxImage,
} from "./InventoryImageLightbox";
import {
  parseDetailsDiff,
  statusBadgeVariant,
  statusLabel,
} from "./inventoryHelpers";

interface InventoryDetailPanelProps {
  panelRef: RefObject<HTMLElement | null>;
  selectedId: string;
  detail: InventoryDetail | null;
  detailLoading: boolean;
  detailError: string;
  busy: boolean;
  locations: InventoryLocation[];
  canApprove: boolean;
  canCreate: boolean;
  canOffer: boolean;
  canEditLocation: boolean;
  canUpdatePrice: boolean;
  canReportIncident: boolean;
  panelClassName?: string;
  onClose: () => void;
  onRetry: () => void;
  onRunAction: (
    operation: () => Promise<unknown>,
    successMessage: string,
  ) => Promise<boolean>;
  onOpenEditModal: () => void;
  onCopiedBarcode: (barcode: string) => void;
}

export function InventoryDetailPanel({
  panelRef,
  selectedId,
  detail,
  detailLoading,
  detailError,
  busy,
  locations,
  canApprove,
  canCreate,
  canOffer,
  canEditLocation,
  canUpdatePrice,
  canReportIncident,
  panelClassName = "animate-inv-panel-in",
  onClose,
  onRetry,
  onRunAction,
  onOpenEditModal,
  onCopiedBarcode,
}: InventoryDetailPanelProps) {
  const navigate = useNavigate();
  const [quickLocationId, setQuickLocationId] = useState("");
  const [verifiedPrice, setVerifiedPrice] = useState("");
  const [evidence, setEvidence] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [locationSavedFlash, setLocationSavedFlash] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmKind, setConfirmKind] = useState<"offer" | "price" | null>(null);

  const product: InventoryProduct | undefined =
    detail?.product.id === selectedId ? detail.product : undefined;

  useEffect(() => {
    setQuickLocationId(product?.location?.id ?? "");
    setVerifiedPrice("");
    setEvidence("");
    setNewPrice("");
    setPriceReason("");
    setConfirmKind(null);
    setLightboxIndex(null);
    setCopied(false);
    setLocationSavedFlash(false);
  }, [selectedId, product?.id, product?.location?.id]);

  const lightboxImages: LightboxImage[] = detail?.images?.length
    ? detail.images
    : product?.coverImageUrl
      ? [{ id: "cover", url: product.coverImageUrl, imageType: "Cover" }]
      : [];

  function handleCopyBarcode(barcode: string) {
    void navigator.clipboard?.writeText(barcode);
    setCopied(true);
    onCopiedBarcode(barcode);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const canEditActive =
    product &&
    (product.status === "PendingProcessing" || product.status === "OnSale");

  const step1Done = product?.approvalStatus === "Approved";
  const step2Done = Boolean(product?.location);
  const step3Done = product?.status === "OnSale";
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const progressWidth = `${Math.round((completedSteps / 3) * 100)}%`;

  return (
    <>
      <DetailPanel
        panelRef={panelRef}
        title="Chi tiết sản phẩm"
        description="Thông tin và thao tác nhanh theo quyền của bạn"
        disabled={busy}
        className={panelClassName}
        onClose={onClose}
      >
        <div key={selectedId} className="animate-inv-fade-in p-5">
          {detailLoading && !product ? (
            <SkeletonLoading
              variant="list"
              count={3}
              label="Đang tải chi tiết sản phẩm"
            />
          ) : detailError ? (
            <ErrorState
              title="Không thể tải chi tiết"
              description={detailError}
              onRetry={onRetry}
            />
          ) : product && detail ? (
            <fieldset key={product.id} disabled={detailLoading || busy} className="animate-inv-fade-in min-w-0 space-y-5">
              {detailLoading && (
                <p role="status" className="text-xs font-medium text-brand-highlight">
                  Đang cập nhật thông tin…
                </p>
              )}

              {/* Hero sản phẩm */}
              <div className="flex items-start gap-3.5">
                {lightboxImages.length > 0 && product.coverImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(0)}
                    aria-label={`Phóng to ảnh ${product.name}`}
                    className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface-dashboard text-text-muted focus-visible:outline-2 focus-visible:outline-brand-highlight"
                  >
                    <img
                      src={product.coverImageUrl}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ZoomIn size={16} aria-hidden="true" />
                    </span>
                  </button>
                ) : (
                  <div
                    aria-hidden="true"
                    className="grid size-20 shrink-0 place-items-center rounded-xl border border-border bg-surface-dashboard text-text-muted"
                  >
                    <ImageOff size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-base font-bold leading-snug text-brand-ink">
                    {product.name}
                  </h4>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyBarcode(product.barcode)}
                      title="Sao chép mã barcode"
                      className="inline-flex items-center gap-1 rounded-md bg-surface-dashboard px-2 py-0.5 font-mono text-xs font-semibold text-brand-ink transition hover:bg-brand-pink-light hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-highlight"
                    >
                      <span>{product.barcode}</span>
                      {copied ? (
                        <Check size={12} className="text-state-success" aria-hidden="true" />
                      ) : (
                        <Copy size={11} className="text-muted" aria-hidden="true" />
                      )}
                    </button>
                    <span className="text-xs text-text-secondary">
                      {product.brand} · Size {product.size}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold tabular-nums text-brand-highlight">
                    {formatVndPrice(product.listedPrice)}
                  </p>
                </div>
              </div>

              {/* Badges + Hành động chính */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(product.approvalStatus)}>
                  {statusLabel(product.approvalStatus)}
                </Badge>
                <Badge variant={statusBadgeVariant(product.status)}>
                  {statusLabel(product.status)}
                </Badge>
                <Badge variant="neutral">Mới {product.conditionPercentage}%</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<Printer size={15} aria-hidden="true" />}
                  onClick={() =>
                    navigate(
                      `/shop/inventory/barcode?q=${encodeURIComponent(product.barcode)}`,
                    )
                  }
                >
                  In barcode
                </Button>
                {product.status === "OnSale" && canReportIncident && (
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<AlertTriangle size={15} aria-hidden="true" />}
                    onClick={() =>
                      navigate(
                        `${screenPaths.incidents}/new?barcode=${encodeURIComponent(product.barcode)}`,
                      )
                    }
                  >
                    Báo cáo sự cố
                  </Button>
                )}
                {canEditActive && (canCreate || canEditLocation) && (
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<Edit3 size={15} aria-hidden="true" />}
                    onClick={onOpenEditModal}
                  >
                    Sửa chi tiết
                  </Button>
                )}
              </div>

              {/* Thanh tiến trình 3 bước cho sản phẩm đang xử lý / mở bán */}
              {(product.status === "PendingProcessing" ||
                product.status === "OnSale") && (
                <div className="rounded-xl border border-brand-lavender/40 bg-brand-pink-surface/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-highlight">
                      Tiến trình lên kệ
                    </p>
                    <span className="text-[11px] font-bold tabular-nums text-brand-highlight">
                      {completedSteps}/3 bước
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-pink to-state-success-solid transition-[width] duration-500 ease-out motion-reduce:transition-none"
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { num: 1, label: "Duyệt", done: step1Done },
                      { num: 2, label: "Xếp kệ", done: step2Done },
                      { num: 3, label: "Mở bán", done: step3Done },
                    ].map((step) => (
                      <div
                        key={step.num}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold transition-colors duration-200 ${
                          step.done
                            ? "bg-state-success-soft text-state-success-strong"
                            : "bg-white text-text-secondary"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2
                            size={14}
                            className="shrink-0 animate-inv-pop"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-surface-dashboard text-[10px] font-bold text-muted">
                            {step.num}
                          </span>
                        )}
                        <span className="truncate">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Xếp vị trí nhanh ngay trong Detail Panel */}
              {canEditActive && canEditLocation && (
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (
                      !quickLocationId ||
                      quickLocationId === product.location?.id
                    )
                      return;
                    const ok = await onRunAction(
                      () =>
                        inventoryApi.changeLocation(
                          product.id,
                          product.version,
                          quickLocationId,
                        ),
                      "Đã cập nhật vị trí kho.",
                    );
                    if (ok) {
                      setLocationSavedFlash(true);
                      window.setTimeout(() => setLocationSavedFlash(false), 1500);
                    }
                  }}
                  className="space-y-2.5 rounded-xl border border-border bg-paper p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-ink">
                      <MapPin size={14} className="text-brand-highlight" aria-hidden="true" />
                      Xếp vị trí kho nhanh
                    </span>
                    <span className="text-xs text-muted">
                      {product.location ? product.location.code : "Chưa xếp"}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <Combobox
                      className="min-w-0 flex-1"
                      ariaLabel="Chọn vị trí kho"
                      placeholder="Chọn kệ / vị trí…"
                      value={quickLocationId}
                      onChange={setQuickLocationId}
                      options={locations.map((place) => ({
                        value: place.id,
                        label: `${place.code} — ${place.name}`,
                      }))}
                    />
                    <Button
                      type="submit"
                      size="md"
                      variant={locationSavedFlash ? "primary" : "outline"}
                      disabled={
                        !quickLocationId ||
                        quickLocationId === product.location?.id
                      }
                      startIcon={
                        locationSavedFlash ? (
                          <Check size={14} className="animate-inv-pop" aria-hidden="true" />
                        ) : undefined
                      }
                    >
                      {locationSavedFlash ? "Đã lưu" : "Lưu"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Xét duyệt sản phẩm */}
              {product.approvalStatus === "Pending" &&
                product.status === "PendingProcessing" &&
                canApprove && (
                  <div className="rounded-xl border border-state-warning-border bg-state-warning-soft/50 p-4">
                    <h4 className="font-bold text-brand-ink">
                      Xét duyệt sản phẩm
                    </h4>
                    {product.sourceType === "Consignment" && (
                      <div className="mt-2 space-y-3">
                        <p className="text-xs leading-5 text-text-secondary">
                          Đối chiếu giá với hợp đồng đã thỏa thuận trước khi
                          duyệt.
                        </p>
                        {detail.agreedListedPrice != null && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                            <span className="text-text-secondary">
                              Giá hợp đồng:{" "}
                              <strong className="tabular-nums text-brand-ink">
                                {formatVndPrice(detail.agreedListedPrice)}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setVerifiedPrice(
                                  String(detail.agreedListedPrice),
                                );
                                if (!evidence && product.sourceReference) {
                                  setEvidence(
                                    `Hợp đồng ${product.sourceReference}`,
                                  );
                                }
                              }}
                              className="font-bold text-brand-highlight hover:underline"
                            >
                              Điền theo hợp đồng
                            </button>
                          </div>
                        )}
                        <Input
                          label="Giá đã đối chiếu"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={verifiedPrice}
                          onChange={(e) => setVerifiedPrice(e.target.value)}
                          placeholder={
                            detail.agreedListedPrice != null
                              ? String(detail.agreedListedPrice)
                              : "Nhập giá niêm yết"
                          }
                        />
                        <Input
                          label="Bằng chứng thỏa thuận"
                          value={evidence}
                          maxLength={1000}
                          onChange={(e) => setEvidence(e.target.value)}
                          placeholder={
                            product.sourceReference
                              ? `Ví dụ: Hợp đồng ${product.sourceReference}`
                              : "Mã hợp đồng và thông tin đối chiếu"
                          }
                        />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={busy}
                        disabled={
                          product.sourceType === "Consignment" &&
                          (!verifiedPrice || !evidence.trim())
                        }
                        onClick={() =>
                          void onRunAction(
                            () =>
                              inventoryApi.review(
                                product.id,
                                product.version,
                                true,
                                undefined,
                                product.sourceType === "Consignment"
                                  ? Number(verifiedPrice)
                                  : undefined,
                                evidence.trim() || undefined,
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
                canCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    startIcon={<RotateCcw size={15} aria-hidden="true" />}
                    onClick={() =>
                      void onRunAction(
                        () =>
                          inventoryApi.resubmit(product.id, product.version),
                        "Đã gửi duyệt lại.",
                      )
                    }
                  >
                    Gửi duyệt lại
                  </Button>
                )}

              {/* Đưa lên bán */}
              {product.approvalStatus === "Approved" &&
                product.status === "PendingProcessing" &&
                canOffer && (
                  <div className="rounded-xl border border-brand-lavender/60 bg-brand-pink-surface p-4">
                    <p className="text-sm font-medium text-brand-ink">
                      {product.location
                        ? `Sản phẩm đã duyệt tại kệ ${product.location.code}. Sẵn sàng đưa lên bán!`
                        : "Sản phẩm đã được duyệt. Vui lòng xếp vị trí kho ở trên trước khi đưa lên bán."}
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      disabled={!product.location}
                      onClick={() => setConfirmKind("offer")}
                    >
                      Đưa lên bán
                    </Button>
                  </div>
                )}

              {/* Thông số chi tiết */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 text-sm">
                <div>
                  <dt className="text-xs text-text-secondary">Nguồn hàng</dt>
                  <dd className="mt-0.5 font-semibold text-brand-ink">
                    {product.sourceType === "Consignment"
                      ? "Ký gửi"
                      : "Mua đứt"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">Vị trí</dt>
                  <dd className="mt-0.5 break-words font-semibold text-brand-ink">
                    {product.location
                      ? `${product.location.code} — ${product.location.name}`
                      : "Chưa xếp"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">Danh mục</dt>
                  <dd className="mt-0.5 font-semibold text-brand-ink">
                    {product.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">Tình trạng</dt>
                  <dd className="mt-0.5 font-semibold text-brand-ink">
                    {product.conditionPercentage}%
                  </dd>
                </div>
                {product.sourceType === "Buyout" && (
                  <div className="col-span-2">
                    <dt className="text-xs text-text-secondary">
                      Giá vốn mua đứt
                    </dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-brand-highlight">
                      {detail.purchasePrice == null
                        ? "Chưa có thông tin"
                        : formatVndPrice(detail.purchasePrice)}
                    </dd>
                  </div>
                )}
              </dl>

              {product.sourceReference && (
                <p className="break-words text-sm text-text-secondary">
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
                <p className="break-words text-sm leading-6 text-text-secondary">
                  {product.description}
                </p>
              )}

              {/* Bộ sưu tập ảnh */}
              {detail.images.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-brand-ink">
                    Hình ảnh ({detail.images.length})
                  </h4>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {detail.images.map((image, idx) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setLightboxIndex(idx)}
                        aria-label={`Phóng to ảnh ${image.imageType}`}
                        className="group relative shrink-0 overflow-hidden rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                      >
                        <img
                          src={image.url}
                          alt=""
                          width={64}
                          height={64}
                          loading="lazy"
                          className="size-16 object-cover transition-transform group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Đổi giá hàng mua đứt */}
              {product.sourceType === "Consignment" ? (
                <p className="rounded-lg bg-surface-dashboard px-3 py-2 text-xs leading-5 text-text-secondary">
                  Giá ký gửi được cố định theo thỏa thuận hợp đồng với khách.
                </p>
              ) : (
                canUpdatePrice &&
                canEditActive && (
                  <details className="group border-t border-border pt-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight">
                      <span className="flex items-center gap-1.5">
                        <Tag size={15} aria-hidden="true" /> Đổi giá hàng mua đứt
                      </span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className="transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <form
                      className="mt-3 space-y-3"
                      onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        if (!newPrice || !priceReason.trim()) return;
                        setConfirmKind("price");
                      }}
                    >
                      <Input
                        label="Giá mới (VNĐ)"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        required
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                      />
                      <Input
                        label="Lý do đổi giá"
                        required
                        maxLength={1000}
                        value={priceReason}
                        onChange={(e) => setPriceReason(e.target.value)}
                        placeholder="Ví dụ: Điều chỉnh theo tình trạng thực tế"
                      />
                      <Button type="submit" variant="outline" size="sm">
                        Cập nhật giá
                      </Button>
                    </form>
                  </details>
                )
              )}

              {/* Timeline Lịch sử thay đổi */}
              <details className="group border-t border-border pt-4" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight">
                  <span className="flex items-center gap-2">
                    <Clock3 size={16} aria-hidden="true" /> Lịch sử thay đổi
                    {detail.history.length > 0 && (
                      <span className="rounded-full bg-surface-dashboard px-2 py-0.5 text-xs font-semibold text-text-secondary">
                        {detail.history.length}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                {detail.history.length ? (
                  <ol className="relative mt-4 space-y-4 border-l-2 border-brand-pink-light pl-4">
                    {detail.history.map((item, index) => {
                      const detailsDiffs =
                        item.action === "Details"
                          ? parseDetailsDiff(item.previousValue, item.newValue)
                          : [];
                      return (
                        <li
                          key={`${item.occurredAt}-${index}`}
                          className="relative rounded-lg px-2 py-1 text-sm transition-colors hover:bg-surface-active"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute -left-[21px] top-2.5 size-2.5 rounded-full border-2 border-white bg-brand-highlight"
                          />
                          <p className="break-words font-semibold text-brand-ink">
                            {item.action === "Details"
                              ? "Cập nhật thông tin sản phẩm"
                              : `${
                                  item.action === "Approval"
                                    ? "Duyệt"
                                    : item.action === "Status"
                                      ? "Trạng thái"
                                      : item.action === "Location"
                                        ? "Vị trí"
                                        : "Giá"
                                }: ${
                                  item.action === "Price"
                                    ? `${formatVndPrice(Number(item.previousValue || 0))} → ${formatVndPrice(Number(item.newValue || 0))}`
                                    : `${statusLabel(item.previousValue)} → ${statusLabel(item.newValue)}`
                                }`}
                          </p>
                          {detailsDiffs.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-xs text-text-secondary">
                              {detailsDiffs.map((line) => (
                                <li key={line}>• {line}</li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1 text-xs text-muted">
                            {new Date(item.occurredAt).toLocaleString("vi-VN")}
                            {" · "}
                            {item.actorName ||
                              (item.actorAccountId ? "Nhân viên" : "Hệ thống")}
                          </p>
                          {item.reason && (
                            <p className="mt-1 rounded-lg bg-surface-dashboard px-2.5 py-1 text-xs text-text-secondary">
                              {item.reason}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-text-secondary">
                    Chưa có lịch sử thay đổi.
                  </p>
                )}
              </details>
            </fieldset>
          ) : null}
        </div>
      </DetailPanel>

      {product && (
        <InventoryImageLightbox
          images={lightboxImages}
          activeIndex={lightboxIndex}
          productName={product.name}
          onChangeIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Modal xác nhận chuẩn OCS thay cho window.confirm */}
      <Modal
        open={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        disabled={busy}
        className="max-w-md"
        title={
          confirmKind === "offer"
            ? "Xác nhận đưa lên bán"
            : "Xác nhận đổi giá bán"
        }
        description={product ? `${product.name} (${product.barcode})` : undefined}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmKind(null)}
              disabled={busy}
            >
              Hủy
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                if (!product) return;
                if (confirmKind === "offer") {
                  const ok = await onRunAction(
                    () => inventoryApi.offer(product.id, product.version),
                    "Sản phẩm đã được đưa lên bán.",
                  );
                  if (ok) setConfirmKind(null);
                } else if (confirmKind === "price") {
                  const ok = await onRunAction(
                    () =>
                      inventoryApi.changePrice(
                        product.id,
                        product.version,
                        Number(newPrice),
                        priceReason.trim(),
                      ),
                    "Đã cập nhật giá bán.",
                  );
                  if (ok) {
                    setConfirmKind(null);
                    setNewPrice("");
                    setPriceReason("");
                  }
                }
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        {product && confirmKind === "offer" && (
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              Sản phẩm sẽ chuyển sang trạng thái <strong>Đang bán</strong> và có
              thể quét thanh toán tại quầy POS.
            </p>
            <div className="rounded-xl bg-brand-pink-surface p-3 text-xs text-brand-ink">
              <p>
                Vị trí:{" "}
                <strong>
                  {product.location
                    ? `${product.location.code} — ${product.location.name}`
                    : "—"}
                </strong>
              </p>
              <p className="mt-1">
                Giá niêm yết:{" "}
                <strong className="tabular-nums">
                  {formatVndPrice(product.listedPrice)}
                </strong>
              </p>
            </div>
          </div>
        )}
        {product && confirmKind === "price" && (
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              Giá bán mới:{" "}
              <strong className="tabular-nums text-brand-highlight">
                {formatVndPrice(Number(newPrice || 0))}
              </strong>{" "}
              (hiện tại {formatVndPrice(product.listedPrice)}).
            </p>
            <p className="rounded-xl bg-surface-dashboard p-3 text-xs">
              Lý do: <strong>{priceReason}</strong>
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
