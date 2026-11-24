import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function compile(path, deps) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => deps[name] ?? require(name), module, module.exports);
  return module.exports;
}
const helpers = compile('../src/utils/earlyWithdrawals.ts', {});
const Wrap = ({ children }) => React.createElement('div', null, children);
const ui = {
  AlertBanner: ({ title, message }) => React.createElement('aside', null, title, message),
  Badge: Wrap, Button: ({ children }) => React.createElement('button', null, children),
  Modal: ({ title, children, footer }) => React.createElement('section', null, title, children, footer),
  Table: ({ columns, data }) => React.createElement('table', null, React.createElement('tbody', null, data.map((row, i) => React.createElement('tr', { key: i }, columns.map(col => React.createElement('td', { key: col.key }, col.render(row))))))),
};
const base = {
  id: 'request-1', customerId: 'customer-1', status: 'Pending', reason: 'Lấy lại áo', totalPenaltyAmount: 25000,
  paymentStatus: 'Unpaid', requestedAt: '2026-11-24T10:00:00Z', approvedAt: null, paidAt: null, handedOverAt: null,
  items: [{ productId: 'p1', name: 'Áo sơ mi', contractNumber: 'KG-001', listedPrice: 250000, penaltyRate: 10, penaltyAmount: 25000 }],
};
function render(item, customer, permissions = []) {
  const component = compile('../src/components/shared/WithdrawalDetailsModal.tsx', {
    react: { ...React, useState: value => [value === true ? false : value, () => {}], useEffect: () => {} },
    '@/api/earlyWithdrawals': { earlyWithdrawalsApi: {} },
    '@/context/AuthContext': { useAuth: () => ({ hasPermission: p => permissions.includes(p) }) },
    '@/utils/earlyWithdrawals': helpers,
    '@/components/shared': ui,
    './WithdrawalStatusBadge': { WithdrawalStatusBadge: ({ status }) => React.createElement('span', null, helpers.withdrawalLabels[status]) },
  }).WithdrawalDetailsModal;
  return renderToStaticMarkup(React.createElement(component, { item, customer, onClose() {}, onUpdated() {} }));
}

test('customer sees full rejection reason, safely escaped, in request details', () => {
  const html = render({ ...base, status: 'Rejected', decisionNote: 'Hàng đã bán. <script>alert(1)</script>' }, true);
  assert.match(html, /Lý do từ chối/);
  assert.match(html, /Hàng đã bán\. &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>|<button>(?:Duyệt yêu cầu|Xác nhận đã thu đủ phí)<\/button>/);
});
test('staff actions require their individual permissions and payment precedes handover', () => {
  assert.doesNotMatch(render(base, false, ['withdrawals.read']), /<button>(?:Duyệt yêu cầu|Từ chối yêu cầu|Xác nhận đã thu đủ phí)<\/button>/);
  const approved = { ...base, status: 'Approved', approvedAt: base.requestedAt };
  const before = render(approved, false, ['withdrawals.payment', 'withdrawals.handover']);
  assert.match(before, /Xác nhận đã thu đủ phí/);
  assert.doesNotMatch(before, /Xác nhận đã bàn giao/);
  const after = render({ ...approved, paymentStatus: 'Paid', paidAt: base.requestedAt }, false, ['withdrawals.payment', 'withdrawals.handover']);
  assert.match(after, /Xác nhận đã bàn giao/);
  assert.doesNotMatch(after, /Xác nhận đã thu đủ phí/);
});
test('customer can cancel pending requests but has no staff processing actions', () => {
  const html = render(base, true, ['withdrawals.approve', 'withdrawals.payment']);
  assert.match(html, /Hủy yêu cầu/);
  assert.doesNotMatch(html, /<button>(?:Duyệt yêu cầu|Từ chối yêu cầu|Xác nhận đã thu đủ phí)<\/button>/);
});
