import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../src/components/shop/inventory/inventoryHelpers.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => {
    if (name === '@/components/shared') return {};
    throw new Error(`Unexpected import: ${name}`);
  },
  moduleObject,
  moduleObject.exports,
);

const { statusBadgeVariant, statusLabel, parseDetailsDiff } = moduleObject.exports;

const checkboxSource = readFileSync(
  new URL('../src/components/shop/inventory/InventoryCheckbox.tsx', import.meta.url),
  'utf8',
);
const checkboxCompiled = ts.transpileModule(checkboxSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const checkboxModule = { exports: {} };
const icons = new Proxy({}, { get: () => props => React.createElement('svg', { 'aria-hidden': props['aria-hidden'], className: props.className }) });
new Function('require', 'module', 'exports', checkboxCompiled)(
  (name) => {
    if (name === 'lucide-react') return icons;
    return require(name);
  },
  checkboxModule,
  checkboxModule.exports,
);
const { InventoryCheckbox } = checkboxModule.exports;

test('statusBadgeVariant assigns distinct semantic colors to inventory states', () => {
  assert.equal(statusBadgeVariant('OnSale'), 'success');
  assert.equal(statusBadgeVariant('Approved'), 'success');
  assert.equal(statusBadgeVariant('Sold'), 'payment');
  assert.equal(statusBadgeVariant('Pending'), 'warning');
  assert.equal(statusBadgeVariant('PendingProcessing'), 'warning');
  assert.equal(statusBadgeVariant('Expired'), 'danger');
  assert.equal(statusBadgeVariant('Cancelled'), 'danger');
  assert.equal(statusBadgeVariant('Donated'), 'info');
  assert.equal(statusBadgeVariant('Returned'), 'neutral');
  assert.equal(statusLabel('Expired'), 'Hết hạn');
});

test('parseDetailsDiff extracts readable field diffs from audit snapshots', () => {
  const prev = JSON.stringify({ Name: 'Áo cũ', Size: 'M', ConditionPercentage: 80, Description: 'A' });
  const next = JSON.stringify({ Name: 'Áo mới', Size: 'L', ConditionPercentage: 90, Description: 'B' });
  const diffs = parseDetailsDiff(prev, next);
  assert.deepEqual(diffs, [
    'Tên: "Áo cũ" → "Áo mới"',
    'Size: M → L',
    'Tình trạng: 80% → 90%',
    'Mô tả sản phẩm đã được cập nhật',
  ]);
  assert.deepEqual(parseDetailsDiff('invalid-json', next), []);
});

test('InventoryCheckbox exposes accessible checked, mixed, and disabled states', () => {
  const checkedHtml = renderToStaticMarkup(
    React.createElement(InventoryCheckbox, {
      checked: true,
      onChange() {},
      ariaLabel: 'Chọn áo sơ mi',
    }),
  );
  assert.match(checkedHtml, /aria-label="Chọn áo sơ mi"/);
  assert.match(checkedHtml, /aria-checked="true"/);
  assert.match(checkedHtml, /animate-inv-pop/);

  const mixedHtml = renderToStaticMarkup(
    React.createElement(InventoryCheckbox, {
      checked: false,
      indeterminate: true,
      disabled: true,
      onChange() {},
      ariaLabel: 'Chọn tất cả',
    }),
  );
  assert.match(mixedHtml, /aria-checked="mixed"/);
  assert.match(mixedHtml, /disabled=""/);
});
