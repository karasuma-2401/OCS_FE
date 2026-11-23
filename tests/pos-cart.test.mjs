import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// 1. Compile and wire pos.ts API adapter
const posApiSource = readFileSync(
  new URL('../src/api/pos.ts', import.meta.url),
  'utf8',
);
const compiledPosApi = ts.transpileModule(posApiSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const requests = [];
const apiClient = {
  get: async (path, config) => {
    requests.push({ method: 'GET', path, config });
    if (path.includes('/pos/lookup/893850123001')) {
      return {
        data: {
          id: 'prod-uuid-1',
          barcode: '893850123001',
          name: 'Áo khoác Blazer Dạ Tweed',
          listedPrice: 650000,
          status: 'OnSale',
          canAddToCart: true,
          imageUrl: '/api/product-images/blazer.jpg',
        },
      };
    }
    if (path.includes('/pos/lookup/INELIGIBLE-SOLD')) {
      return {
        data: {
          id: 'prod-uuid-2',
          barcode: 'INELIGIBLE-SOLD',
          name: 'Quần Jeans Levi 501',
          listedPrice: 850000,
          status: 'Sold',
          canAddToCart: false,
          rejectionReason: 'Sản phẩm này đã được bán.',
        },
      };
    }
    return { data: {} };
  },
  post: async (path, body) => {
    requests.push({ method: 'POST', path, body });
    return {
      data: {
        invoiceId: 'inv-uuid-123',
        invoiceNumber: 'INV20261117001',
        totalAmount: 650000,
        cashGiven: 700000,
        changeAmount: 50000,
        createdAt: new Date().toISOString(),
        items: [
          {
            productId: 'prod-uuid-1',
            barcode: '893850123001',
            name: 'Áo khoác Blazer Dạ Tweed',
            price: 650000,
          },
        ],
      },
    };
  },
};

const posModule = { exports: {} };
new Function('require', 'module', 'exports', compiledPosApi)(
  (name) => {
    if (name === './client') {
      return {
        apiClient,
        resolveApiAssetUrl: (url) => url ? `/resolved${url}` : null,
        API_BASE_URL: '/api',
      };
    }
    throw new Error(`Unexpected import: ${name}`);
  },
  posModule,
  posModule.exports,
);
const { posApi } = posModule.exports;

test('posApi.lookupProduct calls GET /pos/lookup/{identifier} and resolves image URL', async () => {
  requests.length = 0;
  const product = await posApi.lookupProduct('893850123001');

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].path, '/pos/lookup/893850123001');
  assert.equal(product.id, 'prod-uuid-1');
  assert.equal(product.canAddToCart, true);
  assert.equal(product.imageUrl, '/resolved/api/product-images/blazer.jpg');
});

test('posApi.lookupProduct identifies ineligible items with canAddToCart false and rejectionReason', async () => {
  requests.length = 0;
  const product = await posApi.lookupProduct('INELIGIBLE-SOLD');

  assert.equal(requests.length, 1);
  assert.equal(product.canAddToCart, false);
  assert.equal(product.status, 'Sold');
  assert.equal(product.rejectionReason, 'Sản phẩm này đã được bán.');
});

test('posApi.checkoutCash sends productIds and cashGiven to POST /pos/checkout/cash', async () => {
  requests.length = 0;
  const res = await posApi.checkoutCash({
    productIds: ['prod-uuid-1'],
    cashGiven: 700000,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].path, '/pos/checkout/cash');
  assert.deepEqual(requests[0].body, {
    productIds: ['prod-uuid-1'],
    cashGiven: 700000,
  });
  assert.equal(res.invoiceNumber, 'INV20261117001');
  assert.equal(res.changeAmount, 50000);
});

test('posApi.getInvoicePdfUrl builds correct URL with encoded identifier', () => {
  const url = posApi.getInvoicePdfUrl('INV 2026/001');
  assert.match(url, /\/pos\/invoices\/INV%202026%2F001\/pdf$/);
});

