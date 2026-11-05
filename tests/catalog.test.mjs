import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/catalog.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compiled)(module, module.exports);
const { filterCatalog } = module.exports;

const items = [
  { code: 'OCS-1', name: 'Áo khoác denim', category: 'Áo khoác', size: 'L', condition: '95%', price: 200000 },
  { code: 'OCS-2', name: 'Áo thun retro', category: 'Áo thun', size: 'M', condition: '90%', price: 120000 },
  { code: 'OCS-3', name: 'Áo khoác len', category: 'Áo khoác', size: 'M', condition: '95%', price: 250000 },
];
const defaults = { query: '', category: 'Tất cả', size: '', condition: '', price: '', sort: 'featured' };

test('catalog search matches names and codes without case sensitivity', () => {
  assert.deepEqual(filterCatalog(items, { ...defaults, query: ' ÁO KHOÁC ' }).map((p) => p.code), ['OCS-1', 'OCS-3']);
  assert.deepEqual(filterCatalog(items, { ...defaults, query: 'ocs-2' }).map((p) => p.code), ['OCS-2']);
});

test('catalog combines category, size and price filters at the price boundary', () => {
  assert.deepEqual(filterCatalog(items, { ...defaults, category: 'Áo khoác', size: 'M', condition: '95%', price: 'over-200' }).map((p) => p.code), ['OCS-3']);
  assert.deepEqual(filterCatalog(items, { ...defaults, price: 'under-200' }).map((p) => p.code), ['OCS-2']);
  assert.deepEqual(filterCatalog(items, { ...defaults, price: 'over-200' }).map((p) => p.code), ['OCS-1', 'OCS-3']);
});

test('catalog sorts filtered results without changing original order', () => {
  assert.deepEqual(filterCatalog(items, { ...defaults, sort: 'price-asc' }).map((p) => p.code), ['OCS-2', 'OCS-1', 'OCS-3']);
  assert.deepEqual(filterCatalog(items, { ...defaults, sort: 'price-desc' }).map((p) => p.code), ['OCS-3', 'OCS-1', 'OCS-2']);
  assert.deepEqual(items.map((p) => p.code), ['OCS-1', 'OCS-2', 'OCS-3']);
});
