import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/products.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const requests = [];
const apiClient = {
  get: async (path, config) => {
    requests.push({ method: 'GET', path, config });
    return { data: {} };
  },
};
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === './client') return { apiClient };
  throw new Error(`Unexpected import: ${name}`);
}, moduleObject, moduleObject.exports);

const {
  getPublicProducts,
  getPublicProductDetail,
  getCategoryIdByName,
  getCategoryNameById,
  formatVndPrice,
  CATEGORY_SEED_MAP,
  productsApi,
} = moduleObject.exports;

test('getPublicProducts builds sanitized query parameters and excludes blank fields', async () => {
  requests.length = 0;
  await getPublicProducts({
    page: 2,
    pageSize: 10,
    q: '  blazer  ',
    categoryId: '30000000-0000-0000-0000-000000000001',
    brandId: '',
    size: 'M',
    minPrice: 100000,
    maxPrice: 500000,
    minCondition: 90,
    sort: 'priceAsc',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].path, '/products');
  assert.deepEqual(requests[0].config.params, {
    page: 2,
    pageSize: 10,
    q: 'blazer',
    categoryId: '30000000-0000-0000-0000-000000000001',
    size: 'M',
    minPrice: 100000,
    maxPrice: 500000,
    minCondition: 90,
    sort: 'priceAsc',
  });
});

test('getPublicProducts handles empty or missing params gracefully', async () => {
  requests.length = 0;
  await getPublicProducts();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/products');
  assert.deepEqual(requests[0].config.params, {});
});

test('getPublicProductDetail calls /products/{id}/public with encoded ID', async () => {
  requests.length = 0;
  const testId = '70000000-0000-0000-0000-000000000001';
  await getPublicProductDetail(testId);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].path, `/products/${testId}/public`);
});

test('category mapping resolves valid names and falls back safely', () => {
  assert.equal(getCategoryIdByName('Áo khoác'), '30000000-0000-0000-0000-000000000001');
  assert.equal(getCategoryIdByName('Đầm & Váy'), '30000000-0000-0000-0000-000000000002');
  assert.equal(getCategoryIdByName('Quần & Jeans'), '30000000-0000-0000-0000-000000000003');
  assert.equal(getCategoryIdByName('Phụ kiện'), '30000000-0000-0000-0000-000000000004');
  assert.equal(getCategoryIdByName('Không tồn tại'), undefined);
  assert.equal(getCategoryIdByName(''), undefined);

  assert.equal(getCategoryNameById('30000000-0000-0000-0000-000000000001'), 'Áo khoác');
  assert.equal(getCategoryNameById('30000000-0000-0000-0000-000000000002'), 'Đầm & Váy');
  assert.equal(getCategoryNameById('30000000-0000-0000-0000-000000000003'.toUpperCase()), 'Quần & Jeans');
  assert.equal(getCategoryNameById('unknown-guid'), 'Tất cả');
  assert.equal(getCategoryNameById(null), 'Tất cả');
  assert.equal(getCategoryNameById(undefined), 'Tất cả');
});

test('formatVndPrice formats numbers and strings as Vietnamese currency', () => {
  const resultNum = formatVndPrice(450000);
  assert.ok(resultNum.includes('450.000'), `Expected formatted currency to contain 450.000, got ${resultNum}`);
  assert.ok(resultNum.includes('₫') || resultNum.includes('VND'), `Expected currency symbol, got ${resultNum}`);

  const resultStr = formatVndPrice('650000.00');
  assert.ok(resultStr.includes('650.000'), `Expected formatted currency to contain 650.000, got ${resultStr}`);

  assert.equal(formatVndPrice(null), '0 ₫');
  assert.equal(formatVndPrice(undefined), '0 ₫');
  assert.equal(formatVndPrice('not-a-number'), '0 ₫');
  assert.equal(formatVndPrice(0), '0 ₫');
});

test('productsApi exports all essential helpers and methods', () => {
  assert.equal(typeof productsApi.list, 'function');
  assert.equal(typeof productsApi.getDetail, 'function');
  assert.equal(typeof productsApi.formatPrice, 'function');
  assert.equal(typeof productsApi.getCategoryIdByName, 'function');
  assert.equal(typeof productsApi.getCategoryNameById, 'function');
});