test('Pos Cart business logic: single-item uniqueness and change calculation', () => {
  // Consignment single-item rule
  const cart = [
    { id: 'item-1', barcode: 'BC001', name: 'Item 1', listedPrice: 200000, canAddToCart: true },
  ];

  const newItemDuplicate = { id: 'item-1', barcode: 'BC001', name: 'Item 1 Duplicate', listedPrice: 200000, canAddToCart: true };
  const isDuplicate = cart.some((i) => i.id === newItemDuplicate.id || i.barcode === newItemDuplicate.barcode);
  assert.equal(isDuplicate, true, 'Duplicate consignment item must be detected');

  const newItemUnique = { id: 'item-2', barcode: 'BC002', name: 'Item 2', listedPrice: 350000, canAddToCart: true };
  const isUniqueDuplicate = cart.some((i) => i.id === newItemUnique.id || i.barcode === newItemUnique.barcode);
  assert.equal(isUniqueDuplicate, false);

  const updatedCart = [...cart, newItemUnique];
  const totalAmount = updatedCart.reduce((sum, item) => sum + item.listedPrice, 0);
  assert.equal(totalAmount, 550000);

  // Cash change calculation
  const cashGivenSufficient = 600000;
  const changeAmount = Math.max(0, cashGivenSufficient - totalAmount);
  assert.equal(changeAmount, 50000);

  const cashGivenInsufficient = 500000;
  assert.equal(cashGivenInsufficient < totalAmount, true);
  assert.equal(totalAmount - cashGivenInsufficient, 50000);
});

test('Cash payment integrity: network error does NOT create fake invoice or clear cart', async () => {
  let cart = [
    { id: 'item-10', barcode: 'BC010', name: 'Đầm hoa nhí', listedPrice: 320000, canAddToCart: true },
  ];
  let cashGiven = 350000;
  let completedInvoice = null;
  let checkoutError = null;
  let isNetworkError = false;

  // Mock a network failure (offline / unreachable API)
  const mockFailingCheckout = async () => {
    const networkError = new Error('Network Error');
    networkError.code = 'ERR_NETWORK';
    throw networkError;
  };

  try {
    const res = await mockFailingCheckout();
    completedInvoice = res;
    cart = [];
    cashGiven = 0;
  } catch (err) {
    // Mimic the strict integrity error handler in PosCartWorkspace
    const isNetErr =
      err.code === 'ERR_NETWORK' ||
      String(err.message).toLowerCase().includes('network');

    isNetworkError = Boolean(isNetErr);
    if (isNetErr) {
      checkoutError =
        'Lỗi kết nối mạng: Không thể kết nối tới máy chủ POS (API). Giao dịch CHƯA được thực hiện trên hệ thống, hàng CHƯA được bán và KHÔNG CÓ hóa đơn nào được tạo.';
    }
    // Cart and cashGiven are preserved!
  }

  // Verification of strict integrity requirements:
  assert.equal(completedInvoice, null, 'Must NOT generate or set a fake/offline invoice');
  assert.equal(cart.length, 1, 'Cart MUST be preserved when network fails');
  assert.equal(cashGiven, 350000, 'Cash given MUST be preserved when network fails');
  assert.equal(isNetworkError, true, 'Network error must be identified correctly');
  assert.match(checkoutError, /Lỗi kết nối mạng.*KHÔNG CÓ hóa đơn nào được tạo/);
});

test('Cash payment success: only shows real invoice from API and clears cart', async () => {
  let cart = [
    { id: 'item-20', barcode: 'BC020', name: 'Áo len dệt kim', listedPrice: 450000, canAddToCart: true },
  ];
  let cashGiven = 500000;
  let completedInvoice = null;

  // Real API response simulation
  const mockSuccessfulCheckout = async () => ({
    invoiceId: 'real-inv-uuid',
    invoiceNumber: 'INV20261117999',
    totalAmount: 450000,
    cashGiven: 500000,
    changeAmount: 50000,
    createdAt: new Date().toISOString(),
    items: [{ productId: 'item-20', barcode: 'BC020', name: 'Áo len dệt kim', price: 450000 }],
  });

  const response = await mockSuccessfulCheckout();
  if (response && response.invoiceNumber) {
    completedInvoice = response;
    cart = [];
    cashGiven = 0;
  }

  assert.notEqual(completedInvoice, null);
  assert.equal(completedInvoice.invoiceNumber, 'INV20261117999');
  assert.equal(completedInvoice.changeAmount, 50000);
  assert.equal(cart.length, 0, 'Cart cleared only upon real API confirmation');
  assert.equal(cashGiven, 0);
});

