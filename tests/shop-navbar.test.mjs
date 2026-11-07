import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const permissions = { screenPaths: {
  pos: '/shop/pos', inventory: '/shop/inventory', consignment: '/shop/consignment',
  customers: '/shop/customers', settlement: '/shop/settlement', reports: '/shop/reports',
  settings: '/shop/settings', accounts: '/admin/accounts',
} };
const source = readFileSync(new URL('../src/components/layout/shop/ShopNavBar.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
const localRequire = name => {
  if (name === '@/auth/permissions') return permissions;
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  return require(name);
};
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const ShopNavBar = module.exports.default;

test('shop navigation shows only allowed screens and marks the current page', () => {
  const html = renderToStaticMarkup(React.createElement(ShopNavBar, {
    activeItem: 'inventory', showAccounts: true, allowedItems: ['inventory', 'accounts'], profileName: 'Manager',
  }));
  assert.match(html, /href="\/shop\/inventory"[^>]*aria-current="page"/);
  assert.match(html, /href="\/admin\/accounts"/);
  assert.doesNotMatch(html, /href="\/shop\/pos"|Tiếp Nhận Ký Gửi/);
  assert.doesNotMatch(html, /OCS Vintage|mascot-logo/);
});

test('disabled shop navigation is not an actionable link', () => {
  const html = renderToStaticMarkup(React.createElement(ShopNavBar, { allowedItems: ['inventory'], disabledItems: ['inventory'] }));
  assert.match(html, /aria-disabled="true"/);
  assert.doesNotMatch(html, /href="\/shop\/inventory"/);
});
