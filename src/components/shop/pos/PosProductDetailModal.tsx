import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Barcode,
  Tag,
  ShieldCheck,
  Check,
  ShoppingCart,
  Copy,
  CheckCheck,
  Info,
  ChevronLeft,
  ChevronRight,
  Layers,
  Store,
} from 'lucide-react';
import { Badge, Button, Modal, Skeleton } from '@/components/shared';
import {
  getPublicProductDetail,
  type PublicProduct,
  type PublicProductDetail,
} from '@/api/products';
import { posApi, type PosProductLookupDto } from '@/api/pos';
import { formatVndCurrency } from './VietQrPaymentModal';
import { formatVndInWords } from '@/utils/currencyWords';

export interface PosProductDetailModalProps {
  open: boolean;
  product: PublicProduct | PosProductLookupDto | null;
  onClose: () => void;
  isInCart?: boolean;
  onAddToCart?: (product: PublicProduct | PosProductLookupDto) => void;
}

export const PosProductDetailModal: React.FC<PosProductDetailModalProps> = ({
  open,
  product,
  onClose,
  isInCart = false,
  onAddToCart,
}) => {
  const [detail, setDetail] = useState<PublicProductDetail | null>(null);
  const [lookupData, setLookupData] = useState<PosProductLookupDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());

  // Fetch full details whenever the active product changes
  useEffect(() => {
    if (!open || !product) {
      setDetail(null);
      setLookupData(null);
      setActiveImageIndex(0);
      setBrokenImages(new Set());
      setCopiedBarcode(false);
      return;
    }

    const controller = new AbortController();
    setLoadingDetail(true);

    // If product is already a PosProductLookupDto, store it
    if ('canAddToCart' in product) {
      setLookupData(product);
    } else {
      // If it's a PublicProduct, try to fetch lookup data to get exact barcode & status
      posApi
        .lookupProduct(product.id, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) setLookupData(res);
        })
        .catch(() => {
          // ignore lookup failure in dev or unconsigned preview
        });
    }

    // Fetch full public product detail for high-res images and long description
    getPublicProductDetail(product.id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setDetail(data);
        }
      })
      .catch(() => {
        // Fallback: we still have the initial product info
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDetail(false);
        }
      });

    return () => controller.abort();
  }, [open, product]);

  // Consolidate images
  const allImages = useMemo(() => {
    const list: { url: string; label: string }[] = [];

    // From detailed API
    if (detail?.images && detail.images.length > 0) {
      detail.images.forEach((img, idx) => {
        list.push({
          url: img.url,
          label: img.imageType === 'Cover' ? 'Ảnh bìa' : `Ảnh chi tiết ${idx}`,
        });
      });
    }

    // Fallback from initial product
    if (list.length === 0) {
      const coverUrl =
        product && 'coverImageUrl' in product
          ? product.coverImageUrl
          : product && 'imageUrl' in product
            ? product.imageUrl
            : null;
      if (coverUrl) {
        list.push({ url: coverUrl, label: 'Ảnh đại diện' });
      }
    }

    return list;
  }, [detail, product]);

  if (!open || !product) return null;

  // Normalized values
  const name = detail?.name || product.name;
  const brandName =
    detail?.brand?.name ||
    ('brand' in product ? product.brand?.name : null) ||
    ('brandName' in product ? product.brandName : null) ||
    'Chính hãng';
  const categoryName =
    detail?.category?.name ||
    ('category' in product ? product.category?.name : null) ||
    ('categoryName' in product ? product.categoryName : null) ||
    'Thời trang';
  const size = detail?.size || product.size || 'Freesize';
  const condition =
    detail?.conditionPercentage ??
    ('conditionPercentage' in product ? product.conditionPercentage : 95);
  const rawPrice = detail?.listedPrice ?? product.listedPrice;
  const priceNum = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice) || 0;
  const barcode =
    lookupData?.barcode ||
    ('barcode' in product ? product.barcode : null) ||
    product.id.slice(-8).toUpperCase();
  const description =
    detail?.description ||
    ('description' in product ? product.description : null) ||
    'Sản phẩm ký gửi chính hãng tại chuỗi OCS. Đã qua quy trình kiểm định chất lượng nghiêm ngặt và dán tem niêm phong.';
  const status = lookupData?.status || ('status' in product ? product.status : 'OnSale');
  const canAddToCart = lookupData ? lookupData.canAddToCart : true;

  const handleCopyBarcode = () => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const currentImage = allImages[activeImageIndex] || allImages[0];
  const isCurrentImageBroken = currentImage ? brokenImages.has(currentImage.url) : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-brand-pink-light p-2 text-brand-highlight shadow-2xs">
            <Store className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Chi tiết sản phẩm POS
            </h2>
            <p className="text-[11px] font-medium text-muted">
              Thông tin tra cứu nhanh cho thu ngân tại quầy
            </p>
          </div>
        </div>
      }
      className="max-w-3xl overflow-hidden rounded-2xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Hàng ký gửi · Đã kiểm duyệt điều kiện bán</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Đóng (Esc)
            </Button>

            {isInCart ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled
                startIcon={<Check className="size-4.5 text-emerald-600" aria-hidden="true" />}
                className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-sm py-2.5 px-4"
              >
                Đã có trong giỏ
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!canAddToCart}
                startIcon={<ShoppingCart className="size-4.5" aria-hidden="true" />}
                onClick={() => {
                  if (onAddToCart) {
                    onAddToCart(lookupData || product);
                  }
                  onClose();
                }}
                className="bg-brand-highlight enabled:hover:bg-brand-highlight/90 text-white font-bold text-sm py-2.5 px-4.5 shadow-sm"
              >
                Thêm vào giỏ hàng
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Badges Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/60 p-2.5 border border-border/70">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="neutral" className="font-semibold text-xs text-brand-ink">
              <Tag className="size-3 mr-1 text-brand-highlight" aria-hidden="true" />
              {brandName}
            </Badge>
            <Badge variant="info" className="text-xs">
              <Layers className="size-3 mr-1" aria-hidden="true" />
              {categoryName}
            </Badge>
            <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 text-[11px] font-bold">
              Độ mới {condition}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {status === 'OnSale' ? 'Đang mở bán' : status}
            </span>
          </div>
        </div>

        {/* Main Content Grid: Image Left, Specs Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left: Product Images & Gallery */}
          <div className="md:col-span-5 flex flex-col gap-2.5">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/80 bg-surface flex items-center justify-center shadow-2xs group">
              {currentImage && !isCurrentImageBroken ? (
                <img
                  src={currentImage.url}
                  alt={name}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={() => {
                    setBrokenImages((prev) => new Set(prev).add(currentImage.url));
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted">
                  <Package className="size-12 text-muted/40" aria-hidden="true" />
                  <p className="text-xs font-semibold">Chưa có ảnh hiển thị</p>
                </div>
              )}

              {/* Navigation arrows for multiple images */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-white/90 text-ink shadow-xs hover:bg-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-white/90 text-ink shadow-xs hover:bg-white flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Ảnh tiếp theo"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>

                  <span className="absolute bottom-2 right-2 rounded-md bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                    {activeImageIndex + 1} / {allImages.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnails list if multiple images */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 px-0.5">
                {allImages.map((img, idx) => {
                  const isThumbBroken = brokenImages.has(img.url);
                  return (
                    <button
                      key={img.url + idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative size-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-brand-highlight ring-2 ring-brand-highlight/20 shadow-xs'
                          : 'border-border/70 hover:border-brand-pink'
                      }`}
                    >
                      {!isThumbBroken ? (
                        <img
                          src={img.url}
                          alt={img.label}
                          className="size-full object-cover"
                          onError={() => {
                            setBrokenImages((prev) => new Set(prev).add(img.url));
                          }}
                        />
                      ) : (
                        <div className="size-full bg-surface flex items-center justify-center">
                          <Package className="size-4 text-muted/50" aria-hidden="true" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Specifications & Details */}
          <div className="md:col-span-7 space-y-3.5">
            <h3 className="text-base sm:text-lg font-extrabold text-ink leading-snug">
              {name}
            </h3>

            {/* Price Box */}
            <div className="rounded-xl border border-brand-pink/50 bg-brand-pink-surface/50 p-3 space-y-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Giá niêm yết bán lẻ
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-black text-brand-ink">
                  {formatVndCurrency(priceNum)}
                </span>
              </div>
              {priceNum > 0 && (
                <p className="text-[11px] text-brand-highlight italic font-medium">
                  Bằng chữ: {formatVndInWords(priceNum)}
                </p>
              )}
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* Barcode with Quick Copy */}
              <div className="rounded-lg border border-border/80 bg-surface/40 p-2.5 space-y-1">
                <span className="text-muted text-[11px] font-medium flex items-center gap-1">
                  <Barcode className="size-3.5 text-brand-highlight" aria-hidden="true" />
                  Mã Barcode:
                </span>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-ink truncate text-xs sm:text-[13px]">
                    {barcode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBarcode}
                    className="p-1 rounded text-muted hover:text-brand-highlight hover:bg-surface-subtle transition-colors cursor-pointer shrink-0"
                    title="Sao chép Barcode"
                  >
                    {copiedBarcode ? (
                      <CheckCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Size */}
              <div className="rounded-lg border border-border/80 bg-surface/40 p-2.5 space-y-1">
                <span className="text-muted text-[11px] font-medium">Kích cỡ (Size):</span>
                <p className="font-bold text-ink text-xs sm:text-[13px]">
                  {size}
                </p>
              </div>

              {/* Brand */}
              <div className="rounded-lg border border-border/80 bg-surface/40 p-2.5 space-y-1">
                <span className="text-muted text-[11px] font-medium">Thương hiệu:</span>
                <p className="font-bold text-brand-highlight text-xs sm:text-[13px] truncate">
                  {brandName}
                </p>
              </div>

              {/* Category */}
              <div className="rounded-lg border border-border/80 bg-surface/40 p-2.5 space-y-1">
                <span className="text-muted text-[11px] font-medium">Danh mục hàng:</span>
                <p className="font-bold text-ink text-xs sm:text-[13px] truncate">
                  {categoryName}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-border/80 bg-paper p-3 space-y-1.5">
              <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Info className="size-3.5 text-brand-highlight" aria-hidden="true" />
                Mô tả chi tiết & tình trạng hàng ký gửi:
              </h4>
              {loadingDetail && !detail ? (
                <div className="space-y-2 py-1">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              ) : (
                <p className="text-xs text-muted/90 leading-relaxed max-h-28 overflow-y-auto pr-1">
                  {description}
                </p>
              )}
            </div>

            {/* Eligibility Note */}
            {!canAddToCart && lookupData?.rejectionReason && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 font-medium">
                ⚠️ {lookupData.rejectionReason}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PosProductDetailModal;
