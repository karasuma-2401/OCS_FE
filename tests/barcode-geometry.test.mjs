import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/shop/barcodeGeometry.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
const jsBarcodeStub = () => {};
new Function('require', 'module', 'exports', compiled)(
  name => (name === 'jsbarcode' ? jsBarcodeStub : {}),
  moduleObject,
  moduleObject.exports,
);

const {
  clampBarcodeCopies,
  estimateA4BarcodeLayout,
  expandBarcodeItems,
  chunkBarcodePages,
} = moduleObject.exports;

test('clampBarcodeCopies clamps invalid, low, and oversized counts cleanly', () => {
  assert.equal(clampBarcodeCopies(0), 1);
  assert.equal(clampBarcodeCopies(-4), 1);
  assert.equal(clampBarcodeCopies(Number.NaN), 1);
  assert.equal(clampBarcodeCopies(3.8), 3);
  assert.equal(clampBarcodeCopies(99), 50);
});

test('estimateA4BarcodeLayout calculates rows, per-page capacity, and total A4 pages', () => {
  // Printable height = 297 - 16 = 281mm, gap = 3mm; 35mm height fits 7 rows => 7 * 3 = 21 labels/page
  const standard = estimateA4BarcodeLayout(22, { heightMm: 35, columns: 3 });
  assert.deepEqual(standard, { rowsPerPage: 7, labelsPerPage: 21, estimatedPages: 2 });

  // Empty list => 0 pages
  const empty = estimateA4BarcodeLayout(0, { heightMm: 40, columns: 2 });
  assert.deepEqual(empty, { rowsPerPage: 6, labelsPerPage: 12, estimatedPages: 0 });
});

test('expandBarcodeItems and chunkBarcodePages expand per-item copies and paginate by labelsPerPage', () => {
  const items = [
    { id: 'a', copies: 1 },
    { id: 'b', copies: 2 },
  ];
  const expanded = expandBarcodeItems(items, { a: 3 });
  assert.deepEqual(expanded.map(item => item.id), ['a', 'a', 'a', 'b', 'b']);

  const pages = chunkBarcodePages(expanded, 2);
  assert.equal(pages.length, 3);
  assert.deepEqual(pages.map(page => page.length), [2, 2, 1]);
});
