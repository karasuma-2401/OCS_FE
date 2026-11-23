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
  EyeOff,
  PauseCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Combobox,
  EmptyState,
  Modal,
  SkeletonLoading,
} from '@/components/shared';
import {
  posApi,
  type PosProductLookupDto,
  type PosCashPaymentResponse,
} from '@/api/pos';
import type { VietQrPaymentSession } from '@/types';
import {
  getPublicProducts,
  CATEGORY_NAMES,
  getCategoryIdByName,
  type PublicProduct,
  type ProductSortOption,
} from '@/api/products';
import {
  VietQrPaymentModal,
  formatVndCurrency,
  playPaymentSuccessChime,
} from './VietQrPaymentModal';
import { PosInvoiceSuccessModal } from './PosInvoiceSuccessModal';
import { PosCashConfirmModal } from './PosCashConfirmModal';
import { PosBarcodeScannerModal } from './PosBarcodeScannerModal';
import { PosProductDetailModal } from './PosProductDetailModal';
import { formatVndInWords } from '@/utils/currencyWords';
import { parseProblemDetails } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { animateFlyToCart } from './flyToCart';
import {
  MAX_HELD_ORDERS,
  addHeldOrderTab,
  buildQuickCashSuggestions,
  findOtherOrderHoldingProduct,
  loadInitialOrdersState,
  persistOrdersState,
  removeHeldOrderTab,
  type PosOrdersState,
  type PosPaymentMethod,
} from './posOrders';
import './posReceipt.css';

export interface PosCartWorkspaceProps {
  isActive?: boolean;
  onSwitchToVietQr?: () => void;
}

interface ScanAlert {
  type: 'error' | 'warning' | 'success';
  title: string;
  message: string;
  product?: PosProductLookupDto;
}

const QUICK_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'Free'] as const;

const POS_SIZE_OPTIONS = [
  { value: '', label: 'Tất cả size' },
  ...QUICK_SIZE_OPTIONS.map((sz) => ({ value: sz, label: `Size ${sz}` })),
];

const POS_SORT_OPTIONS: Array<{ value: ProductSortOption; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'priceAsc', label: 'Giá tăng dần' },
  { value: 'priceDesc', label: 'Giá giảm dần' },
];