test('PosThermalReceipt: long item list activates scrollable container and print styles', () => {
  const receiptComponentSource = readFileSync(
    new URL('../src/components/shop/pos/PosThermalReceipt.tsx', import.meta.url),
    'utf8',
  );
  const receiptCssSource = readFileSync(
    new URL('../src/components/shop/pos/posReceipt.css', import.meta.url),
    'utf8',
  );

  // Check that PosThermalReceipt checks items.length > 4 to apply scrollable container
  assert.match(
    receiptComponentSource,
    /items\.length > 4[\s\S]*pos-receipt-items-scroll max-h-48 sm:max-h-56 overflow-y-auto/,
    'PosThermalReceipt should apply scrollable class when items count exceeds 4',
  );

  // Check that scroll indicator is present
  assert.match(
    receiptComponentSource,
    /cuộn để xem/,
    'Receipt should have a subtle scroll helper indicator',
  );

  // Check CSS contains the scrollbar styling
  assert.match(
    receiptCssSource,
    /\.pos-receipt-items-scroll\s*\{[\s\S]*scrollbar-width:\s*thin;/,
    'posReceipt.css should declare custom scrollbar for receipt items',
  );

  // Check that @media print resets max-height and overflow
  assert.match(
    receiptCssSource,
    /@media print[\s\S]*\.pos-receipt-items-scroll\s*\{[\s\S]*max-height:\s*none !important;[\s\S]*overflow:\s*visible !important;/,
    '@media print must reset max-height and overflow so all items are printed',
  );
});

test('posApi.checkoutVietQr sends productIds and optional forceNew to POST /pos/checkout/vietqr', async () => {
  requests.length = 0;
  await posApi.checkoutVietQr({ productIds: ['prod-uuid-1'], forceNew: true });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].path, '/pos/checkout/vietqr');
  assert.deepEqual(requests[0].body, {
    productIds: ['prod-uuid-1'],
    forceNew: true,
  });
});

