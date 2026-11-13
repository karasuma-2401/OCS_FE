import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/inventory.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const requests = [];
const apiClient = {
  get: async (path, config) => { requests.push({ method: 'GET', path, config }); return { data: {} }; },
  post: async (path, body) => { requests.push({ method: 'POST', path, body }); return { data: {} }; },
  put: async (path, body) => { requests.push({ method: 'PUT', path, body }); return { data: {} }; },
};
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === './client') return { apiClient, resolveApiAssetUrl: url => url };
  throw new Error(`Unexpected import: ${name}`);
}, moduleObject, moduleObject.exports);
const { inventoryApi } = moduleObject.exports;

test('inventory filters and cancellation reach the internal list endpoint', async () => {
  requests.length = 0;
  const controller = new AbortController();
  const params = { page: 2, pageSize: 20, q: 'BC-123', approval: 'Pending', locationId: 'location-1' };
  await inventoryApi.list(params, controller.signal);
  assert.deepEqual(requests, [{ method: 'GET', path: '/inventory', config: { params, signal: controller.signal } }]);
});

test('approval, sale and price updates carry the version needed to detect stale edits', async () => {
  requests.length = 0;
  await inventoryApi.review('item-1', 'v1', true, undefined, 100000, 'Hợp đồng 01');
  await inventoryApi.offer('item-1', 'v2');
  await inventoryApi.changePrice('item-1', 'v3', 120000, 'Giá mới');
  assert.deepEqual(requests, [
    { method: 'POST', path: '/inventory/item-1/review', body: { expectedVersion: 'v1', approve: true, reason: undefined, verifiedPrice: 100000, agreementEvidence: 'Hợp đồng 01' } },
    { method: 'POST', path: '/inventory/item-1/offer', body: { expectedVersion: 'v2' } },
    { method: 'PUT', path: '/inventory/item-1/price', body: { expectedVersion: 'v3', price: 120000, reason: 'Giá mới' } },
  ]);
});

test('editing product details and location sends each change with its current version', async () => {
  requests.length = 0;
  await inventoryApi.changeDetails('item-1', 'v1', 'Áo mới', 'L', 'Mô tả', 90);
  await inventoryApi.changeLocation('item-1', 'v2', 'location-2');
  assert.deepEqual(requests, [
    { method: 'PUT', path: '/inventory/item-1/details', body: { expectedVersion: 'v1', name: 'Áo mới', size: 'L', description: 'Mô tả', conditionPercentage: 90 } },
    { method: 'PUT', path: '/inventory/item-1/location', body: { expectedVersion: 'v2', locationId: 'location-2' } },
  ]);
});
