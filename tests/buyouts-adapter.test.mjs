import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/buyouts.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const requests = [];
const apiClient = {
  get: async (path, config) => { requests.push({ method: 'GET', path, config }); return { data: { id: 'response' } }; },
  post: async (path, body) => { requests.push({ method: 'POST', path, body }); return { data: { id: 'response' } }; },
};
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => {
  if (name === './client') return { apiClient };
  throw new Error(`Unexpected import ${name}`);
}, moduleObject, moduleObject.exports);
const { buyoutsApi } = moduleObject.exports;

test('buyout creation and review use the documented inspection and version', async () => {
  requests.length = 0;
  const inspection = { customerId: 'c', name: 'Áo', size: 'M', description: null, conditionPercentage: 90, brandId: 'b', categoryId: 'c', inspectionNotes: 'Đạt', passed: true };
  await buyoutsApi.inspect(inspection);
  await buyoutsApi.create('i', 100000, 200000);
  await buyoutsApi.review('id/1', 'v1', false, 'Không phù hợp');
  assert.deepEqual(requests, [
    { method: 'POST', path: '/buyouts/inspections', body: inspection },
    { method: 'POST', path: '/buyouts', body: { inspectionId: 'i', purchasePrice: 100000, listedPrice: 200000 } },
    { method: 'POST', path: '/buyouts/id%2F1/review', body: { expectedVersion: 'v1', approve: false, reason: 'Không phù hợp' } },
  ]);
});

test('customer lookup uses the reception endpoint and trims the search term', async () => {
  requests.length = 0;
  await buyoutsApi.customers('  0900  ');
  assert.deepEqual(requests, [{ method: 'GET', path: '/buyouts/customers', config: { params: { query: '0900' } } }]);
});

test('payment carries the latest version and recorded transaction, receipt is fetched independently', async () => {
  requests.length = 0;
  const payment = { expectedVersion: 'v2', storageLocationId: 'loc', paymentMethod: 'BankTransfer', bankTransactionReference: 'FT123', customerAgreed: true };
  await buyoutsApi.pay('id', payment);
  await buyoutsApi.receipt('id');
  assert.deepEqual(requests, [
    { method: 'POST', path: '/buyouts/id/payment', body: payment },
    { method: 'GET', path: '/buyouts/id/receipt', config: undefined },
  ]);
});
