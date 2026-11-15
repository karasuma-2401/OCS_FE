import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shop/reception/ReceptionPrintModal.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const module = { exports: {} };
const icons = new Proxy({}, { get: () => () => React.createElement('svg') });
new Function('require', 'module', 'exports', compiled)(name => name === 'lucide-react' ? icons : require(name), module, module.exports);
const { ReceptionPrintModal } = module.exports;

const contract = {
  contractId: 'id', contractNumber: 'HD-01', signedAt: '2026-01-01T00:00:00Z', endsAt: '2026-02-01T00:00:00Z',
  customerName: 'Khách', customerPhone: '0901234567', expiryHandling: 'Return', totalReceivedItems: 1,
  totalApprovedItems: 1, totalRejectedItems: 0, totalEstimatedValue: 100000, totalCustomerPayout: 80000,
  createdProducts: [{ id: 'item', name: 'Áo', barcode: 'OCS-01', listedPrice: 100000, commissionRate: 20, customerPayout: 80000 }],
};
const items = [{ id: 'item', name: 'Áo', size: 'M', brand: 'Nhãn đã chốt', material: 'Linen', category: 'Áo', condition: '90%', listedPrice: 100000, customerPayout: 80000, images: ['https://example.test/ao.png'] }];

test('signed web contract retains product details, notes, photos and signature', () => {
  const html = renderToStaticMarkup(React.createElement(ReceptionPrintModal, { open: true, onClose() {}, contract, items, terms: 'Điều khoản đã ký', note: 'Ghi chú đã ký', signature: { contentType: 'image/png', data: 'AAAA' } }));
  for (const value of ['Nhãn đã chốt', 'Linen', '90%', 'Điều khoản đã ký', 'Ghi chú đã ký', 'https://example.test/ao.png', 'data:image/png;base64,AAAA']) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /95% Like New/);
});

test('incomplete historical contract is marked as reference and cannot be printed as signed', () => {
  const html = renderToStaticMarkup(React.createElement(ReceptionPrintModal, { open: true, onClose() {}, contract, items, referenceNotice: 'Thiếu chữ ký gốc' }));
  assert.match(html, /BẢN THAM KHẢO/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>.*?In [/] lưu PDF/);
});
