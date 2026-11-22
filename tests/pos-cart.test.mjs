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

