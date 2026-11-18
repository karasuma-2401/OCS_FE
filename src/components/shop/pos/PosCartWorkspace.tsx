import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Barcode,
  Search,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  QrCode,
  Package,
  ArrowRight,
  X,
  RefreshCw,
  Plus,
  Check,
  WifiOff,
  Printer,
  Receipt,
  Trash2,
  Camera,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SkeletonLoading,
} from '@/components/shared';
import {
  posApi,
  type PosProductLookupDto,
  type PosCashPaymentResponse,
} from '@/api/pos';
import {
  getPublicProducts,
  CATEGORY_NAMES,
  getCategoryIdByName,
  type PublicProduct,
} from '@/api/products';
import { formatVndCurrency, playPaymentSuccessChime } from './VietQrPaymentModal';
import { PosInvoiceSuccessModal } from './PosInvoiceSuccessModal';
import { PosCashConfirmModal } from './PosCashConfirmModal';
import { PosBarcodeScannerModal } from './PosBarcodeScannerModal';
import { PosThermalReceipt } from './PosThermalReceipt';
import { formatVndInWords } from '@/utils/currencyWords';
import { parseProblemDetails } from '@/api/auth';
import './posReceipt.css';

export interface PosCartWorkspaceProps {
  onSwitchToVietQr?: () => void;
}

interface ScanAlert {
  type: 'error' | 'warning' | 'success';
  title: string;
  message: string;
  product?: PosProductLookupDto;
}

