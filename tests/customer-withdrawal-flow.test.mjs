import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}
function hooks() {
  const slots = []; const effects = []; let cursor = 0;
  return {
    begin: () => { cursor = 0; },
    flush: async () => { for (const effect of effects.splice(0)) effect(); for (let i = 0; i < 8; i++) await Promise.resolve(); },
    react: { ...React,
      useState: initial => { const key = cursor++; if (!(key in slots)) slots[key] = typeof initial === 'function' ? initial() : initial; return [slots[key], next => { slots[key] = typeof next === 'function' ? next(slots[key]) : next; }]; },
      useRef: initial => { const key = cursor++; return slots[key] ??= { current: initial }; },
      useMemo: callback => callback(),
      useEffect: (effect, deps) => { const key = cursor++; const previous = slots[key]; if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) { previous?.cleanup?.(); const state = { deps }; slots[key] = state; effects.push(() => { state.cleanup = effect(); }); } },
    },
  };
}
const wrap = ({ children }) => React.createElement('div', null, children);
const icons = new Proxy({}, { get: () => () => null });
function shared(capture) {
  return new Proxy({}, { get: (_, key) => {
    if (key === 'Button') return props => { capture.buttons.push(props); return React.createElement('button', { role: props.role, id: props.id, disabled: props.disabled, 'aria-selected': props['aria-selected'] }, props.children); };
    if (key === 'Input') return () => null;
    if (key === 'Table') return props => { capture.table = props; return React.createElement('div', null, props.data.map(row => React.createElement('div', { key: row.productId ?? row.id }, props.columns.map(column => React.createElement('span', { key: column.key }, column.render?.(row)))))); };
    if (key === 'TableDetailButton') return props => { capture.productDetails = props.onClick; return null; };
    if (key === 'AlertBanner') return props => React.createElement('div', null, props.title, props.message);
    return wrap;
  } });
}
const eligible = { productId: 'p1', contractId: 'c1', contractNumber: 'KG-01', name: 'Áo', barcode: 'BC-01', listedPrice: 100000, penaltyRate: 20, penaltyAmount: 20000, endsAt: '2027-01-01' };

test('customer tabs preselect the linked product, preserve selection and show tracking after creation', async () => {
  const state = hooks(); const capture = { buttons: [] }; let params = new URLSearchParams('tab=withdraw&contractId=c1&productId=p1'); let create; let detail; let history = false;
  const windowBefore = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  try {
    const page = load('../src/pages/EarlyWithdrawalsPage.tsx', {
      react: state.react, 'lucide-react': icons,
      'react-router-dom': { Link: wrap, useSearchParams: () => [params, next => { params = typeof next === 'function' ? next(params) : new URLSearchParams(next); }] },
      '@/api/earlyWithdrawals': { earlyWithdrawalsApi: { eligible: async () => [eligible], detail: async () => ({ id: 'request-1' }) } },
      '@/components/shared': shared(capture),
      '@/components/shop/ListFilterChips': { ListFilterChips: () => null },
      '@/components/shared/WithdrawalRequestsTable': { WithdrawalRequestsTable: () => { history = true; return React.createElement('div', null, 'request-history'); } },
      '@/components/shared/WithdrawalDetailsModal': { WithdrawalDetailsModal: props => { detail = props; return null; } },
      '@/components/customer/CreateWithdrawalModal': { CreateWithdrawalModal: props => { create = props; return null; } },
      '@/utils/earlyWithdrawals': load('../src/utils/earlyWithdrawals.ts', {}),
    }).CustomerEarlyWithdrawalsPage;
    const render = () => { state.begin(); capture.buttons = []; history = false; return renderToStaticMarkup(React.createElement(page)); };
    for (let i = 0; i < 4; i++) { render(); await state.flush(); }
    let html = render();
    assert.match(html, /20\.000/); assert.match(html, /checked/);
    assert.equal(history, false); assert.equal(capture.table.data[0].productId, 'p1');
    capture.buttons.find(b => b.id === 'withdrawal-tab-requests').onClick(); render();
    assert.equal(history, true);
    capture.buttons.find(b => b.id === 'withdrawal-tab-withdraw').onClick();
    render(); await state.flush(); html = render();
    assert.match(html, /checked/);
    capture.buttons.find(b => b.children === 'Tiếp tục gửi yêu cầu').onClick(); render();
    assert.deepEqual(create.items.map(p => p.productId), ['p1']);
    create.onCreated({ id: 'request-1' }); html = render();
    assert.equal(params.get('tab'), 'requests'); assert.equal(params.has('productId'), false);
    assert.equal(history, true); assert.equal(detail.item.id, 'request-1');
    assert.doesNotMatch(html, /Chọn món muốn rút/);
  } finally { globalThis.window = windowBefore; }
});

