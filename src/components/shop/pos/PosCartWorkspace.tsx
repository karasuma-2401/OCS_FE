import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Barcode,
  AlertTriangle,
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
  Trash2,
  Camera,
  ShoppingCart,
  Eye,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
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
import { PosProductDetailModal } from './PosProductDetailModal';
import { formatVndInWords } from '@/utils/currencyWords';
import { parseProblemDetails } from '@/api/auth';
import { animateFlyToCart } from './flyToCart';
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
  const [flyingProductIds, setFlyingProductIds] = useState<Set<string>>(() => new Set());

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
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);

  // Product detail card modal on double-click
  const [detailModalProduct, setDetailModalProduct] = useState<PublicProduct | PosProductLookupDto | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const clickTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Input ref for quick autofocus & receipt roll ref
  const inputRef = useRef<HTMLInputElement>(null);
  const rollContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceHeight, setWorkspaceHeight] = useState<number | null>(null);

  // Dynamic viewport fit calculation for every computer screen
  useEffect(() => {
    const calculateHeight = () => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.top - 24;
      if (available > 420) {
        setWorkspaceHeight(Math.floor(available));
      }
    };

    calculateHeight();
    const rafId = requestAnimationFrame(calculateHeight);
    const timer = setTimeout(calculateHeight, 150);

    window.addEventListener('resize', calculateHeight);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

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

  // Focus input on mount & clear click timers on unmount
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      Object.values(clickTimerRef.current).forEach((t) => clearTimeout(t));
    };
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

  // Quick cash suggestion chips matching design (e.g. 2.100k, 2.500k)
  const quickCashSuggestions = React.useMemo(() => {
    if (totalAmount <= 0) return [];
    const list: number[] = [];

    const round50k = Math.ceil(totalAmount / 50000) * 50000;
    if (round50k > totalAmount) list.push(round50k);

    const round100k = Math.ceil(totalAmount / 100000) * 100000;
    if (round100k > totalAmount && !list.includes(round100k)) list.push(round100k);

    const round500k = Math.ceil(totalAmount / 500000) * 500000;
    if (round500k > totalAmount && !list.includes(round500k)) list.push(round500k);

    if (list.length === 0) {
      list.push(totalAmount + 50000, totalAmount + 100000);
    }

    return list.slice(0, 2);
  }, [totalAmount]);

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

    // Rule 2: Single-item consignment unique check with functional state updater
    let added = false;
    setCart((prev) => {
      const alreadyInCart = prev.some(
        (item) => item.id === product.id || (product.barcode && item.barcode === product.barcode)
      );
      if (alreadyInCart) {
        setScanAlert({
          type: 'warning',
          title: 'Sản phẩm đã có trong giỏ hàng',
          message: `Mỗi sản phẩm ký gửi là duy nhất (x1 món). Sản phẩm "${product.name}" đã tồn tại trong giỏ hàng.`,
          product,
        });
        return prev;
      }
      added = true;
      return [...prev, product];
    });

    if (added) {
      // Clear any previous error/warning alert so it doesn't shift layout
      setScanAlert(null);
    }
    return added;
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

        // Check if item is valid to add
        const alreadyInCart = cart.some(
          (item) => item.id === product.id || (product.barcode && item.barcode === product.barcode)
        );

        if (product.canAddToCart && !alreadyInCart) {
          const sourceEl =
            document.getElementById(`pos-product-thumb-${product.id}`) ||
            document.getElementById(`pos-product-${product.id}`) ||
            inputRef.current;
          const targetEl =
            document.getElementById('pos-cart-icon-target') ||
            document.getElementById('pos-cart-target') ||
            document.getElementById('pos-cart-till') ||
            rollContainerRef.current;

          if (sourceEl && targetEl) {
            // Animate flying into cart first, then update cart when flight lands
            await animateFlyToCart({
              sourceElement: sourceEl,
              targetElement: targetEl,
              imageUrl: product.imageUrl,
              name: product.name,
            }).catch(() => {});
          }
        }

        // Only after fly animation is complete: add to cart!
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

        const alreadyInCart = cart.some(
          (item) => item.id === product.id || (product.barcode && item.barcode === product.barcode)
        );

        if (product.canAddToCart && !alreadyInCart) {
          const sourceEl =
            document.getElementById(`pos-product-thumb-${product.id}`) ||
            document.getElementById('pos-camera-btn') ||
            inputRef.current;
          const targetEl =
            document.getElementById('pos-cart-icon-target') ||
            document.getElementById('pos-cart-target') ||
            document.getElementById('pos-cart-till') ||
            rollContainerRef.current;

          if (sourceEl && targetEl) {
            // Animate flying into cart first, then update cart when flight lands
            await animateFlyToCart({
              sourceElement: sourceEl,
              targetElement: targetEl,
              imageUrl: product.imageUrl,
              name: product.name,
            }).catch(() => {});
          }
        }

        // Only after fly animation is complete: add to cart!
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
  // Optimistic UI on button: flips to "Đã trong giỏ" immediately (0ms).
  // Landing-synced cart: Cart updates ONLY when the flying effect completes and lands in the cart.
  const handleSelectProductFromCatalog = async (item: PublicProduct, sourceElementId?: string) => {
    // 1. Quick check if already in cart or currently flying
    if (cart.some((c) => c.id === item.id) || flyingProductIds.has(item.id)) {
      setScanAlert({
        type: 'warning',
        title: 'Sản phẩm đã có trong giỏ hàng',
        message: `Mỗi sản phẩm ký gửi là duy nhất (x1 món). Sản phẩm "${item.name}" đã có trong giỏ.`,
      });
      return;
    }

    setScanAlert(null);
    setCheckoutError(null);

    // 2. OPTIMISTIC BUTTON: Immediately mark as flying so button flips to "Đã trong giỏ" with 0ms latency
    setFlyingProductIds((prev) => new Set(prev).add(item.id));

    // 3. Prepare source & target elements for flying animation
    const sourceEl =
      (sourceElementId && document.getElementById(sourceElementId)) ||
      document.getElementById(`pos-product-thumb-${item.id}`) ||
      document.getElementById(`pos-product-${item.id}`);

    const targetEl =
      document.getElementById('pos-cart-icon-target') ||
      document.getElementById('pos-cart-target') ||
      document.getElementById('pos-cart-till') ||
      rollContainerRef.current;

    // Start flying animation (duration ~1050ms)
    const flyPromise = (sourceEl && targetEl)
      ? animateFlyToCart({
        sourceElement: sourceEl,
        targetElement: targetEl,
        imageUrl: item.coverImageUrl,
        name: item.name,
      }).catch(() => {
        // Fallback on visual animation error
      })
      : Promise.resolve();

    // 4. Background server validation in parallel with flying animation
    const lookupPromise = posApi.lookupProduct(item.id).catch((err: unknown) => {
      const problem = parseProblemDetails(err);
      if (problem.status === 404 || problem.status === 409 || problem.status === 400) {
        throw err;
      }
      // Dev/fallback product
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
      return fallbackProduct;
    });

    try {
      // WAIT FOR BOTH: the animation to complete its flight & landing, AND server validation
      const [product] = await Promise.all([lookupPromise, flyPromise]);

      if (!product.canAddToCart) {
        // Rollback optimistic button state
        setFlyingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setScanAlert({
          type: 'error',
          title: 'Hàng không đủ điều kiện bán',
          message:
            product.rejectionReason ||
            `Sản phẩm đang ở trạng thái "${product.status}" không đủ điều kiện bán.`,
          product,
        });
        return;
      }

      // ONLY WHEN FLYING ANIMATION IS COMPLETE & LANDED: Add to cart!
      setCart((prev) => {
        if (prev.some((c) => c.id === item.id)) return prev;
        return [...prev, product];
      });

      // Clear from flying set now that product is safely in cart
      setFlyingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (err: unknown) {
      // Rollback optimistic button state on rejection
      setFlyingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      const problem = parseProblemDetails(err);
      const errorMsg =
        problem.status === 404
          ? `Không tìm thấy sản phẩm "${item.name}" trên hệ thống POS.`
          : problem.status === 409
            ? `Sản phẩm "${item.name}" vừa được bán hoặc không còn khả dụng.`
            : problem.title || problem.detail || 'Không thể thêm sản phẩm vào đơn.';

      setScanAlert({
        type: 'error',
        title: 'Không thể thêm sản phẩm',
        message: errorMsg,
      });
    }
  };

  // Product detail modal handlers
  const handleOpenProductDetail = (product: PublicProduct | PosProductLookupDto) => {
    setDetailModalProduct(product);
    setIsProductDetailOpen(true);
  };

  const handleCloseProductDetail = () => {
    setIsProductDetailOpen(false);
  };

  const handleThumbnailClick = (e: React.MouseEvent, p: PublicProduct, elementId: string) => {
    e.stopPropagation();
    const isAdded = cart.some((item) => item.id === p.id) || flyingProductIds.has(p.id);
    if (isAdded) return;

    if (clickTimerRef.current[p.id]) {
      clearTimeout(clickTimerRef.current[p.id]);
      delete clickTimerRef.current[p.id];
    }

    clickTimerRef.current[p.id] = setTimeout(() => {
      void handleSelectProductFromCatalog(p, elementId);
      delete clickTimerRef.current[p.id];
    }, 220);
  };

  const handleProductCardDoubleClick = (e: React.MouseEvent, p: PublicProduct) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimerRef.current[p.id]) {
      clearTimeout(clickTimerRef.current[p.id]);
      delete clickTimerRef.current[p.id];
    }
    handleOpenProductDetail(p);
  };

  // Remove individual unique item
  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    setFlyingProductIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setScanAlert(null);
    setCheckoutError(null);
  };

  // Open clear cart confirmation modal
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setIsClearCartModalOpen(true);
  };

  // Perform clearing cart when confirmed
  const handleConfirmClearCart = () => {
    setCart([]);
    setFlyingProductIds(new Set());
    setCashGiven(0);
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    setIsClearCartModalOpen(false);
    try {
      localStorage.removeItem('ocs_pos_cart');
    } catch {
      // ignore storage errors
    }
    inputRef.current?.focus({ preventScroll: true });
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
    setCompletedInvoice(null);
    setCashGiven(0);
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="w-full">
      {/* Main Two-Column Layout: pos-workspace-grid locks exact height to computer screen, never stretching with list */}
      <div
        ref={workspaceRef}
        style={{
          '--pos-workspace-height': workspaceHeight ? `${workspaceHeight}px` : 'calc(100vh - 215px)',
        } as React.CSSProperties}
        className="pos-workspace-grid grid grid-cols-1 gap-5 lg:grid-cols-12 lg:grid-rows-1 items-stretch min-h-0 w-full"
      >
        {/* Left Column (7 cols): Real Products from API Catalog (Replaces INITIAL_POS_PRODUCTS) */}
        <div className="lg:col-span-7 h-[520px] sm:h-[600px] lg:h-full min-h-0 flex flex-col overflow-hidden">
          <Card className="!p-4 sm:!p-5 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
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
            <div className="shrink-0 mt-3 flex flex-wrap items-center gap-1.5">
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
            <form onSubmit={handleScanOrLookup} className="shrink-0 mt-3 space-y-2">
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
                    placeholder="Quét mã vạch sản phẩm (hoặc nhập Barcode / SKU / tên món)"
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
                  id="pos-camera-btn"
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

                {/* Hidden submit button to allow Enter key to submit form */}
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-0.5">
              </div>
            </form>

            {/* Prominent Scan & Eligibility Alerts inside Card */}
            {scanAlert && scanAlert.type !== 'success' && (
              <div
                role="alert"
                aria-live="polite"
                className={`shrink-0 mt-2.5 flex items-start justify-between gap-3 rounded-xl border p-3 transition-all duration-200 animate-in fade-in ${scanAlert.type === 'error'
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
            <div className="mt-3 flex-1 min-h-0 flex flex-col overflow-hidden">
              {loadingProducts && availableProducts.length === 0 ? (
                <div className="flex-1 overflow-y-auto py-2">
                  <SkeletonLoading variant="list" count={4} />
                </div>
              ) : productsError ? (
                <div className="my-auto rounded-xl border border-red-200 bg-red-50 p-4 text-center">
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
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<Package className="size-7 text-muted" aria-hidden="true" />}
                    title="Không tìm thấy sản phẩm nào"
                    description="Không có sản phẩm nào đang bán phù hợp với bộ lọc danh mục hoặc từ khóa tìm kiếm."
                  />
                </div>
              ) : (
                <div className={`pos-catalog-scroll-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 transition-opacity duration-200 ${loadingProducts ? 'opacity-70' : 'opacity-100'}`}>
                  {availableProducts.map((p) => {
                    const isAdded = cart.some((item) => item.id === p.id) || flyingProductIds.has(p.id);
                    const priceNum = typeof p.listedPrice === 'number' ? p.listedPrice : Number(p.listedPrice) || 0;

                    return (
                      <div
                        key={p.id}
                        id={`pos-product-${p.id}`}
                        onDoubleClick={(e) => handleProductCardDoubleClick(e, p)}
                        title="Nhấn đúp (double-click) để xem chi tiết sản phẩm"
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all text-left cursor-pointer select-none ${isAdded
                          ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                          : 'border-border/80 bg-paper hover:border-brand-pink hover:shadow-xs'
                          }`}
                      >
                        {/* Quick detail preview button on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductDetail(p);
                          }}
                          className="absolute top-1.5 left-1.5 z-10 size-6 rounded-md bg-white/90 hover:bg-white text-ink shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          title="Xem chi tiết sản phẩm"
                          aria-label={`Xem chi tiết ${p.name}`}
                        >
                          <Eye className="size-3.5 text-brand-highlight" aria-hidden="true" />
                        </button>

                        {/* Thumbnail (Click to trigger fly-to-cart shrink animation, double-click for detail) */}
                        <div
                          id={`pos-product-thumb-${p.id}`}
                          onClick={(e) => handleThumbnailClick(e, p, `pos-product-thumb-${p.id}`)}
                          onDoubleClick={(e) => handleProductCardDoubleClick(e, p)}
                          className={`relative aspect-square w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center transition-all ${!isAdded ? 'cursor-pointer hover:opacity-95' : ''
                            }`}
                          title={!isAdded ? 'Nhấn để thêm vào giỏ · Nhấn đúp để xem chi tiết' : 'Đã trong giỏ · Nhấn đúp để xem chi tiết'}
                        >
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

                          <span className="absolute bottom-1.5 left-1.5 rounded bg-ink/75 px-1 py-0.5 text-[9px] font-semibold text-white">
                            SL: 1
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

                        {/* Action Button - Optimistic UI */}
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSelectProductFromCatalog(p, `pos-product-thumb-${p.id}`);
                          }}
                          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-[13px] font-bold transition-all shadow-2xs ${isAdded
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                            : 'bg-surface hover:bg-brand-pink-light hover:text-brand-highlight text-ink cursor-pointer active:scale-95'
                            }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="size-3.5" aria-hidden="true" />
                              <span>Đã trong giỏ</span>
                            </>
                          ) : (
                            <>
                              <Plus className="size-3.5" aria-hidden="true" />
                              <span>Thêm vào giỏ</span>
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

        {/* Right Column (5 cols): Harmonized Cart Card matching application cards */}
        <div className="lg:col-span-5 h-[520px] sm:h-[600px] lg:h-full min-h-0 flex flex-col overflow-hidden">
          <Card
            id="pos-cart-till"
            className="!p-4 sm:!p-5 flex flex-col h-full min-h-0 relative transition-all border-brand-lavender/40 overflow-hidden"
          >
            {/* Target anchor for flying animation */}
            <div
              id="pos-cart-target"
              className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-3 pointer-events-none"
              aria-hidden="true"
            />

            {/* Header: Title, Count, Subtitle, and Actions */}
            <div className="shrink-0 space-y-1 pb-2 border-b border-border/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    id="pos-cart-icon-target"
                    className="rounded-lg bg-brand-pink-light p-1.5 text-brand-highlight transition-transform shadow-2xs"
                  >
                    <ShoppingCart className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-ink">
                    Giỏ hàng · {cart.length} món
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {(cart.length > 0 || completedInvoice) && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-brand-highlight bg-brand-pink-light/70 hover:bg-brand-highlight hover:text-white border border-brand-highlight/30 hover:border-brand-highlight shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 group shrink-0"
                      title="Xem và xuất hóa đơn bán lẻ (Hiệu ứng máy in)"
                    >
                      <Printer className="size-3.5 text-brand-highlight group-hover:text-white transition-colors" aria-hidden="true" />
                      <span>Xuất HĐ</span>
                    </button>
                  )}

                  {cart.length > 0 && !completedInvoice && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 shadow-2xs transition-all cursor-pointer shrink-0"
                      title="Xóa toàn bộ giỏ hàng"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span>Xóa tất cả</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Items List with Product Thumbnails & Details */}
            <div
              ref={rollContainerRef}
              className="pos-cart-items-container flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scroll-smooth py-1"
            >
              {cart.length === 0 ? (
                <div className="h-full min-h-[140px] py-6 text-center flex flex-col items-center justify-center">
                  <div className="rounded-2xl bg-surface p-3 shadow-2xs mb-2 text-muted">
                    <ShoppingCart className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold text-ink">Giỏ hàng đang trống</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Scan mã vạch hoặc chọn sản phẩm để bắt đầu.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    onDoubleClick={() => handleOpenProductDetail(item)}
                    title="Nhấn đúp (double-click) để xem chi tiết sản phẩm"
                    className="flex items-center gap-3 rounded-xl bg-surface/40 p-2.5 border border-border/70 shadow-2xs transition-all hover:border-brand-pink hover:bg-surface/80 group cursor-pointer select-none"
                  >
                    {/* Thumbnail Image */}
                    <div className="size-14 sm:size-16 rounded-lg overflow-hidden bg-surface border border-border/70 shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="size-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="size-6 text-muted/60" aria-hidden="true" />
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className="text-xs sm:text-sm font-bold text-ink truncate"
                          title={item.name}
                        >
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProductDetail(item);
                          }}
                          className="p-1 text-muted hover:text-brand-highlight hover:bg-surface-subtle rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          title="Xem chi tiết món này"
                          aria-label={`Xem chi tiết ${item.name}`}
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted font-medium truncate">
                        {item.size ? `Size ${item.size} · ` : ''}{item.barcode || item.id}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-black text-brand-ink">
                        {formatVndCurrency(item.listedPrice)}
                      </p>
                    </div>

                    {/* Remove Action Button */}
                    {!completedInvoice && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        className="p-1.5 text-muted hover:text-danger hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Xóa món này khỏi giỏ hàng"
                        aria-label={`Xóa ${item.name}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Summary & Checkout Section - Fixed at bottom */}
            <div className="shrink-0 space-y-2 pt-2 border-t border-border/70">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted font-medium">
                  <span>Tổng giá bán</span>
                  <span className="font-semibold text-ink">{formatVndCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base font-bold text-ink">
                  <span>Tổng thanh toán</span>
                  <span className="font-mono text-base sm:text-lg font-black text-brand-highlight">
                    {formatVndCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Payment Section */}
              {completedInvoice ? (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Printer className="size-4" aria-hidden="true" />}
                      onClick={() => window.print()}
                      className="text-xs font-bold bg-paper text-ink border-border hover:bg-surface"
                    >
                      In bill (80mm)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Printer className="size-4" aria-hidden="true" />}
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className="text-xs font-bold bg-brand-pink-surface text-brand-highlight border-brand-pink/50 hover:bg-brand-highlight hover:text-white hover:border-brand-highlight transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95"
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
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface border border-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                        setCheckoutError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentMethod === 'cash'
                        ? 'bg-paper text-brand-ink shadow-xs border border-brand-pink/40'
                        : 'text-muted hover:text-ink hover:bg-surface-subtle'
                        }`}
                    >
                      <Banknote className="size-3.5 text-brand-highlight" aria-hidden="true" />
                      <span>Tiền mặt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('vietqr');
                        setCheckoutError(null);
                      }}
                      className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentMethod === 'vietqr'
                        ? 'bg-paper text-brand-ink shadow-xs border border-brand-pink/40'
                        : 'text-muted hover:text-ink hover:bg-surface-subtle'
                        }`}
                    >
                      <QrCode className="size-3.5 text-brand-highlight" aria-hidden="true" />
                      <span>VietQR</span>
                    </button>
                  </div>

                  {/* Cash Payment Section */}
                  {paymentMethod === 'cash' && (
                    <div className="rounded-xl border border-border/80 bg-surface/30 p-2.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <label htmlFor="cash-given-input" className="text-xs font-bold text-ink">
                          Tiền khách đưa:
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={handleSetExactCash}
                            disabled={cart.length === 0}
                            className="rounded-lg px-2 py-0.5 text-[11px] font-bold bg-brand-pink-light text-brand-highlight hover:bg-brand-pink-light/80 border border-brand-pink/40 transition-all cursor-pointer disabled:opacity-50"
                          >
                            Đưa đủ
                          </button>
                          {quickCashSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setCashGiven(suggestion);
                                setCheckoutError(null);
                                setIsNetworkError(false);
                              }}
                              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${cashGiven === suggestion
                                ? 'bg-brand-highlight text-white shadow-2xs'
                                : 'bg-brand-pink-light text-brand-highlight hover:bg-brand-pink-light/80 border border-brand-pink/30'
                                }`}
                            >
                              {`${Math.round(suggestion / 1000).toLocaleString('vi-VN')}k`}
                            </button>
                          ))}
                          {cashGiven > 0 && (
                            <button
                              type="button"
                              onClick={handleClearCash}
                              className="text-[11px] font-medium text-muted hover:text-ink hover:underline ml-1 cursor-pointer"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="relative">
                          <input
                            id="cash-given-input"
                            type="text"
                            inputMode="numeric"
                            value={cashGiven ? cashGiven.toLocaleString('en-US') : ''}
                            onChange={(e) => {
                              const rawDigits = e.target.value.replace(/\D/g, '');
                              const num = rawDigits ? parseInt(rawDigits, 10) : 0;
                              setCashGiven(Math.min(num, 1_000_000_000_000));
                              setCheckoutError(null);
                              setIsNetworkError(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isCashSufficient && !isCheckingOut) {
                                e.preventDefault();
                                handleOpenConfirmModal();
                              }
                            }}
                            placeholder="0"
                            className="w-full rounded-xl border border-border bg-paper py-2 pl-3 pr-8 text-right text-base sm:text-lg font-black text-ink placeholder:text-muted/60 focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight/30 shadow-2xs"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-muted">
                            đ
                          </span>
                        </div>
                        {cashGiven > 0 && (
                          <p className="text-[10.5px] text-muted italic truncate" title={formatVndInWords(cashGiven)}>
                            Bằng chữ: <span className="font-semibold text-brand-ink">{formatVndInWords(cashGiven)}</span>
                          </p>
                        )}
                      </div>

                      {/* Change calculation */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="text-xs font-bold text-ink">Tiền thừa trả khách:</span>
                        <span
                          className={`text-base sm:text-lg font-black font-mono ${isCashSufficient
                            ? 'text-brand-highlight'
                            : totalAmount > 0 && cashGiven > 0
                              ? 'text-amber-600'
                              : 'text-muted'
                            }`}
                        >
                          {isCashSufficient
                            ? formatVndCurrency(changeAmount)
                            : totalAmount > 0 && cashGiven > 0
                              ? `Thiếu ${formatVndCurrency(totalAmount - cashGiven)}`
                            : '0 đ'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* VietQR Helper */}
                  {paymentMethod === 'vietqr' && (
                    <div className="rounded-xl border border-brand-pink/60 bg-brand-pink-light/40 p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <QrCode className="size-4 text-brand-highlight shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-ink/80 leading-relaxed text-[11.5px]">
                          Khách quét mã VietQR tự động khớp giao dịch 100%. Bạn có thể chuyển sang phân hệ <strong>Hóa đơn chờ VietQR</strong>.
                        </p>
                      </div>
                      {onSwitchToVietQr && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-white text-ink border-border hover:bg-surface py-1"
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
                      className={`rounded-lg border p-2 text-xs flex flex-col gap-1.5 ${isNetworkError
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
                          <p className="leading-relaxed font-medium text-[11px]">{checkoutError}</p>
                        </div>
                      </div>

                      {isNetworkError && (
                        <div className="flex justify-end pt-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isCheckingOut}
                            loadingText="Đang kết nối lại..."
                            startIcon={<RefreshCw className="size-3" aria-hidden="true" />}
                            onClick={handleCheckoutCash}
                            className="text-xs font-bold border-red-300 bg-white text-red-800 hover:bg-red-50 py-1"
                          >
                            Thử lại thanh toán
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checkout Action Button */}
                  {paymentMethod === 'cash' ? (
                    <button
                      type="button"
                      disabled={cart.length === 0 || !isCashSufficient || isCheckingOut}
                      onClick={handleOpenConfirmModal}
                      className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-[#F06292] hover:bg-[#E84E7F] active:bg-[#D83A6D] text-white font-black shadow-sm flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                    >
                      <div className="size-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                        <Printer className="size-3.5 sm:size-4 text-white" aria-hidden="true" />
                      </div>
                      <span className="font-black uppercase tracking-wide text-xs sm:text-sm">
                        {isCheckingOut
                          ? 'Đang xử lý thanh toán...'
                          : 'XÁC NHẬN THANH TOÁN & XUẤT BILL'}
                      </span>
                    </button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={cart.length === 0}
                      onClick={onSwitchToVietQr}
                      className="w-full py-2.5 sm:py-3 text-xs sm:text-sm font-black bg-brand-ink text-white hover:bg-brand-ink/90 disabled:opacity-50 shadow-md rounded-xl"
                      startIcon={<QrCode className="size-4" aria-hidden="true" />}
                    >
                      Chuyển qua màn hình VietQR
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
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

      {/* Clear Cart Confirmation Modal */}
      <Modal
        open={isClearCartModalOpen}
        onClose={() => setIsClearCartModalOpen(false)}
        title="Xác nhận xóa giỏ hàng"
        appearance="simple"
        className="max-w-[300px] overflow-hidden rounded-2xl [&>header]:hidden [&>fieldset>div]:!p-0"
        footer={null}
      >
        <div className="px-5 pt-6 pb-4 text-center">
          <h3 className="text-base font-bold text-ink sm:text-lg">
            Xóa {cart.length} sản phẩm?
          </h3>
          <p className="mt-1.5 text-xs text-muted sm:text-sm">
            Các sản phẩm đã xóa không thể khôi phục
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-border">
          <button
            type="button"
            onClick={() => setIsClearCartModalOpen(false)}
            className="border-r border-border py-3 px-4 text-center text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-ink cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirmClearCart}
            className="py-3 px-4 text-center text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            Xóa
          </button>
        </div>
      </Modal>

      {/* Product Detail Card Modal on Double Click */}
      <PosProductDetailModal
        open={isProductDetailOpen}
        product={detailModalProduct}
        isInCart={
          detailModalProduct
            ? cart.some((item) => item.id === detailModalProduct.id) || flyingProductIds.has(detailModalProduct.id)
            : false
        }
        onClose={handleCloseProductDetail}
        onAddToCart={(prod) => {
          if ('canAddToCart' in prod) {
            addLookupProductToCart(prod);
          } else {
            void handleSelectProductFromCatalog(prod);
          }
        }}
      />
    </div >
  );
};

export default PosCartWorkspace;
