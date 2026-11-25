import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shop/BuyoutManagement.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let roles = [];
let permissions = [];
let query = '';
let navigatedTo = '';
let createAction;
const wrapper = ({ children }) => React.createElement('div', null, children);
const shared = new Proxy({}, { get: (_, name) => name === 'PageHeaderCard' ? ({ title, actions }) => React.createElement('div', null, title, actions) : name === 'Button' ? props => { if (props.children === 'Lập phiếu') createAction = props.onClick; return wrapper(props); } : wrapper });
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => {
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: { roles }, hasPermission: permission => permissions.includes(permission) }) };
  if (name === '@/components/shared') return shared;
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name === 'react-router-dom') return { Link: wrapper, useNavigate: () => path => { navigatedTo = path; }, useSearchParams: () => [new URLSearchParams(query), () => {}] };
  if (name === './buyout/BuyoutCreateForm') return { BuyoutCreateForm: wrapper };
  if (name === './buyout/BuyoutApprovalConfigModal') return { BuyoutApprovalConfigModal: () => null };
  if (name === './ShopSummaryStrip') return { ShopSummaryStrip: () => null };
  if (name === './ListFilterChips') return { ListFilterChips: () => null };
  if (name.startsWith('@/api/')) return {};
  return require(name);
}, moduleObject, moduleObject.exports);

test('buyout review controls require both an eligible role and approval permission', () => {
  roles = ['Manager']; permissions = ['products.read', 'products.create', 'products.approve'];
  let html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.match(html, /Chờ duyệt/);
  assert.match(html, /Lập phiếu/);
  assert.match(html, /Cấu hình tự duyệt/);
  roles = ['Staff'];
  html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.doesNotMatch(html, /aria-pressed="false"[^>]*>Chờ duyệt/);
  assert.match(html, /Lập phiếu/);
  assert.doesNotMatch(html, /Cấu hình tự duyệt/);
  roles = ['Manager']; permissions = ['products.read'];
  html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.doesNotMatch(html, /aria-pressed="false"[^>]*>Chờ duyệt/);
  assert.doesNotMatch(html, /Lập phiếu/);
  assert.doesNotMatch(html, /Cấu hình tự duyệt/);
});

test('buyout creation opens direct reception in buyout mode and a linked receipt opens history', () => {
  roles = ['Staff']; permissions = ['products.read', 'products.create'];
  renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  createAction();
  assert.equal(navigatedTo, '/shop/reception/new?direct=1&type=buyout&from=buyouts');
  roles = ['Manager']; permissions.push('products.approve');
  query = 'view=history&buyoutId=example-id';
  const html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.match(html, /aria-pressed="true"[^>]*>Lịch sử thu mua/);
  query = '';
});