export const PosCartWorkspace: React.FC<PosCartWorkspaceProps> = ({
  isActive = true,
  onSwitchToVietQr,
}) => {
  const { user } = useAuth();
  const cashierDisplayName = user?.fullName || user?.email || 'Nhân viên OCS';

  // Multi-order (Hold Cart) state persisted in localStorage
  const [ordersState, setOrdersState] = useState<PosOrdersState>(() => loadInitialOrdersState());
  const activeOrder =
    ordersState.orders.find((o) => o.id === ordersState.activeOrderId) ?? ordersState.orders[0];
  const cart = activeOrder.items;
  const paymentMethod = activeOrder.paymentMethod;
  const cashGiven = activeOrder.cashGiven;

  const setCart = useCallback(
    (updater: PosProductLookupDto[] | ((prev: PosProductLookupDto[]) => PosProductLookupDto[])) => {
      setOrdersState((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.id !== prev.activeOrderId) return order;
          const nextItems = typeof updater === 'function' ? updater(order.items) : updater;
          return { ...order, items: nextItems };
        }),
      }));
    },
    []
  );

  const setPaymentMethod = useCallback(
    (updater: PosPaymentMethod | ((prev: PosPaymentMethod) => PosPaymentMethod)) => {
      setOrdersState((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.id !== prev.activeOrderId) return order;
          const nextMethod = typeof updater === 'function' ? updater(order.paymentMethod) : updater;
          return { ...order, paymentMethod: nextMethod };
        }),
      }));
    },
    []
  );

  const setCashGiven = useCallback(
    (updater: number | ((prev: number) => number)) => {
      setOrdersState((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => {
          if (order.id !== prev.activeOrderId) return order;
          const nextCash = typeof updater === 'function' ? updater(order.cashGiven) : updater;
          return { ...order, cashGiven: nextCash };
        }),
      }));
    },
    []
  );

  // Barcode / Identifier input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scanAlert, setScanAlert] = useState<ScanAlert | null>(null);

  // Available products list & quick catalog filters
  const [availableProducts, setAvailableProducts] = useState<PublicProduct[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [sortOption, setSortOption] = useState<ProductSortOption>('newest');
  const [hideInCart, setHideInCart] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');
  const [flyingProductIds, setFlyingProductIds] = useState<Set<string>>(() => new Set());
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(() => new Set());
  const [cartScrollEdge, setCartScrollEdge] = useState<{ top: boolean; bottom: boolean }>({
    top: false,
    bottom: false,
  });

  // Payment state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Completed invoice modal & invoice preview
  const [completedInvoice, setCompletedInvoice] = useState<PosCashPaymentResponse | null>(null);
  const [isPreviewInvoiceOpen, setIsPreviewInvoiceOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);
  const [vietQrSession, setVietQrSession] = useState<VietQrPaymentSession | null>(null);
  const [isVietQrModalOpen, setIsVietQrModalOpen] = useState(false);
  const pendingVietQrReceiptRef = useRef<PosCashPaymentResponse | null>(null);

  // Product detail card modal on double-click or Eye icon
  const [detailModalProduct, setDetailModalProduct] = useState<PublicProduct | PosProductLookupDto | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  // Input ref for quick autofocus & receipt roll ref
  const inputRef = useRef<HTMLInputElement>(null);
  const rollContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceHeight, setWorkspaceHeight] = useState<number | null>(null);

  const syncCartScrollEdge = useCallback(() => {
    const el = rollContainerRef.current;
    if (!el) return;
    const top = el.scrollTop > 6;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 6;
    setCartScrollEdge((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  // Dynamic viewport fit calculation for every computer screen
  useEffect(() => {
    if (!isActive) return;
    const calculateHeight = () => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const available = window.innerHeight - rect.top - 16;
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
  }, [isActive]);

  // Auto scroll to bottom of receipt roll when a new item is added to the end
  useEffect(() => {
    if (cart.length > 0 && rollContainerRef.current) {
      rollContainerRef.current.scrollTop = rollContainerRef.current.scrollHeight;
    }
    const rafId = requestAnimationFrame(syncCartScrollEdge);
    return () => cancelAnimationFrame(rafId);
  }, [cart.length, workspaceHeight, syncCartScrollEdge]);

  // Persist multi-order state to localStorage for session safety
  useEffect(() => {
    persistOrdersState(ordersState);
  }, [ordersState]);

  // Focus input when active on mount or tab switch
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [isActive]);

  // Debounce catalog search so typing product names doesn't spam the API
  useEffect(() => {
    const trimmed = catalogSearch.trim();
    if (!trimmed) {
      setDebouncedCatalogSearch('');
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedCatalogSearch(trimmed);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [catalogSearch]);

  // Fetch real products from API
  const loadAvailableProducts = useCallback(async (
    signal?: AbortSignal,
    pageToLoad = 1,
    append = false,
  ) => {
    if (append) {
      setLoadingMoreProducts(true);
    } else {
      setLoadingProducts(true);
    }
    setProductsError(null);
    try {
      const categoryId = selectedCategory !== 'Tất cả' ? getCategoryIdByName(selectedCategory) : undefined;
      const res = await getPublicProducts(
        {
          page: pageToLoad,
          pageSize: 24,
          categoryId,
          size: selectedSize || undefined,
          sort: sortOption,
          q: debouncedCatalogSearch || undefined,
        },
        signal
      );
      const nextItems = res.items || [];
      setAvailableProducts((prev) => {
        if (!append) return nextItems;
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...nextItems.filter((item) => !existingIds.has(item.id))];
      });
      setTotalProductsCount(res.totalCount ?? nextItems.length);
      setCurrentPage(res.page ?? pageToLoad);
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
        setLoadingMoreProducts(false);
      }
    }
  }, [selectedCategory, selectedSize, sortOption, debouncedCatalogSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAvailableProducts(controller.signal, 1, false);
    return () => controller.abort();
  }, [loadAvailableProducts]);

  // Compute total
  const totalAmount = cart.reduce((sum, item) => sum + (item.listedPrice || 0), 0);
  const changeAmount = Math.max(0, cashGiven - totalAmount);
  const isCashSufficient = cashGiven >= totalAmount && totalAmount > 0;

  // Quick cash suggestion chips (always up to 3 distinct denominations)
  const quickCashSuggestions = React.useMemo(
    () => buildQuickCashSuggestions(totalAmount),
    [totalAmount]
  );

  // Cash adjustment handlers
  const handleSetExactCash = useCallback(() => {
    setCashGiven(totalAmount);
    setCheckoutError(null);
    setIsNetworkError(false);
  }, [totalAmount]);

  const handleClearCash = () => {
    setCashGiven(0);
    setCheckoutError(null);
    setIsNetworkError(false);
  };

  // Add product to cart with validation of unique single-item across all held orders and eligibility
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

    // Rule 2: Prevent reserving the same unique item in another parked order tab
    const holdingOrder = findOtherOrderHoldingProduct(
      ordersState.orders,
      ordersState.activeOrderId,
      product.id,
      product.barcode
    );
    if (holdingOrder) {
      setScanAlert({
        type: 'warning',
        title: `Sản phẩm đang giữ ở ${holdingOrder.label}`,
        message: `Mỗi món ký gửi là duy nhất (SL: 1). "${product.name}" hiện đang nằm trong ${holdingOrder.label}.`,
        product,
      });
      return false;
    }

    // Rule 3: Single-item consignment unique check within active order
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

  // Camera scan success handler (does not reset/flash catalog grid)
  const handleCameraScanSuccess = useCallback(
    async (code: string) => {
      setBarcodeInput(code);
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
    const holdingOrder = findOtherOrderHoldingProduct(
      ordersState.orders,
      ordersState.activeOrderId,
      item.id
    );
    if (holdingOrder) {
      setScanAlert({
        type: 'warning',
        title: `Sản phẩm đang giữ ở ${holdingOrder.label}`,
        message: `Mỗi sản phẩm ký gửi là duy nhất (SL: 1). "${item.name}" đang được giữ trong ${holdingOrder.label}.`,
      });
      return;
    }

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

    // Start flying animation (duration ~620ms)
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

  const handleProductCardDoubleClick = (e: React.MouseEvent, p: PublicProduct) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Hold Order (Park Cart) handlers
  const handleParkOrNewOrder = useCallback(() => {
    if (ordersState.orders.length >= MAX_HELD_ORDERS) {
      setScanAlert({
        type: 'warning',
        title: `Đã đạt tối đa ${MAX_HELD_ORDERS} đơn tạm`,
        message: `Vui lòng hoàn tất hoặc đóng bớt một đơn đang giữ trước khi tạo thêm đơn mới.`,
      });
      return;
    }
    setOrdersState((prev) => addHeldOrderTab(prev));
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    inputRef.current?.focus({ preventScroll: true });
  }, [ordersState.orders.length]);

  const handleSwitchOrderTab = useCallback((orderId: string) => {
    setOrdersState((prev) => ({ ...prev, activeOrderId: orderId }));
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const handleCloseOrderTab = useCallback((orderId: string) => {
    setOrdersState((prev) => removeHeldOrderTab(prev, orderId));
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
  }, []);

  // Perform clearing cart when confirmed
  const handleConfirmClearCart = () => {
    setCart([]);
    setFlyingProductIds(new Set());
    setCashGiven(0);
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    setIsClearCartModalOpen(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  // Open transaction confirmation modal
  const handleOpenConfirmModal = useCallback(() => {
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
  }, [cart.length, cashGiven, totalAmount]);

  const handleCheckoutVietQr = useCallback(async () => {
    if (cart.length === 0) {
      setCheckoutError('Giỏ hàng trống. Vui lòng quét ít nhất 1 sản phẩm trước khi tạo mã VietQR.');
      setIsNetworkError(false);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);
    setIsNetworkError(false);

    try {
      const session = await posApi.checkoutVietQr({
        productIds: cart.map((item) => item.id),
      });

      if (!session || !session.transactionId || !session.saleInvoiceId) {
        throw new Error('Máy chủ API không phản hồi phiên thanh toán VietQR hợp lệ.');
      }

      setVietQrSession(session);
      setIsVietQrModalOpen(true);
    } catch (err: unknown) {
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
          'Lỗi kết nối mạng: Không thể kết nối tới máy chủ POS (API) để khởi tạo mã VietQR. Giỏ hàng vẫn được giữ nguyên.'
        );
      } else {
        setCheckoutError(
          problem.detail ||
          problem.title ||
          'Không thể tạo mã thanh toán VietQR cho giỏ hàng hiện tại.'
        );
      }
    } finally {
      setIsCheckingOut(false);
    }
  }, [cart]);

  const handleVietQrPaymentSuccess = useCallback(
    (session: VietQrPaymentSession) => {
      const parsedAmount = Number(session.amount);
      const finalTotal = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : totalAmount;

      pendingVietQrReceiptRef.current = {
        invoiceId: session.saleInvoiceId,
        invoiceNumber: session.invoiceNumber,
        totalAmount: finalTotal,
        cashGiven: finalTotal,
        changeAmount: 0,
        createdAt: new Date().toISOString(),
        items: cart.map((item) => ({
          productId: item.id,
          barcode: item.barcode,
          name: item.name,
          price: item.listedPrice,
        })),
      };

      setCart([]);
      setCashGiven(0);
      setScanAlert(null);
      setCheckoutError(null);
      try {
        localStorage.removeItem('ocs_pos_cart');
      } catch {
        // ignore storage errors
      }
      void loadAvailableProducts(undefined, 1, false);
    },
    [cart, totalAmount, loadAvailableProducts]
  );

  // Desktop cashier keyboard shortcuts: F1 (barcode), F2 (exact cash), F8 (toggle payment), F9 (checkout)
  useEffect(() => {
    if (
      !isActive ||
      isConfirmModalOpen ||
      isPreviewInvoiceOpen ||
      isCameraScannerOpen ||
      isClearCartModalOpen ||
      isProductDetailOpen ||
      isVietQrModalOpen ||
      Boolean(completedInvoice)
    ) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (paymentMethod === 'cash' && cart.length > 0) {
          handleSetExactCash();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleParkOrNewOrder();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod((prev) => (prev === 'cash' ? 'vietqr' : 'cash'));
        setCheckoutError(null);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (paymentMethod === 'cash' && isCashSufficient && !isCheckingOut) {
          handleOpenConfirmModal();
        } else if (paymentMethod === 'vietqr' && cart.length > 0 && !isCheckingOut) {
          void handleCheckoutVietQr();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    isConfirmModalOpen,
    isPreviewInvoiceOpen,
    isCameraScannerOpen,
    isClearCartModalOpen,
    isProductDetailOpen,
    isVietQrModalOpen,
    completedInvoice,
    paymentMethod,
    cart.length,
    isCashSufficient,
    isCheckingOut,
    handleSetExactCash,
    handleParkOrNewOrder,
    handleOpenConfirmModal,
    handleCheckoutVietQr,
  ]);

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
    setOrdersState((prev) =>
      prev.orders.length > 1 ? removeHeldOrderTab(prev, prev.activeOrderId) : prev
    );
    setCashGiven(0);
    setScanAlert(null);
    setCheckoutError(null);
    setIsNetworkError(false);
    inputRef.current?.focus({ preventScroll: true });
  };

  // Compute filtered catalog products for "Ẩn món đã chọn" toggle
  const hasActiveCatalogFilters =
    selectedCategory !== 'Tất cả' ||
    selectedSize !== '' ||
    sortOption !== 'newest' ||
    hideInCart ||
    catalogSearch.trim().length > 0;

  const visibleProducts = React.useMemo(() => {
    if (!hideInCart) return availableProducts;
    return availableProducts.filter((p) => {
      const inCurrentCart = cart.some((item) => item.id === p.id) || flyingProductIds.has(p.id);
      const inOtherOrder = Boolean(
        findOtherOrderHoldingProduct(ordersState.orders, ordersState.activeOrderId, p.id)
      );
      return !inCurrentCart && !inOtherOrder;
    });
  }, [availableProducts, hideInCart, cart, flyingProductIds, ordersState.orders, ordersState.activeOrderId]);

  return (
    <div className="w-full">
      {/* Main Two-Column Layout: locks exact height to viewport on lg+ screens, never stretching with list */}
      <div
        ref={workspaceRef}
        style={{
          '--pos-workspace-height': workspaceHeight ? `${workspaceHeight}px` : 'calc(100vh - 150px)',
        } as React.CSSProperties}
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] lg:h-[var(--pos-workspace-height,calc(100vh-150px))] lg:max-h-[var(--pos-workspace-height,calc(100vh-150px))] lg:min-h-[500px] items-stretch min-h-0 w-full"
      >
        {/* Left Column (7 cols): Real Products from API Catalog */}
        <div className="lg:col-span-7 h-[520px] sm:h-[600px] lg:h-full min-h-0 flex flex-col overflow-hidden">
          <Card className="!p-3.5 sm:!p-4 flex flex-col h-full min-h-0 overflow-hidden">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="size-4.5 text-brand-highlight" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink">Hàng có sẵn</h3>
                <Badge variant="info">
                  {totalProductsCount > availableProducts.length
                    ? `${availableProducts.length}/${totalProductsCount} sản phẩm`
                    : `${totalProductsCount || availableProducts.length} sản phẩm`}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                startIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                onClick={() => void loadAvailableProducts(undefined, 1, false)}
                loading={loadingProducts}
              >
                Làm mới
              </Button>
            </div>

            {/* Category Pills + Quick Filters (Size / Sort / Hide in Cart) */}
            <div className="shrink-0 mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORY_NAMES.map((catName) => (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setSelectedCategory(catName)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${selectedCategory === catName
                      ? 'bg-brand-highlight text-white shadow-xs'
                      : 'bg-surface text-muted hover:text-ink hover:bg-surface-subtle'
                      }`}
                  >
                    {catName}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Combobox
                  size="sm"
                  ariaLabel="Lọc theo size"
                  options={POS_SIZE_OPTIONS}
                  value={selectedSize}
                  onChange={setSelectedSize}
                  className="w-28"
                />

                <Combobox
                  size="sm"
                  ariaLabel="Sắp xếp sản phẩm"
                  options={POS_SORT_OPTIONS}
                  value={sortOption}
                  onChange={(val) => setSortOption(val as ProductSortOption)}
                  className="w-32"
                />

                <button
                  type="button"
                  onClick={() => setHideInCart((prev) => !prev)}
                  aria-pressed={hideInCart}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    hideInCart
                      ? 'border-brand-pink bg-brand-pink-light text-brand-highlight'
                      : 'border-border/80 bg-paper text-muted hover:text-ink hover:bg-surface'
                  }`}
                  title="Ẩn các sản phẩm đã thêm vào giỏ hoặc đang giữ ở đơn khác"
                >
                  <EyeOff className="size-3" aria-hidden="true" />
                  <span>Ẩn đã chọn</span>
                </button>

                {hasActiveCatalogFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('Tất cả');
                      setSelectedSize('');
                      setSortOption('newest');
                      setHideInCart(false);
                      setBarcodeInput('');
                      setCatalogSearch('');
                      setDebouncedCatalogSearch('');
                    }}
                    className="text-[11px] font-semibold text-brand-highlight hover:underline px-1 cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>

            {/* Barcode Lookup & Catalog Search Form with Harmonized Camera Scanner Button */}
            <form onSubmit={handleScanOrLookup} className="shrink-0 mt-2.5">
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
                    placeholder="Quét mã vạch (Enter) hoặc tìm Barcode / tên món..."
                    disabled={isLookingUp}
                    className="w-full rounded-xl border border-border bg-paper py-2 pl-9 pr-16 text-xs font-medium text-ink placeholder:text-muted/70 focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight/30 transition-all disabled:opacity-60 shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                    {barcodeInput ? (
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('');
                          setCatalogSearch('');
                          setDebouncedCatalogSearch('');
                          inputRef.current?.focus({ preventScroll: true });
                        }}
                        className="rounded p-1 text-muted hover:text-ink cursor-pointer"
                        aria-label="Xóa nội dung"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      <kbd className="hidden lg:inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
                        F1
                      </kbd>
                    )}
                  </div>
                </div>

                <Button
                  id="pos-camera-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  startIcon={<Camera className="size-3.5 text-white" aria-hidden="true" />}
                  onClick={() => setIsCameraScannerOpen(true)}
                  title="Mở máy quét mã vạch bằng camera"
                  className="bg-brand-ink enabled:hover:bg-brand-ink/90 enabled:active:bg-brand-ink text-white font-bold border-brand-ink shadow-xs py-2 px-3 shrink-0"
                >
                  Quét Barcode
                </Button>

                {/* Hidden submit button to allow Enter key to submit form */}
                <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
              </div>
            </form>

            {/* Prominent Scan & Eligibility Alerts inside Card */}
            {scanAlert && scanAlert.type !== 'success' && (
              <div
                role="alert"
                aria-live="polite"
                className={`shrink-0 mt-2.5 flex items-start justify-between gap-3 rounded-xl border p-2.5 transition-all duration-200 animate-in fade-in ${scanAlert.type === 'error'
                  ? 'border-red-300 bg-red-50 text-red-950'
                  : 'border-amber-300 bg-amber-50 text-amber-950'
                  }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="rounded-lg bg-white/80 p-1.5 shadow-2xs shrink-0 mt-0.5">
                    <AlertTriangle
                      className={`size-4 ${scanAlert.type === 'error' ? 'text-red-600' : 'text-amber-600'}`}
                      aria-hidden="true"
                    />
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
            <div className="mt-2.5 flex-1 min-h-0 flex flex-col overflow-hidden">
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
                    onClick={() => void loadAvailableProducts(undefined, 1, false)}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<Package className="size-7 text-muted" aria-hidden="true" />}
                    title="Không tìm thấy sản phẩm nào"
                    description="Không có sản phẩm nào đang bán phù hợp với bộ lọc danh mục, size hoặc từ khóa tìm kiếm."
                  />
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={<EyeOff className="size-7 text-muted" aria-hidden="true" />}
                    title="Tất cả sản phẩm đang hiển thị đều đã nằm trong giỏ"
                    description="Tắt bộ lọc “Ẩn đã chọn” hoặc mở rộng danh mục để xem tiếp."
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHideInCart(false)}
                      >
                        Hiện lại tất cả sản phẩm
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className={`pos-catalog-scroll-grid flex-1 min-h-0 overflow-y-auto pr-1 pb-1 transition-opacity duration-200 ${loadingProducts ? 'opacity-70' : 'opacity-100'}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {visibleProducts.map((p) => {
                      const isAddedInCurrent = cart.some((item) => item.id === p.id) || flyingProductIds.has(p.id);
                      const heldInOtherOrder = !isAddedInCurrent
                        ? findOtherOrderHoldingProduct(ordersState.orders, ordersState.activeOrderId, p.id)
                        : undefined;
                      const isDisabledCard = isAddedInCurrent || Boolean(heldInOtherOrder);
                      const priceNum = typeof p.listedPrice === 'number' ? p.listedPrice : Number(p.listedPrice) || 0;
                      const showImage = Boolean(p.coverImageUrl) && !brokenImageIds.has(`catalog-${p.id}`);

                      return (
                        <div
                          key={p.id}
                          id={`pos-product-${p.id}`}
                          onDoubleClick={(e) => handleProductCardDoubleClick(e, p)}
                          title="Nhấn đúp để xem chi tiết sản phẩm · Bấm 'Thêm vào giỏ' để chọn"
                          className={`group relative flex flex-col rounded-xl border p-2.5 transition-all text-left select-none ${isAddedInCurrent
                            ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                            : heldInOtherOrder
                              ? 'border-amber-300 bg-amber-50/35 shadow-xs'
                              : 'border-border/80 bg-paper hover:border-brand-pink hover:shadow-xs'
                            }`}
                        >
                          {/* Thumbnail */}
                          <div
                            id={`pos-product-thumb-${p.id}`}
                            className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center"
                          >
                            {/* Quick detail preview button (always accessible without hover-only mystery) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductDetail(p);
                              }}
                              className="absolute top-1.5 left-1.5 z-10 size-6 rounded-md bg-white/90 hover:bg-white text-ink shadow-xs opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                              title="Xem chi tiết sản phẩm"
                              aria-label={`Xem chi tiết ${p.name}`}
                            >
                              <Eye className="size-3.5 text-brand-highlight" aria-hidden="true" />
                            </button>

                            {heldInOtherOrder && (
                              <span className="absolute top-1.5 right-1.5 z-10 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow-2xs">
                                {heldInOtherOrder.label}
                              </span>
                            )}

                            {showImage ? (
                              <img
                                src={p.coverImageUrl!}
                                alt={p.name}
                                className="size-full object-cover transition duration-300 group-hover:scale-105"
                                onError={() => {
                                  setBrokenImageIds((prev) => new Set(prev).add(`catalog-${p.id}`));
                                }}
                              />
                            ) : (
                              <Package className="size-8 text-muted/45" aria-hidden="true" />
                            )}

                            {/* Useful consignment condition/size indicator instead of redundant SL: 1 */}
                            {(p.conditionPercentage > 0 || p.size) && (
                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 pointer-events-none">
                                {p.conditionPercentage > 0 && (
                                  <span className="rounded bg-ink/75 px-1.5 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur-[1px]">
                                    Mới {p.conditionPercentage}%
                                  </span>
                                )}
                                {p.size && (
                                  <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold text-ink shadow-2xs">
                                    {p.size}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Info with fixed title height so price & action button align across every row */}
                          <div className="mt-2 flex-1 flex flex-col">
                            <div className="flex items-center gap-1 text-[10px] text-muted min-h-[14px]">
                              {p.brand?.name && (
                                <span className="font-semibold text-brand-highlight truncate max-w-[95px]">
                                  {p.brand.name}
                                </span>
                              )}
                              {p.size && (
                                <span className="truncate">
                                  {p.brand?.name ? '• ' : ''}Size {p.size}
                                </span>
                              )}
                            </div>

                            <h4
                              className="mt-0.5 text-xs font-bold text-ink line-clamp-2 leading-4 min-h-[2rem]"
                              title={p.name}
                            >
                              {p.name}
                            </h4>

                            <p className="mt-1 text-[13px] font-black text-brand-ink">
                              {formatVndCurrency(priceNum)}
                            </p>
                          </div>

                          {/* Action Button - Optimistic UI */}
                          <button
                            type="button"
                            disabled={isDisabledCard}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleSelectProductFromCatalog(p, `pos-product-thumb-${p.id}`);
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-bold transition-all shadow-2xs ${isAddedInCurrent
                              ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                              : heldInOtherOrder
                                ? 'bg-amber-100 text-amber-900 cursor-not-allowed'
                                : 'bg-surface hover:bg-brand-pink-light hover:text-brand-highlight text-ink cursor-pointer active:scale-95'
                              }`}
                          >
                            {isAddedInCurrent ? (
                              <>
                                <Check className="size-3.5" aria-hidden="true" />
                                <span>Đã trong giỏ</span>
                              </>
                            ) : heldInOtherOrder ? (
                              <>
                                <PauseCircle className="size-3.5" aria-hidden="true" />
                                <span>Giữ ở {heldInOtherOrder.label}</span>
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

                  {/* Pagination Load More when store has more than 24 products */}
                  {availableProducts.length < totalProductsCount && (
                    <div className="mt-3 flex justify-center pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={loadingMoreProducts}
                        loadingText="Đang tải thêm..."
                        onClick={() => void loadAvailableProducts(undefined, currentPage + 1, true)}
                      >
                        Xem thêm ({availableProducts.length}/{totalProductsCount} sản phẩm)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (5 cols): Harmonized Cart Card matching application cards */}
        <div className="lg:col-span-5 h-[520px] sm:h-[600px] lg:h-full min-h-0 flex flex-col overflow-hidden">
          <Card
            id="pos-cart-till"
            className="!p-3.5 sm:!p-4 flex flex-col h-full min-h-0 relative transition-all border-brand-lavender/40 overflow-hidden"
          >
            {/* Target anchor for flying animation */}
            <div
              id="pos-cart-target"
              className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-3 pointer-events-none"
              aria-hidden="true"
            />

            {/* Header: Title, Hold-Order Tabs, and Actions */}
            <div className="shrink-0 space-y-2 pb-2 border-b border-border/70">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    id="pos-cart-icon-target"
                    className="rounded-lg bg-brand-pink-light p-1.5 text-brand-highlight transition-transform shadow-2xs shrink-0"
                  >
                    <ShoppingCart className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                    {activeOrder.label} · {cart.length} món
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(cart.length > 0 || completedInvoice) && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0 ${
                        completedInvoice
                          ? 'text-brand-highlight bg-brand-pink-light/80 hover:bg-brand-highlight hover:text-white border border-brand-highlight/30'
                          : 'text-muted bg-surface hover:bg-brand-pink-surface hover:text-brand-highlight border border-border/80'
                      }`}
                      title={completedInvoice ? 'Xem và in hóa đơn bán lẻ' : 'Xem trước mẫu bill nháp'}
                    >
                      <Printer className="size-3.5" aria-hidden="true" />
                      <span>{completedInvoice ? 'Xuất HĐ' : 'Bill nháp'}</span>
                    </button>
                  )}

                  {cart.length > 0 && !completedInvoice && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 transition-all cursor-pointer shrink-0"
                      title="Xóa toàn bộ giỏ hàng"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span>Xóa tất cả</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hold Order Tabs (Park up to 4 concurrent orders) */}
              {!completedInvoice && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                  {ordersState.orders.map((order) => {
                    const isSelected = order.id === activeOrder.id;
                    return (
                      <div
                        key={order.id}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold transition-all shrink-0 ${
                          isSelected
                            ? 'border-brand-highlight bg-brand-pink-light/75 text-brand-ink shadow-2xs'
                            : 'border-border/70 bg-surface/70 text-muted hover:text-ink hover:bg-surface'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSwitchOrderTab(order.id)}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{order.label}</span>
                          {order.items.length > 0 && (
                            <span
                              className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold leading-tight ${
                                isSelected
                                  ? 'bg-brand-highlight text-white'
                                  : 'bg-border/70 text-ink'
                              }`}
                            >
                              {order.items.length}
                            </span>
                          )}
                        </button>
                        {ordersState.orders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleCloseOrderTab(order.id)}
                            className="ml-0.5 rounded p-0.5 text-muted hover:text-red-600 cursor-pointer"
                            title={`Đóng ${order.label}`}
                            aria-label={`Đóng ${order.label}`}
                          >
                            <X className="size-2.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {ordersState.orders.length < MAX_HELD_ORDERS && (
                    <button
                      type="button"
                      onClick={handleParkOrNewOrder}
                      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-brand-pink/80 bg-paper px-2 py-0.5 text-[11px] font-bold text-brand-highlight hover:bg-brand-pink-surface transition-all cursor-pointer shrink-0"
                      title="Giữ đơn hiện tại và mở đơn tạm mới (F4)"
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      <span>Giữ đơn</span>
                      <kbd className="hidden xl:inline text-[9px] font-mono opacity-75">F4</kbd>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List with Scroll Edge Shadows */}
            <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
              {cartScrollEdge.top && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-paper to-transparent"
                  aria-hidden="true"
                />
              )}

              <div
                ref={rollContainerRef}
                onScroll={syncCartScrollEdge}
                className="pos-cart-items-container flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 scroll-smooth py-1.5"
              >
                {cart.length === 0 ? (
                  <div className="h-full min-h-[120px] py-4 text-center flex flex-col items-center justify-center">
                    <div className="rounded-2xl bg-surface p-2.5 shadow-2xs mb-2 text-muted">
                      <ShoppingCart className="size-5" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-bold text-ink">Giỏ hàng đang trống</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Quét mã vạch hoặc chọn sản phẩm bên trái để bắt đầu.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const showCartImage = Boolean(item.imageUrl) && !brokenImageIds.has(`cart-${item.id}`);

                    return (
                      <div
                        key={item.id}
                        onDoubleClick={() => handleOpenProductDetail(item)}
                        title="Nhấn đúp để xem chi tiết sản phẩm"
                        className="flex items-center gap-2.5 rounded-xl bg-surface/45 px-2.5 py-2 border border-border/70 transition-all hover:border-brand-pink hover:bg-surface/80 group cursor-pointer select-none"
                      >
                        {/* Compact 48px Thumbnail */}
                        <div className="size-11 sm:size-12 rounded-lg overflow-hidden bg-surface border border-border/70 shrink-0 flex items-center justify-center">
                          {showCartImage ? (
                            <img
                              src={item.imageUrl!}
                              alt={item.name}
                              className="size-full object-cover transition-transform group-hover:scale-105"
                              onError={() => {
                                setBrokenImageIds((prev) => new Set(prev).add(`cart-${item.id}`));
                              }}
                            />
                          ) : (
                            <Package className="size-5 text-muted/55" aria-hidden="true" />
                          )}
                        </div>

                        {/* Compact 2-line Item Details */}
                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-xs font-bold text-ink truncate leading-snug"
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-muted font-medium truncate">
                            {item.size ? `Size ${item.size} · ` : ''}{item.barcode || item.id}
                          </p>
                        </div>

                        {/* Right-aligned Price & Quick Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs sm:text-[13px] font-black text-brand-ink whitespace-nowrap mr-0.5">
                            {formatVndCurrency(item.listedPrice)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProductDetail(item);
                            }}
                            className="p-1 text-muted hover:text-brand-highlight hover:bg-surface-subtle rounded transition-colors opacity-65 group-hover:opacity-100 cursor-pointer shrink-0"
                            title="Xem chi tiết món này"
                            aria-label={`Xem chi tiết ${item.name}`}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                          </button>

                          {!completedInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id);
                              }}
                              className="p-1 text-muted hover:text-danger hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Xóa món này khỏi giỏ hàng"
                              aria-label={`Xóa ${item.name}`}
                            >
                              <X className="size-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cartScrollEdge.bottom && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-paper to-transparent"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Bottom Summary & Checkout Section - Compact & Scannable */}
            <div className="shrink-0 space-y-2 pt-2 border-t border-border/70">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-ink">Tổng thanh toán</span>
                  <span className="ml-1.5 text-[11px] font-medium text-muted">
                    ({cart.length} món)
                  </span>
                </div>
                <span className="font-mono text-base sm:text-lg font-black text-brand-highlight">
                  {formatVndCurrency(totalAmount)}
                </span>
              </div>

              {/* Payment Section */}
              {completedInvoice ? (
                <div className="space-y-2 pt-0.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Printer className="size-4" aria-hidden="true" />}
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className="text-xs font-bold bg-paper text-ink border-border enabled:hover:bg-surface enabled:hover:border-border"
                    >
                      In bill (80mm)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      startIcon={<Printer className="size-4" aria-hidden="true" />}
                      onClick={() => setIsPreviewInvoiceOpen(true)}
                      className="text-xs font-bold bg-brand-pink-surface text-brand-highlight border-brand-pink/50 enabled:hover:bg-brand-highlight enabled:hover:text-white enabled:hover:border-brand-highlight transition-all duration-200 shadow-2xs enabled:hover:shadow-xs active:scale-95"
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
                    className="w-full text-xs font-black bg-brand-highlight text-white enabled:hover:bg-brand-highlight/90 shadow-sm"
                  >
                    Xé bill · Đơn mới
                  </Button>
                </div>
              ) : (
                <>
                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface border border-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                        setCheckoutError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentMethod === 'cash'
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
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${paymentMethod === 'vietqr'
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
                    <div className="rounded-xl border border-border/80 bg-surface/35 p-2 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label htmlFor="cash-given-input" className="text-[11.5px] font-bold text-ink">
                          Tiền khách đưa:
                        </label>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={handleSetExactCash}
                            disabled={cart.length === 0}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold bg-brand-pink-light text-brand-highlight hover:bg-brand-pink-light/80 border border-brand-pink/40 transition-all cursor-pointer disabled:opacity-50"
                            title="Điền đúng số tiền cần thanh toán (F2)"
                          >
                            <span>Đưa đủ</span>
                            <kbd className="hidden xl:inline text-[9px] font-mono opacity-70">F2</kbd>
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
                              className="text-[11px] font-medium text-muted hover:text-ink hover:underline ml-0.5 cursor-pointer"
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
                            value={cashGiven ? cashGiven.toLocaleString('vi-VN') : ''}
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
                            className="w-full rounded-xl border border-border bg-paper py-1.5 pl-3 pr-7 text-right text-base sm:text-lg font-black text-ink placeholder:text-muted/60 focus:border-brand-highlight focus:outline-none focus:ring-1 focus:ring-brand-highlight/30 shadow-2xs"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs font-bold text-muted">
                            ₫
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-1 shrink-0">
                            {[50_000, 100_000, 500_000].map((inc) => (
                              <button
                                key={inc}
                                type="button"
                                disabled={cart.length === 0}
                                onClick={() => {
                                  setCashGiven((prev) => Math.min(prev + inc, 1_000_000_000_000));
                                  setCheckoutError(null);
                                  setIsNetworkError(false);
                                }}
                                className="rounded border border-border/80 bg-paper px-1.5 py-0.5 text-[10px] font-bold text-ink hover:border-brand-pink hover:bg-brand-pink-surface hover:text-brand-highlight transition-colors cursor-pointer disabled:opacity-40"
                                title={`Cộng thêm ${formatVndCurrency(inc)}`}
                              >
                                +{inc / 1000}k
                              </button>
                            ))}
                          </div>
                          {cashGiven > 0 && (
                            <p className="text-[10.5px] text-muted italic truncate text-right" title={formatVndInWords(cashGiven)}>
                              <span className="font-semibold text-brand-ink">{formatVndInWords(cashGiven)}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Change calculation */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="text-xs font-bold text-ink">Tiền thừa trả khách:</span>
                        <span
                          className={`text-sm sm:text-base font-black font-mono ${isCashSufficient
                            ? 'text-brand-highlight'
                            : totalAmount > 0 && cashGiven > 0
                              ? 'text-amber-700'
                              : 'text-muted text-xs sm:text-sm font-semibold font-sans'
                            }`}
                        >
                          {isCashSufficient
                            ? formatVndCurrency(changeAmount)
                            : totalAmount > 0 && cashGiven > 0
                              ? `Thiếu ${formatVndCurrency(totalAmount - cashGiven)}`
                              : totalAmount > 0
                                ? 'Chưa nhập tiền'
                                : '0 ₫'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Checkout Error with Retry or Pending VietQR Helper Option */}
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

                      {!isNetworkError && paymentMethod === 'vietqr' && onSwitchToVietQr && (
                        <div className="flex justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={onSwitchToVietQr}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:underline cursor-pointer"
                          >
                            <span>Mở Chờ VietQR</span>
                            <ArrowRight className="size-3" aria-hidden="true" />
                          </button>
                        </div>
                      )}

                      {isNetworkError && (
                        <div className="flex justify-end pt-0.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={isCheckingOut}
                            loadingText="Đang kết nối lại..."
                            startIcon={<RefreshCw className="size-3" aria-hidden="true" />}
                            onClick={paymentMethod === 'vietqr' ? () => void handleCheckoutVietQr() : handleCheckoutCash}
                            className="text-xs font-bold border-red-300 bg-white text-red-800 enabled:hover:bg-red-50 enabled:hover:border-red-300 py-1"
                          >
                            Thử lại thanh toán
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checkout Action Button with high-contrast disabled state & contextual guidance */}
                  {paymentMethod === 'cash' ? (
                    <button
                      type="button"
                      disabled={cart.length === 0 || !isCashSufficient || isCheckingOut}
                      onClick={handleOpenConfirmModal}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#E84E7F] hover:bg-[#D83A6D] active:bg-[#C22D5E] text-white font-black shadow-sm flex items-center justify-center gap-2 transition-all disabled:bg-brand-pink-light disabled:text-brand-highlight disabled:border disabled:border-brand-pink/60 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                    >
                      <Printer className="size-4 shrink-0" aria-hidden="true" />
                      <span className="font-black uppercase tracking-wide text-xs sm:text-[13px] truncate">
                        {isCheckingOut
                          ? 'Đang xử lý thanh toán...'
                          : cart.length === 0
                            ? 'Chọn sản phẩm để thanh toán'
                            : !isCashSufficient
                              ? `Nhập thêm ${formatVndCurrency(totalAmount - cashGiven)} để thanh toán`
                              : 'Xác nhận thanh toán & xuất bill'}
                      </span>
                      {cart.length > 0 && isCashSufficient && !isCheckingOut && (
                        <kbd className="hidden xl:inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                          F9
                        </kbd>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={cart.length === 0 || isCheckingOut}
                      onClick={() => void handleCheckoutVietQr()}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-brand-ink hover:bg-brand-ink/90 active:bg-brand-ink text-white font-black shadow-sm flex items-center justify-center gap-2 transition-all disabled:bg-brand-pink-light disabled:text-brand-highlight disabled:border disabled:border-brand-pink/60 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                    >
                      <QrCode className="size-4 shrink-0" aria-hidden="true" />
                      <span className="font-black uppercase tracking-wide text-xs sm:text-[13px] truncate">
                        {isCheckingOut
                          ? 'Đang tạo mã VietQR...'
                          : cart.length === 0
                            ? 'Chọn sản phẩm để tạo VietQR'
                            : 'Tạo mã VietQR & thanh toán'}
                      </span>
                      {cart.length > 0 && !isCheckingOut && (
                        <kbd className="hidden xl:inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                          F9
                        </kbd>
                      )}
                    </button>
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

      {/* Direct Cart VietQR Payment Modal */}
      <VietQrPaymentModal
        open={isVietQrModalOpen}
        saleInvoiceId={vietQrSession?.saleInvoiceId ?? null}
        initialSession={vietQrSession}
        initialInvoiceNumber={vietQrSession?.invoiceNumber}
        initialAmount={vietQrSession?.amount ?? totalAmount}
        onClose={() => {
          setIsVietQrModalOpen(false);
          setVietQrSession(null);
          if (pendingVietQrReceiptRef.current) {
            setCompletedInvoice(pendingVietQrReceiptRef.current);
            pendingVietQrReceiptRef.current = null;
          }
        }}
        onSessionUpdate={(updated) => setVietQrSession(updated)}
        onPaymentSuccess={handleVietQrPaymentSuccess}
      />

      {/* Invoice Success & Print Modal */}
      <PosInvoiceSuccessModal
        open={Boolean(completedInvoice) || isPreviewInvoiceOpen}
        invoice={completedInvoice}
        cartItems={cart}
        cashGiven={cashGiven}
        paymentMethod={paymentMethod}
        cashierName={cashierDisplayName}
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
        className="max-w-[300px] overflow-hidden rounded-2xl [&>header]:hidden"
        contentClassName="!p-0"
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
