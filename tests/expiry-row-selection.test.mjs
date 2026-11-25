import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
test('expiry row selection keeps the accent and opens a popup only through Details', () => {
  const row = { id: 'case-1', contractNumber: 'KG-001', products: [], endsAt: '2026-11-24T00:00:00Z' };
  const slots = [[row]];
  let cursor = 0;
  let table;
  let modal;
  let detailAction;
  const wrap = ({ children }) => React.createElement('div', null, children);
  const shared = new Proxy({}, { get: (_, key) => key === 'Table' ? props => { table = props; return null; }
    : key === 'TableDetailButton' ? props => { detailAction = props.onClick; return null; } : wrap });
  const source = readFileSync(new URL('../src/pages/ExpiryProcessingPage.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return { ...React, useEffect: () => {}, useState: initial => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial === true ? false : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    } };
    if (name === '@/components/shared') return shared;
    if (name === '@/components/shop/ShopSummaryStrip') return { ShopSummaryStrip: () => null };
    if (name === '@/components/shop/ListFilterChips') return { ListFilterChips: () => null };
    if (name === '@/components/shop/ExpiryDetailsModal') return { ExpiryDetailsModal: props => { modal = props; return null; }, expiryDate: x => x, expiryLabel: () => '', ExpiryTypeBadge: () => null };
    if (name === '@/api/expiry') return {};
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    return require(name);
  }, module, module.exports);
  const render = () => { cursor = 0; modal = null; renderToStaticMarkup(React.createElement(module.exports.ExpiryProcessingPage)); };
  render();
  assert.equal(modal, null);
  table.onRowClick(row);
  render();
  assert.equal(table.selectedRowKey, row.id);
  assert.equal(table.selectionAppearance, 'accent');
  assert.equal(modal, null);
  renderToStaticMarkup(table.columns.find(c => c.key === 'action').render(row));
  detailAction();
  render();
  assert.equal(modal.item.id, row.id);
  modal.onClose();
  render();
  assert.equal(modal, null);
  assert.equal(table.selectedRowKey, row.id);
});