test('product detail navigates to the matching withdrawal product and exposes its fee and progress', async () => {
  const state = hooks(); const capture = { buttons: [] }; const routes = [];
  const product = { id: 'p1', name: 'Áo', barcode: 'BC-01', status: 'OnSale', listedPrice: 100000, agreedCommissionRate: 20, estimatedPayout: 80000, imageUrls: [], canWithdrawEarly: true, earlyWithdrawalFee: 20000 };
  const status = load('../src/components/customer/ConsignmentProductStatus.tsx', { '@/components/shared': { Badge: wrap } });
  const modal = load('../src/components/customer/ConsignmentDetailsModal.tsx', {
    react: state.react, 'lucide-react': icons, 'react-router-dom': { useNavigate: () => route => routes.push(route) },
    '@/api/consignments': { getConsignmentProductDetail: async () => product, getConsignmentProductImage: async () => new Blob() },
    '@/components/shared': shared(capture), '@/components/customer/ConsignmentProductStatus': status,
    '@/components/customer/ProductImageGallery': { ProductImageGallery: () => null },
  }).ConsignmentDetailsModal;
  const item = { contractId: 'c1', contractNumber: 'KG-01', status: 'Active', signedAt: '2026-11-01', endsAt: '2027-01-01', products: [product], estimatedPayout: 80000, settledAmount: 0 };
  let closed = false;
  const render = () => { state.begin(); capture.buttons = []; return renderToStaticMarkup(React.createElement(modal, { item, onClose: () => { closed = true; } })); };
  render(); capture.productDetails();
  for (let i = 0; i < 3; i++) { render(); await state.flush(); }
  let html = render(); assert.match(html, /20\.000/);
  capture.buttons.find(b => b.children === 'Rút hàng sớm').onClick();
  const route = new URL(routes[0], 'http://localhost');
  assert.equal(route.pathname, '/my-withdrawals'); assert.equal(route.searchParams.get('productId'), 'p1'); assert.equal(route.searchParams.get('contractId'), 'c1'); assert.equal(closed, true);
  product.canWithdrawEarly = false; product.withdrawal = { id: 'r1', status: 'Approved', paymentStatus: 'Paid' };
  html = render(); assert.match(html, /đã thu phí, chờ bàn giao/);
  assert.equal(capture.buttons.some(b => b.children === 'Rút hàng sớm'), false);
  capture.buttons.find(b => b.children === 'Theo dõi yêu cầu').onClick();
  assert.equal(new URL(routes[1], 'http://localhost').searchParams.get('requestId'), 'r1');
});

test('tracking status displays rejection reasons and every product lifecycle state', () => {
  const status = load('../src/components/customer/ConsignmentProductStatus.tsx', { '@/components/shared': { Badge: wrap } });
  for (const value of ['PendingProcessing', 'OnSale', 'Sold', 'Expired', 'Donated', 'Returned', 'EarlyWithdrawn', 'Compensated', 'Cancelled']) {
    assert.ok(status.consignmentProductStatuses[value]);
  }
  const html = renderToStaticMarkup(React.createElement(status.ConsignmentProductStatus, { product: { status: 'OnSale', withdrawal: { status: 'Rejected', decisionNote: 'Cần đối chiếu người nhận' } } }));
  assert.match(html, /Đang bán/); assert.match(html, /bị từ chối/); assert.match(html, /Cần đối chiếu người nhận/);
});
