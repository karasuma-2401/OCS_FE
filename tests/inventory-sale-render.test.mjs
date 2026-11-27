import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const Wrap = ({ children }) => React.createElement('div', null, children);
const ui = {
  Badge: Wrap, DetailPanel: Wrap,
  Button: ({ children, disabled, 'aria-label': label, title }) => React.createElement('button', { disabled, 'aria-label': label, title }, children),
  Modal: ({ open, children }) => open ? React.createElement(Wrap, null, children) : null,
  Combobox: () => null, Input: () => null, ErrorState: () => null, SkeletonLoading: () => null,
};
function compile(path, mocks = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === '@/components/shared') return ui;
    if (name === '@/api/inventory') return { inventoryApi: {} };
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const helpers = compile('../src/components/shop/inventory/inventoryHelpers.ts');
const { InventoryDetailPanel } = compile('../src/components/shop/inventory/InventoryDetailPanel.tsx', {
  'react-router-dom': { useNavigate: () => () => {} },
  '@/api/products': { formatVndPrice: value => `${value} đ` },
  '@/auth/permissions': { screenPaths: {} },
  './InventoryImageLightbox': { InventoryImageLightbox: () => null },
  './inventoryHelpers': helpers,
});
const { InventoryEditModal } = compile('../src/components/shop/InventoryEditModal.tsx');
const product = {
  id: 'p1', barcode: 'KG-001', name: 'Áo', size: 'M', conditionPercentage: 90,
  brand: 'Brand', category: 'Áo', listedPrice: 150000, sourceType: 'Consignment',
  sourceReference: 'HD-001', status: 'PendingProcessing', approvalStatus: 'Pending', version: 'v1',
  location: { id: 's1', code: 'A1', name: 'Kệ A' },
};
function renderPanel(overrides = {}, canOffer = true, permissions = {}) {
  const item = { ...product, ...overrides };
  return renderToStaticMarkup(React.createElement(InventoryDetailPanel, {
    panelRef: { current: null }, selectedId: item.id,
    detail: { product: item, images: [], history: [], agreedListedPrice: 150000 },
    locations: [], canOffer, ...permissions,
  }));
}
test('pending inventory offers a direct sale action without manager review or manual evidence', () => {
  const html = renderPanel();
  assert.match(html, /<button>Đưa lên bán<\/button>/);
  assert.doesNotMatch(html, /Tiến trình lên kệ|\d\/\d bước/);
  assert.doesNotMatch(html, /Xét duyệt|Duyệt sản phẩm|Bằng chứng thỏa thuận|Gửi duyệt lại|Chờ duyệt/);
});
test('sale controls still require permission, location and an eligible product state', () => {
  assert.doesNotMatch(renderPanel({}, false), /Đưa lên bán/);
  assert.match(renderPanel({ location: null }), /<button disabled="">Đưa lên bán<\/button>/);
  for (const overrides of [{ approvalStatus: 'Rejected' }, { status: 'OnSale' }, { status: 'Sold' }]) {
    assert.doesNotMatch(renderPanel(overrides), /Đưa lên bán/);
  }
});
test('product editor also lets pending inventory go on sale without approval', () => {
  const html = renderToStaticMarkup(React.createElement(InventoryEditModal, {
    product, locations: [], canOffer: true,
  }));
  assert.match(html, /<button>Đưa lên bán<\/button>/);
  assert.doesNotMatch(html, /Chưa duyệt|Cần duyệt/);
});

test('compact quick actions retain full accessible names and the incident disclosure', () => {
  const html = renderPanel({ status: 'OnSale' }, true, { canCreate: true, canReportIncident: true });
  assert.match(html, /aria-label="Thao tác sản phẩm"/);
  assert.match(html, /aria-label="In barcode" title="In barcode">Barcode<\/button>/);
  assert.match(html, /aria-label="Báo cáo sự cố" title="Báo cáo sự cố">Sự cố<\/button>/);
  assert.match(html, /aria-label="Sửa chi tiết" title="Sửa chi tiết">Chỉnh sửa<\/button>/);
  assert.match(html, /<summary[^>]*aria-label="Thao tác khác"/);
  assert.match(html, /<button>Báo cáo sự cố<\/button>/);
});

test('quick actions keep incident and editing permissions when space is limited', () => {
  const readOnly = renderPanel({ status: 'OnSale' });
  assert.doesNotMatch(readOnly, /aria-label="Sửa chi tiết"|aria-label="Báo cáo sự cố"|Thao tác khác/);
  const pending = renderPanel({}, true, { canCreate: true, canReportIncident: true });
  assert.match(pending, /aria-label="Sửa chi tiết"/);
  assert.doesNotMatch(pending, /aria-label="Báo cáo sự cố"|Thao tác khác/);
  const sold = renderPanel({ status: 'Sold' }, true, { canCreate: true, canReportIncident: true });
  assert.doesNotMatch(sold, /aria-label="Sửa chi tiết"|aria-label="Báo cáo sự cố"|Thao tác khác/);
});
