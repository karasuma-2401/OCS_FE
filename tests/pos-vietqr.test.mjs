import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// 1. Compile and wire posPayments.ts API adapter
const adapterSource = readFileSync(
  new URL('../src/api/posPayments.ts', import.meta.url),
  'utf8',
);
const compiledAdapter = ts.transpileModule(adapterSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const requests = [];
const apiClient = {
  get: async (path, config) => {
    requests.push({ method: 'GET', path, config });
    return { data: {} };
  },
  post: async (path, body) => {
    requests.push({ method: 'POST', path, body });
    return { data: {} };
  },
};

const adapterModule = { exports: {} };
new Function('require', 'module', 'exports', compiledAdapter)(
  (name) => {
    if (name === './client') return { apiClient };
    throw new Error(`Unexpected import: ${name}`);
  },
  adapterModule,
  adapterModule.exports,
);
const { posPaymentsApi } = adapterModule.exports;

// 2. Compile VietQrPaymentModal.tsx for helper and contract verification
const modalSource = readFileSync(
  new URL('../src/components/shop/pos/VietQrPaymentModal.tsx', import.meta.url),
  'utf8',
);
const compiledModal = ts.transpileModule(modalSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

const modalModule = { exports: {} };
new Function('require', 'module', 'exports', compiledModal)(
  (name) => {
    if (name === '@/api/posPayments') return { posPaymentsApi };
    if (name === '@/components/shared') {
      return {
        Modal: ({ children }) => React.createElement('div', null, children),
        Button: ({ children, ...props }) =>
          React.createElement('button', props, children),
        Badge: ({ children }) => React.createElement('span', null, children),
      };
    }
    if (name === 'lucide-react') {
      return new Proxy({}, { get: () => () => null });
    }
    return require(name);
  },
  modalModule,
  modalModule.exports,
);
const { formatVndCurrency, formatCountdown } = modalModule.exports;

test('posPaymentsApi.initiateVietQr sends saleInvoiceId and forceNew to POST /pos/payments/vietqr', async () => {
  requests.length = 0;
  await posPaymentsApi.initiateVietQr('invoice-uuid-1');
  await posPaymentsApi.initiateVietQr('invoice-uuid-1', true);

  assert.deepEqual(requests, [
    {
      method: 'POST',
      path: '/pos/payments/vietqr',
      body: { saleInvoiceId: 'invoice-uuid-1', forceNew: false },
    },
    {
      method: 'POST',
      path: '/pos/payments/vietqr',
      body: { saleInvoiceId: 'invoice-uuid-1', forceNew: true },
    },
  ]);
});

test('posPaymentsApi.getVietQrStatus and listPendingInvoices forward AbortSignal to GET endpoints', async () => {
  requests.length = 0;
  const controller = new AbortController();

  await posPaymentsApi.getVietQrStatus('tx-uuid-99', controller.signal);
  await posPaymentsApi.listPendingInvoices(controller.signal);
  await posPaymentsApi.simulateVietQrWebhook('tx-uuid-99');

  assert.deepEqual(requests, [
    {
      method: 'GET',
      path: '/pos/payments/vietqr/tx-uuid-99',
      config: { signal: controller.signal },
    },
    {
      method: 'GET',
      path: '/pos/payments/vietqr/pending-invoices',
      config: { signal: controller.signal },
    },
    {
      method: 'POST',
      path: '/pos/payments/vietqr/tx-uuid-99/simulate-webhook',
      body: undefined,
    },
  ]);
});

test('formatVndCurrency and formatCountdown format POS amounts and expiration timer accurately', () => {
  assert.match(formatVndCurrency(520000), /520\.000\s*₫/);
  assert.match(formatVndCurrency('185000.00'), /185\.000\s*₫/);
  assert.equal(formatVndCurrency(undefined), '0 ₫');

  assert.equal(formatCountdown(900), '15:00');
  assert.equal(formatCountdown(65), '01:05');
  assert.equal(formatCountdown(-10), '00:00');
});

test('VietQrPaymentModal enforces read-only status checking and prohibits manual transfer confirmation', () => {
  // Must display invoice amount, transfer content, and re-check / regenerate buttons
  assert.match(modalSource, /data-testid="vietqr-amount"/);
  assert.match(modalSource, /data-testid="vietqr-transfer-content"/);
  assert.match(modalSource, /Kiểm tra lại kết quả/);
  assert.match(modalSource, /Tạo lại mã QR mới/);
  assert.match(
    modalSource,
    /không thể tự bấm xác nhận đã nhận chuyển khoản/,
  );

  // Must not expose any manual confirmation endpoint or button
  assert.doesNotMatch(
    modalSource,
    /confirmPayment|markAsPaid|Xác nhận đã nhận tiền/i,
  );
});