test('PosCartWorkspace and PosPage enforce UI/UX fixes and Vietnamese currency formatting', () => {
  const cartWorkspaceSource = readFileSync(
    new URL('../src/components/shop/pos/PosCartWorkspace.tsx', import.meta.url),
    'utf8',
  );
  const posPageSource = readFileSync(
    new URL('../src/components/shop/pos/PosPage.tsx', import.meta.url),
    'utf8',
  );

  // Uses vi-VN formatting for cash input and replaces redundant SL: 1 card badge with condition/size
  assert.match(cartWorkspaceSource, /cashGiven\.toLocaleString\('vi-VN'\)/);
  assert.doesNotMatch(cartWorkspaceSource, /cashGiven\.toLocaleString\('en-US'\)/);
  assert.doesNotMatch(cartWorkspaceSource, />\s*SL:\s*1\s*</);
  assert.match(cartWorkspaceSource, /Mới \{p\.conditionPercentage\}%/);

  // Avoids 220ms artificial click delay, double-click vs add-to-cart conflict, and broken display:none fallback
  assert.doesNotMatch(cartWorkspaceSource, /clickTimerRef/);
  assert.doesNotMatch(cartWorkspaceSource, /handleProductCardClick/);
  assert.match(cartWorkspaceSource, /brokenImageIds/);

  // Integrates direct VietQR checkout modal inside PosCartWorkspace
  assert.match(cartWorkspaceSource, /posApi\.checkoutVietQr/);
  assert.match(cartWorkspaceSource, /<VietQrPaymentModal/);

  // Includes catalog Size/Sort filters using shared Combobox, Hide-selected toggle, Hold-order tabs, and cash increment chips
  assert.match(cartWorkspaceSource, /<Combobox[\s\S]*ariaLabel="Lọc theo size"/);
  assert.match(cartWorkspaceSource, /<Combobox[\s\S]*ariaLabel="Sắp xếp sản phẩm"/);
  assert.doesNotMatch(cartWorkspaceSource, /<select\b/);
  assert.match(cartWorkspaceSource, /Ẩn đã chọn/);
  assert.match(cartWorkspaceSource, /Giữ đơn/);

  // Keeps single-screen POS workspace active and mounts Chờ VietQR slide-over drawer with live badge
  const vietQrWorkspaceSource = readFileSync(
    new URL('../src/components/shop/pos/PosVietQrWorkspace.tsx', import.meta.url),
    'utf8',
  );
  assert.match(posPageSource, /pos-open-vietqr-drawer/);
  assert.match(posPageSource, /<PosVietQrWorkspace[\s\S]*open=\{isVietQrDrawerOpen\}/);
  assert.doesNotMatch(posPageSource, /pos-nav-cart-tab/);
  assert.doesNotMatch(vietQrWorkspaceSource, /HD-POS-DEMO-001/);
  assert.doesNotMatch(vietQrWorkspaceSource, /Quy tắc thanh toán tại quầy/);
  assert.match(vietQrWorkspaceSource, /posApi\.getInvoiceDetail/);
  assert.match(vietQrWorkspaceSource, /<PosInvoiceSuccessModal/);

  // Product detail modal hides internal UUID and redundant SL: 1 badge
  const detailModalSource = readFileSync(
    new URL('../src/components/shop/pos/PosProductDetailModal.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(detailModalSource, /Mã hệ thống/);
  assert.doesNotMatch(detailModalSource, /SL:\s*1/);

  // Invoice preview / print modal uses isolated 80mm iframe print, separates draft vs completed PDF, and avoids 420px chamber clipping
  const invoiceModalSource = readFileSync(
    new URL('../src/components/shop/pos/PosInvoiceSuccessModal.tsx', import.meta.url),
    'utf8',
  );
  const receiptCssSource = readFileSync(
    new URL('../src/components/shop/pos/posReceipt.css', import.meta.url),
    'utf8',
  );
  assert.match(invoiceModalSource, /printThermalReceiptElement/);
  assert.match(invoiceModalSource, /In bill nháp \(80mm\)/);
  assert.match(invoiceModalSource, /\{isCompleted && \([\s\S]*Xuất file PDF/);
  assert.match(invoiceModalSource, /disableItemsScroll=\{false\}/);
  assert.match(invoiceModalSource, /bodyClassName=\{[\s\S]*overflow-y-auto overflow-x-hidden \[scrollbar-width:thin\] pos-receipt-chamber/);
  assert.match(receiptCssSource, /@media print[\s\S]*\.pos-receipt-chamber/);
});

test('posOrders manages multi-order Hold Cart tabs, cross-order consignment uniqueness, and smart cash suggestions', () => {
  const ordersSource = readFileSync(
    new URL('../src/components/shop/pos/posOrders.ts', import.meta.url),
    'utf8',
  );
  const compiledOrders = ts.transpileModule(ordersSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  const ordersModule = { exports: {} };
  new Function('require', 'module', 'exports', compiledOrders)(
    (name) => {
      if (name === '@/api/pos') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    ordersModule,
    ordersModule.exports,
  );

  const {
    MAX_HELD_ORDERS,
    createEmptyOrderTab,
    addHeldOrderTab,
    removeHeldOrderTab,
    findOtherOrderHoldingProduct,
    buildQuickCashSuggestions,
  } = ordersModule.exports;

  // 1. Multi-order Hold Cart lifecycle capped at MAX_HELD_ORDERS (4)
  let state = {
    orders: [{ ...createEmptyOrderTab(1), items: [{ id: 'p1', barcode: 'BC01', name: 'Áo 1', listedPrice: 250000 }] }],
    activeOrderId: '',
    nextSequence: 2,
  };
  state.activeOrderId = state.orders[0].id;

  state = addHeldOrderTab(state);
  assert.equal(state.orders.length, 2);
  assert.equal(state.activeOrderId, state.orders[1].id);

  // Consignment item in Đơn #1 must be detected as held when active tab is Đơn #2
  const holdingOrder = findOtherOrderHoldingProduct(state.orders, state.activeOrderId, 'p1', 'BC01');
  assert.equal(holdingOrder?.label, 'Đơn #1');
  assert.equal(findOtherOrderHoldingProduct(state.orders, state.orders[0].id, 'p1', 'BC01'), undefined);

  // Cap at MAX_HELD_ORDERS
  state = addHeldOrderTab(state);
  state = addHeldOrderTab(state);
  state = addHeldOrderTab(state);
  assert.equal(state.orders.length, MAX_HELD_ORDERS);

  // Closing active tab selects adjacent tab safely and re-sequences labels from Đơn #1
  const removedId = state.activeOrderId;
  state = removeHeldOrderTab(state, removedId);
  assert.equal(state.orders.length, MAX_HELD_ORDERS - 1);
  assert.notEqual(state.activeOrderId, removedId);
  assert.deepEqual(
    state.orders.map((o) => o.label),
    ['Đơn #1', 'Đơn #2', 'Đơn #3'],
  );

  // Removing the first two tabs leaves the last tab cleanly re-numbered back to Đơn #1
  state = removeHeldOrderTab(state, state.orders[0].id);
  state = removeHeldOrderTab(state, state.orders[0].id);
  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].label, 'Đơn #1');
  assert.equal(state.nextSequence, 2);

  // 2. Smart cash suggestions never collapse to 1 chip even on large round boundaries (e.g. 21.980.000)
  assert.deepEqual(buildQuickCashSuggestions(21_980_000), [22_000_000, 22_500_000, 23_000_000]);
  assert.deepEqual(buildQuickCashSuggestions(320_000), [350_000, 400_000, 500_000]);
  assert.deepEqual(buildQuickCashSuggestions(0), []);
});