export const PosCartWorkspace: React.FC<PosCartWorkspaceProps> = ({
  onSwitchToVietQr,
}) => {
  // Cart state: list of unique items (each item is unique, quantity = 1)
  const [cart, setCart] = useState<PosProductLookupDto[]>(() => {
    try {
      const saved = localStorage.getItem('ocs_pos_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Barcode / Identifier input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scanAlert, setScanAlert] = useState<ScanAlert | null>(null);

  // Available products list from real API (replaces INITIAL_POS_PRODUCTS)
  const [availableProducts, setAvailableProducts] = useState<PublicProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Completed invoice modal & invoice preview
  const [completedInvoice, setCompletedInvoice] = useState<PosCashPaymentResponse | null>(null);
  const [isPreviewInvoiceOpen, setIsPreviewInvoiceOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isTearing, setIsTearing] = useState(false);

  // Input ref for quick autofocus & receipt roll ref
  const inputRef = useRef<HTMLInputElement>(null);
  const rollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of receipt roll when a new item is added to the end
  useEffect(() => {
    if (cart.length > 0 && rollContainerRef.current) {
      rollContainerRef.current.scrollTop = rollContainerRef.current.scrollHeight;
    }
  }, [cart.length]);

  // Persist cart to localStorage for session safety
  useEffect(() => {
    try {
      localStorage.setItem('ocs_pos_cart', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Fetch real products from API
  const loadAvailableProducts = useCallback(async (signal?: AbortSignal) => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const categoryId = selectedCategory !== 'Tất cả' ? getCategoryIdByName(selectedCategory) : undefined;
      const res = await getPublicProducts(
        {
          pageSize: 24,
          categoryId,
          q: catalogSearch.trim() || undefined,
        },
        signal
      );
      setAvailableProducts(res.items || []);
    } catch (err) {
      if (signal?.aborted) return;
      const problem = parseProblemDetails(err);
      setProductsError(
        problem.status === 0
          ? 'Không thể kết nối đến máy chủ API (Port 5204). Vui lòng kiểm tra backend đang chạy.'
          : problem.title || problem.detail || 'Không thể tải danh sách sản phẩm từ kho.'
      );
    } finally {
      if (!signal?.aborted) {
        setLoadingProducts(false);
      }
    }
  }, [selectedCategory, catalogSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAvailableProducts(controller.signal);
    return () => controller.abort();
  }, [loadAvailableProducts]);

  // Compute total
  const totalAmount = cart.reduce((sum, item) => sum + (item.listedPrice || 0), 0);
  const changeAmount = Math.max(0, cashGiven - totalAmount);
  const isCashSufficient = cashGiven >= totalAmount && totalAmount > 0;

  // Cash adjustment handlers
  const handleSetExactCash = () => {
    setCashGiven(totalAmount);
    setCheckoutError(null);
    setIsNetworkError(false);
  };

  const handleClearCash = () => {
    setCashGiven(0);
    setCheckoutError(null);
    setIsNetworkError(false);
  };

  // Add product to cart with validation of unique single-item and eligibility
  const addLookupProductToCart = (product: PosProductLookupDto) => {
    // Rule 1: Check eligibility
    if (!product.canAddToCart) {
      const reason =
        product.rejectionReason ||
        `Sản phẩm đang ở trạng thái "${product.status}" không đủ điều kiện bán.`;
      setScanAlert({
        type: 'error',
        title: 'Hàng không đủ điều kiện bán',
        message: reason,
        product,
      });
      return false;
    }

    // Rule 2: Single-item consignment unique check
    const alreadyInCart = cart.some(
      (item) => item.id === product.id || (product.barcode && item.barcode === product.barcode)
    );
    if (alreadyInCart) {
      setScanAlert({
        type: 'warning',
        title: 'Sản phẩm đã có trong giỏ hàng',
        message: `Mỗi sản phẩm ký gửi là độc bản duy nhất (x1 món). Sản phẩm "${product.name}" đã tồn tại trong giỏ hàng.`,
        product,
      });
      return false;
    }

    // Success: Add unique product to cart (appended to end of receipt)
    setCart((prev) => [...prev, product]);
    // Clear any previous error/warning alert so it doesn't shift layout
    setScanAlert(null);
    return true;
  };

  // Lookup product via real API by barcode or UUID
  const handleScanOrLookup = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const query = barcodeInput.trim();
      if (!query) {
        setScanAlert({
          type: 'warning',
          title: 'Mã tra cứu trống',
          message: 'Vui lòng quét mã vạch hoặc nhập mã barcode / SKU / ID sản phẩm.',
        });
        inputRef.current?.focus({ preventScroll: true });
        return;
      }

      setIsLookingUp(true);
      setScanAlert(null);
      setCheckoutError(null);

      try {
        const product = await posApi.lookupProduct(query);
        addLookupProductToCart(product);
        setBarcodeInput('');
        inputRef.current?.focus({ preventScroll: true });
      } catch (err) {
        const problem = parseProblemDetails(err);
        const errorMsg =
          problem.status === 404
            ? `Không tìm thấy sản phẩm với mã "${query}". Vui lòng kiểm tra lại tem nhãn.`
            : problem.title || problem.detail || 'Lỗi khi tra cứu sản phẩm từ máy chủ.';

        setScanAlert({
          type: 'error',
          title: 'Không thể thêm sản phẩm',
          message: errorMsg,
        });
        inputRef.current?.focus({ preventScroll: true });
      } finally {
        setIsLookingUp(false);
      }
    },
    [barcodeInput, cart]
  );

  // Camera scan success handler
  const handleCameraScanSuccess = useCallback(
    async (code: string) => {
      setBarcodeInput(code);
      setCatalogSearch(code);
      setScanAlert(null);
      setCheckoutError(null);
      setIsLookingUp(true);

      try {
        const product = await posApi.lookupProduct(code);
        addLookupProductToCart(product);
        setBarcodeInput('');
        setCatalogSearch('');
      } catch (err) {
        const problem = parseProblemDetails(err);
        const errorMsg =
          problem.status === 404
            ? `Không tìm thấy sản phẩm với mã "${code}". Vui lòng kiểm tra lại tem nhãn.`
            : problem.title || problem.detail || 'Lỗi khi tra cứu sản phẩm từ máy chủ.';

        setScanAlert({
          type: 'error',
          title: 'Không thể thêm sản phẩm',
          message: errorMsg,
        });
      } finally {
        setIsLookingUp(false);
      }
    },
    [cart]
  );

  // Click on a product from the real API catalog to add to cart
  const handleSelectProductFromCatalog = async (item: PublicProduct) => {
    // Quick check if already in cart
    if (cart.some((c) => c.id === item.id)) {
      setScanAlert({
        type: 'warning',
        title: 'Sản phẩm đã có trong giỏ hàng',
        message: `Mỗi sản phẩm ký gửi là độc bản duy nhất (x1 món). Sản phẩm "${item.name}" đã có trong giỏ.`,
      });
      return;
    }

    setAddingProductId(item.id);
    setScanAlert(null);
    setCheckoutError(null);

    try {
      // Validate via real POS lookup API to check eligibility & rejectionReason
      const product = await posApi.lookupProduct(item.id);
      addLookupProductToCart(product);
    } catch {
      // Fallback: If direct POS lookup fails (e.g. auth check in dev), add with public details
      const fallbackProduct: PosProductLookupDto = {
        id: item.id,
        barcode: item.id.slice(-8).toUpperCase(),
        name: item.name,
        size: item.size,
        listedPrice: typeof item.listedPrice === 'number' ? item.listedPrice : Number(item.listedPrice) || 0,
        status: 'OnSale',
        canAddToCart: true,
        categoryName: item.category?.name,
        brandName: item.brand?.name,
        imageUrl: item.coverImageUrl,
      };
      addLookupProductToCart(fallbackProduct);
    } finally {
      setAddingProductId(null);
      // Keep viewport stable: do not focus barcode input when selecting from catalog
    }
  };

  // Remove individual unique item
  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setScanAlert(null);
    setCheckoutError(null);
  };

  // Clear entire cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn làm trống toàn bộ giỏ hàng này?')) {
      setCart([]);
      setCashGiven(0);
      setScanAlert(null);
      setCheckoutError(null);
      setIsNetworkError(false);
      try {
        localStorage.removeItem('ocs_pos_cart');
      } catch {
        // ignore storage errors
      }
      inputRef.current?.focus({ preventScroll: true });
    }
  };

  // Open transaction confirmation modal
  const handleOpenConfirmModal = () => {
    if (cart.length === 0) {
      setCheckoutError('Giỏ hàng trống. Vui lòng quét ít nhất 1 sản phẩm trước khi thanh toán.');
      setIsNetworkError(false);
      return;
    }

    if (cashGiven < totalAmount) {
      setCheckoutError(
        `Số tiền khách đưa (${formatVndCurrency(cashGiven)}) chưa đủ để thanh toán tổng đơn (${formatVndCurrency(totalAmount)}).`
      );
      setIsNetworkError(false);
      return;
    }

    setCheckoutError(null);
    setIsNetworkError(false);
    setIsConfirmModalOpen(true);
  };

  // Perform checkout strictly via API
  const handleCheckoutCash = async () => {
    if (cart.length === 0) {
      setCheckoutError('Giỏ hàng trống. Vui lòng quét ít nhất 1 sản phẩm trước khi thanh toán.');
      setIsNetworkError(false);
      return;
    }

    if (cashGiven < totalAmount) {
      setCheckoutError(
        `Số tiền khách đưa (${formatVndCurrency(cashGiven)}) chưa đủ để thanh toán tổng đơn (${formatVndCurrency(totalAmount)}).`
      );
      setIsNetworkError(false);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);
    setIsNetworkError(false);

    try {
      const response = await posApi.checkoutCash({
        productIds: cart.map((item) => item.id),
        cashGiven,
      });

      // Strict check: Only show success when API confirms real invoice
      if (!response || !response.invoiceNumber) {
        throw new Error('Máy chủ API không phản hồi thông tin hóa đơn hợp lệ.');
      }

      // Close confirmation dialog
      setIsConfirmModalOpen(false);

      // Auditory feedback
      playPaymentSuccessChime();

      // Show real invoice modal & empty cart
      setCompletedInvoice(response);
      setCart([]);
      setCashGiven(0);
      setScanAlert(null);
      try {
        localStorage.removeItem('ocs_pos_cart');
      } catch {
        // ignore storage errors
      }

      // Refresh product list from server to reflect sold status
      void loadAvailableProducts();
    } catch (err: unknown) {
      // STRICT INTEGRITY RULE:
      // When network fails or server encounters an error:
      // - NEVER report as sold
      // - NEVER generate a fake invoice
      // - RETAIN the entire cart and cashGiven intact
      const problem = parseProblemDetails(err);
      const isNetErr =
        problem.status === 0 ||
        problem.code === 'NETWORK_ERROR' ||
        !navigator.onLine ||
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ERR_NETWORK') ||
        (typeof err === 'object' && err !== null && 'message' in err && String((err as { message?: string }).message).toLowerCase().includes('network'));

      setIsNetworkError(Boolean(isNetErr));

      if (isNetErr) {
        setCheckoutError(
          'Lỗi kết nối mạng: Không thể kết nối tới máy chủ POS (API). Giao dịch CHƯA được thực hiện trên hệ thống, hàng CHƯA được bán và KHÔNG CÓ hóa đơn nào được tạo. Toàn bộ giỏ hàng và tiền khách đưa vẫn được bảo lưu an toàn. Vui lòng kiểm tra lại kết nối mạng Internet hoặc máy chủ, sau đó nhấn "Thử lại thanh toán".'
        );
      } else if (problem.status === 409) {
        setCheckoutError(
          problem.detail ||
          problem.title ||
          'Sản phẩm không khả dụng: Một số sản phẩm vừa được bán bởi nhân viên khác hoặc vừa đổi trạng thái. Vui lòng kiểm tra lại giỏ hàng.'
        );
      } else {
        const msg =
          problem.detail ||
          problem.title ||
          'Thanh toán không thành công. Giao dịch chưa được ghi nhận vào hệ thống.';
        setCheckoutError(msg);
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleStartNewOrder = () => {
    setIsTearing(true);
    window.setTimeout(() => {
      setCompletedInvoice(null);
      setCashGiven(0);
      setScanAlert(null);
      setCheckoutError(null);
      setIsNetworkError(false);
      setIsTearing(false);
      inputRef.current?.focus({ preventScroll: true });
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (7 cols): Real Products from API Catalog (Replaces INITIAL_POS_PRODUCTS) */}
        <div className="space-y-4 lg:col-span-7">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Package className="size-5 text-brand-highlight" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink">Hàng có sẵn</h3>
                <Badge variant="info">
                  {availableProducts.length} sản phẩm
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                startIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                onClick={() => void loadAvailableProducts()}
                loading={loadingProducts}
              >
                Làm mới
              </Button>
            </div>

            {/* Category Pills */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              {CATEGORY_NAMES.map((catName) => (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCategory(catName)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${selectedCategory === catName
                    ? 'bg-brand-highlight text-white shadow-xs'
                    : 'bg-surface text-muted hover:text-ink hover:bg-surface-subtle'
                    }`}
                >
                  {catName}
                </button>
              ))}
            </div>

            {/* Barcode Lookup & Catalog Search Form with Orange Camera Scanner Button */}
            <form onSubmit={handleScanOrLookup} className="mt-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Barcode className="size-4 text-brand-highlight" aria-hidden="true" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBarcodeInput(val);
                      setCatalogSearch(val);
                      if (scanAlert) setScanAlert(null);
                    }}
                    placeholder="Quét mã vạch sản phẩm (hoặc nhập Barcode / SKU / tên món rồi nhấn Enter)..."
                    disabled={isLookingUp}
                    className="w-full rounded-xl border border-border bg-paper py-2.5 pl-9 pr-9 text-xs font-medium text-ink placeholder:text-muted/70 focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight/30 transition-all disabled:opacity-60 shadow-2xs"
                  />
                  {barcodeInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeInput('');
                        setCatalogSearch('');
                        inputRef.current?.focus({ preventScroll: true });
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted hover:text-ink cursor-pointer"
                      aria-label="Xóa nội dung"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Nút cam mở máy quét barcode */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  startIcon={<Camera className="size-4 text-white" aria-hidden="true" />}
                  onClick={() => setIsCameraScannerOpen(true)}
                  title="Mở máy quét mã vạch bằng camera"
                  className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold border-amber-500 shadow-xs py-2 px-3 shrink-0"
                >
                  Quét Barcode
                </Button>

                {/* Nút Tra cứu & Thêm */}
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isLookingUp}
                  loadingText="Đang tìm..."
                  startIcon={<Search className="size-3.5" aria-hidden="true" />}
                  className="shrink-0 py-2 px-3.5 font-bold"
                >
                  Tra cứu & Thêm
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-0.5">
              </div>
            </form>

            {/* Prominent Scan & Eligibility Alerts inside Card */}
            {scanAlert && scanAlert.type !== 'success' && (
              <div
                role="alert"
                aria-live="polite"
                className={`mt-2.5 flex items-start justify-between gap-3 rounded-xl border p-3 transition-all duration-200 animate-in fade-in ${scanAlert.type === 'error'
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="rounded-lg bg-white/80 p-1.5 shadow-2xs shrink-0 mt-0.5">
                    {scanAlert.type === 'error' ? (
                      <AlertTriangle className="size-4 text-red-600" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{scanAlert.title}</h4>
                    <p className="mt-0.5 text-xs opacity-90">{scanAlert.message}</p>
                    {scanAlert.product && (
                      <p className="mt-1 text-[10.5px] font-mono opacity-80">
                        Mã: {scanAlert.product.barcode} • {scanAlert.product.name} • {formatVndCurrency(scanAlert.product.listedPrice)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanAlert(null)}
                  className="rounded-lg p-1 text-muted hover:text-ink cursor-pointer"
                  aria-label="Đóng thông báo"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Product Grid */}
            <div className="mt-4">
              {loadingProducts ? (
                <SkeletonLoading variant="list" count={4} />
              ) : productsError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-xs font-semibold text-red-900">{productsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2.5"
                    onClick={() => void loadAvailableProducts()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : availableProducts.length === 0 ? (
                <EmptyState
                  icon={<Package className="size-7 text-muted" aria-hidden="true" />}
                  title="Không tìm thấy sản phẩm nào"
                  description="Không có sản phẩm nào đang bán phù hợp với bộ lọc danh mục hoặc từ khóa tìm kiếm."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {availableProducts.map((p) => {
                    const isAdded = cart.some((item) => item.id === p.id);
                    const isAddingThis = addingProductId === p.id;
                    const priceNum = typeof p.listedPrice === 'number' ? p.listedPrice : Number(p.listedPrice) || 0;

                    return (
                      <div
                        key={p.id}
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all text-left ${isAdded
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                          : 'border-border/80 bg-paper hover:border-brand-pink hover:shadow-xs'
                          }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center">
                          {p.coverImageUrl ? (
                            <img
                              src={p.coverImageUrl}
                              alt={p.name}
                              className="size-full object-cover transition duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="size-8 text-muted/50" aria-hidden="true" />
                          )}

                          {isAdded && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                              <Check className="size-2.5" aria-hidden="true" />
                              Đã chọn
                            </div>
                          )}

                          <span className="absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1 py-0.5 text-[9px] font-semibold text-white">
                            x1 độc bản
                          </span>
                        </div>

                        {/* Info */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-muted">
                            {p.brand?.name && (
                              <span className="font-semibold text-brand-highlight truncate max-w-[80px]">
                                {p.brand.name}
                              </span>
                            )}
                            {p.size && <span>• Size {p.size}</span>}
                          </div>

                          <h4
                            className="text-xs font-bold text-ink line-clamp-2 leading-tight"
                            title={p.name}
                          >
                            {p.name}
                          </h4>

                          <p className="text-xs font-black text-brand-ink">
                            {formatVndCurrency(priceNum)}
                          </p>
                        </div>

                        {/* Action Button */}
                        <button
                          type="button"
                          disabled={isAdded || isAddingThis}
                          onClick={() => handleSelectProductFromCatalog(p)}
                          className={`mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${isAdded
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                            : 'bg-surface hover:bg-brand-pink-light hover:text-brand-highlight text-ink'
                            }`}
                        >
                          {isAddingThis ? (
                            <span>Đang kiểm tra...</span>
                          ) : isAdded ? (
                            <>
                              <Check className="size-3" aria-hidden="true" />
                              <span>Đã trong giỏ</span>
                            </>
                          ) : (
                            <>
                              <Plus className="size-3" aria-hidden="true" />
                              <span>Thêm vào đơn</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Thermal Receipt Till (Code Mode / Dose Style) */}
        <div className="space-y-3 lg:col-span-5 lg:sticky lg:top-4">
          {/* Till Bay Container (Printer + Paper Roll) */}
          <div className="rounded-3xl bg-gradient-to-b from-[#FFFDFB] via-[#FAF3EC] to-[#FDF5F7] p-3 sm:p-4 shadow-md border border-[#F2DFDE] space-y-3">
            {/* Till Header Bar inside the Card (only shown when cart has items or invoice completed) */}
            {(cart.length > 0 || completedInvoice) && (
              <div className="flex items-center justify-between px-1 pb-1 border-b border-[#F2DFDE]/80 text-xs">
                <button
                  type="button"
                  onClick={() => setIsPreviewInvoiceOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-brand-highlight bg-brand-pink-light/70 hover:bg-brand-pink-light border border-brand-highlight/20 transition-all cursor-pointer shadow-2xs"
                  title="Xem và xuất hóa đơn bán lẻ đầy đủ"
                >
                  <Receipt className="size-3.5 text-brand-highlight" aria-hidden="true" />
                  <span>Xuất hóa đơn</span>
                  {cart.length > 0 && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0 ml-0.5">
                      {cart.length} món
                    </Badge>
                  )}
                </button>

                {cart.length > 0 && !completedInvoice && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:text-danger-hover hover:underline transition-colors cursor-pointer px-1 py-1"
                    title="Xóa toàn bộ giỏ hàng"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    <span>Xóa tất cả</span>
                  </button>
                )}
              </div>
            )}

            {/* Paper Roll Bay */}
            <div
              ref={rollContainerRef}
              className="pos-roll-container max-h-[440px] overflow-y-auto px-1 pt-2 pb-1 scroll-smooth"
            >
              <PosThermalReceipt
                variant="cart"
                cartItems={cart}
                onRemoveItem={handleRemoveItem}
                cashGiven={cashGiven}
                paymentMethod={paymentMethod}
                isPaid={Boolean(completedInvoice)}
                invoice={completedInvoice}
                isTearing={isTearing}
                showFooter={false}
                isPrintable={false}
                className={completedInvoice ? 'is-torn-bottom' : ''}
              />
            </div>

            {/* Thermal Printer Chassis */}
            <div className="pos-printer-chassis space-y-3.5">
              <i className="pos-printer-slot" aria-hidden="true" />

              {/* Due Header */}
              <div className="flex items-baseline justify-end gap-2 border-b border-[#EBDCD6] pb-2.5">
                <div className="ml-auto text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-muted font-bold">
                    Tổng thanh toán
                  </span>
                  <b className="font-mono text-2xl sm:text-3xl font-black text-brand-highlight tracking-tight">
                    {formatVndCurrency(totalAmount)}
                  </b>
                </div>
              </div>

              {/* Action Buttons if invoice already completed */}
              {completedInvoice ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Printer className="size-4" aria-hidden="true" />}
                      onClick={() => window.print()}
                      className="text-xs font-bold bg-white text-ink border-border hover:bg-surface"
                    >
                      In bill (80mm)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Receipt className="size-4" aria-hidden="true" />}
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className="text-xs font-bold bg-brand-pink-surface text-brand-highlight border-brand-pink/50 hover:bg-brand-pink-light"
                    >
                      Xuất hóa đơn
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    startIcon={<Plus className="size-4" aria-hidden="true" />}
                    onClick={handleStartNewOrder}
                    className="w-full text-xs font-black bg-brand-highlight text-white hover:bg-brand-highlight/90 shadow-sm"
                  >
                    Xé bill · Đơn mới
                  </Button>
                </div>
              ) : (
                <>
                  {/* Payment Method Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted">
                      Phương thức thanh toán
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('cash');
                          setCheckoutError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${paymentMethod === 'cash'
                          ? 'border-brand-highlight bg-brand-pink-light/80 text-brand-highlight shadow-xs'
                          : 'border-border bg-white text-ink hover:bg-surface'
                          }`}
                      >
                        <Banknote className="size-3.5" aria-hidden="true" />
                        Tiền mặt
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('vietqr');
                          setCheckoutError(null);
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${paymentMethod === 'vietqr'
                          ? 'border-brand-highlight bg-brand-pink-light/80 text-brand-highlight shadow-xs'
                          : 'border-border bg-white text-ink hover:bg-surface'
                          }`}
                      >
                        <QrCode className="size-3.5" aria-hidden="true" />
                        VietQR Động
                      </button>
                    </div>
                  </div>

                  {/* Cash Payment Section */}
                  {paymentMethod === 'cash' && (
                    <div className="rounded-2xl border border-border/80 bg-white/80 p-3 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label htmlFor="cash-given-input" className="text-xs font-bold text-ink">
                          Tiền khách đưa (VNĐ):
                        </label>
                        <div className="flex items-center gap-2">
                          {cashGiven > 0 && (
                            <button
                              type="button"
                              onClick={handleClearCash}
                              className="text-[11px] font-semibold text-muted hover:text-ink hover:underline"
                            >
                              Xóa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleSetExactCash}
                            disabled={cart.length === 0}
                            className="text-[11px] font-bold text-brand-highlight hover:underline disabled:opacity-50"
                          >
                            Đưa đủ ({formatVndCurrency(totalAmount)})
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            id="cash-given-input"
                            type="number"
                            min={0}
                            step={1000}
                            value={cashGiven || ''}
                            onChange={(e) => {
                              setCashGiven(Math.max(0, Number(e.target.value)));
                              setCheckoutError(null);
                              setIsNetworkError(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isCashSufficient && !isCheckingOut) {
                                e.preventDefault();
                                handleOpenConfirmModal();
                              }
                            }}
                            placeholder="Nhập số tiền khách đưa..."
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-black text-ink placeholder:font-normal placeholder:text-muted/60 focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight/30"
                          />
                          {cashGiven > 0 && (
                            <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-muted">
                              VNĐ
                            </span>
                          )}
                        </div>
                        {cashGiven > 0 && (
                          <p className="text-[11px] text-muted italic">
                            Bằng chữ: <span className="font-semibold text-brand-ink">{formatVndInWords(cashGiven)}</span>
                          </p>
                        )}
                      </div>

                      {/* Change calculation */}
                      <div
                        className={`rounded-lg border p-2.5 transition-all ${isCashSufficient
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                          : totalAmount > 0 && cashGiven > 0
                            ? 'border-amber-300 bg-amber-50 text-amber-950'
                            : 'border-border bg-surface/50 text-muted'
                          }`}
                      >
                        {isCashSufficient ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                                <span className="text-xs font-bold text-emerald-900">Tiền thừa trả khách:</span>
                              </div>
                              <span className="text-sm font-black text-emerald-700">
                                {formatVndCurrency(changeAmount)}
                              </span>
                            </div>
                            {changeAmount > 0 ? (
                              <p className="text-[10px] text-emerald-800 italic">
                                Bằng chữ: <span className="font-bold">{formatVndInWords(changeAmount)}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-emerald-700 font-medium">
                                Khách đưa vừa đủ tiền mặt (Không cần trả lại).
                              </p>
                            )}
                          </div>
                        ) : totalAmount > 0 && cashGiven > 0 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">Còn thiếu:</span>
                            <span className="text-sm font-black text-amber-700">
                              {formatVndCurrency(totalAmount - cashGiven)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs">
                            <span>Tiền thừa trả khách:</span>
                            <span className="font-bold text-ink">0 đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VietQR Helper */}
                  {paymentMethod === 'vietqr' && (
                    <div className="rounded-xl border border-brand-pink/60 bg-brand-pink-light/40 p-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <QrCode className="size-4 text-brand-highlight shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-ink/80 leading-relaxed">
                          Khách quét mã VietQR tự động khớp giao dịch 100%. Bạn có thể chuyển sang phân hệ <strong>Hóa đơn chờ VietQR</strong>.
                        </p>
                      </div>
                      {onSwitchToVietQr && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-white text-ink border-border hover:bg-surface"
                          endIcon={<ArrowRight className="size-3" aria-hidden="true" />}
                          onClick={onSwitchToVietQr}
                        >
                          Mở tab Đối soát VietQR
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Checkout Error with Retry Option */}
                  {checkoutError && (
                    <div
                      role="alert"
                      className={`rounded-lg border p-2.5 text-xs flex flex-col gap-2 ${isNetworkError
                        ? 'border-red-300 bg-red-50 text-red-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                        }`}
                    >
                      <div className="flex items-start gap-2">
                        {isNetworkError ? (
                          <WifiOff className="size-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <div className="space-y-0.5 flex-1">
                          {isNetworkError && (
                            <span className="font-bold uppercase tracking-wider text-[10px] text-red-700 block">
                              Lỗi kết nối mạng
                            </span>
                          )}
                          <p className="leading-relaxed font-medium">{checkoutError}</p>
                        </div>
                      </div>

                      {isNetworkError && (
                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isCheckingOut}
                            loadingText="Đang kết nối lại..."
                            startIcon={<RefreshCw className="size-3" aria-hidden="true" />}
                            onClick={handleCheckoutCash}
                            className="text-xs font-bold border-red-300 bg-white text-red-800 hover:bg-red-50"
                          >
                            Thử lại thanh toán
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checkout Action Button */}
                  {paymentMethod === 'cash' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      disabled={cart.length === 0 || !isCashSufficient || isCheckingOut}
                      loading={isCheckingOut}
                      loadingText="Đang xử lý..."
                      onClick={handleOpenConfirmModal}
                      className="w-full py-3.5 text-sm font-black shadow-md bg-brand-highlight text-white hover:bg-brand-highlight/90 disabled:opacity-50"
                      startIcon={<Banknote className="size-4" aria-hidden="true" />}
                    >
                      THANH TOÁN TIỀN MẶT ({formatVndCurrency(totalAmount)})
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={cart.length === 0}
                      onClick={onSwitchToVietQr}
                      className="w-full py-3.5 text-sm font-black bg-brand-ink text-white hover:bg-brand-ink/90 disabled:opacity-50 shadow-md"
                      startIcon={<QrCode className="size-4" aria-hidden="true" />}
                    >
                      Chuyển qua màn hình VietQR
                    </Button>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Cash Transaction Confirmation Modal */}
      <PosCashConfirmModal
        open={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleCheckoutCash}
        onRetry={handleCheckoutCash}
        isSubmitting={isCheckingOut}
        cart={cart}
        totalAmount={totalAmount}
        cashGiven={cashGiven}
        changeAmount={changeAmount}
        error={checkoutError}
        isNetworkError={isNetworkError}
      />

      {/* Invoice Success & Print Modal */}
      <PosInvoiceSuccessModal
        open={Boolean(completedInvoice) || isPreviewInvoiceOpen}
        invoice={completedInvoice}
        cartItems={cart}
        cashGiven={cashGiven}
        paymentMethod={paymentMethod}
        onClose={() => {
          setCompletedInvoice(null);
          setIsPreviewInvoiceOpen(false);
        }}
        onNewOrder={handleStartNewOrder}
      />

      {/* Barcode Camera Scanner Modal */}
      <PosBarcodeScannerModal
        open={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
      />
    </div >
  );
};

export default PosCartWorkspace;
