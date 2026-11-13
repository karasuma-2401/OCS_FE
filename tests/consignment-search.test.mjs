import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function loadModule(path, requireModule = () => { throw new Error('Unexpected import'); }) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const moduleObject = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(requireModule, moduleObject, moduleObject.exports);
  return moduleObject.exports;
}

test('consignment search forwards all filters, pagination and cancellation to the search endpoint', async () => {
  const requests = [];
  const response = { items: [], page: 2, pageSize: 5, totalCount: 6, totalPages: 2, overview: { totalContracts: 10, activeContracts: 3, onSaleProducts: 2, soldProducts: 1, settledAmount: 100000 } };
  const { searchMyConsignments } = loadModule('../src/api/consignments.ts', name => {
    assert.equal(name, './client');
    return { apiClient: { get: async (path, config) => { requests.push({ path, config }); return { data: response }; } } };
  });
  const controller = new AbortController();
  const filters = { query: 'áo', status: 'Active', signedFrom: '2026-11-01', signedTo: '2026-11-30', expiresFrom: '2026-12-01', expiresTo: '2026-12-31', page: 2, pageSize: 5 };
  assert.deepEqual(await searchMyConsignments(filters, controller.signal), response);
  assert.deepEqual(requests, [{ path: '/customers/me/consignments/search', config: { params: filters, signal: controller.signal } }]);
});

test('the next 30 calendar days use Vietnam time and cross month and year boundaries', () => {
  const { nextThirtyDays } = loadModule('../src/utils/consignmentDateFilters.ts');
  assert.deepEqual(nextThirtyDays(new Date('2026-12-31T17:00:00Z')), { expiresFrom: '2027-01-01', expiresTo: '2027-01-30' });
  assert.deepEqual(nextThirtyDays(new Date('2028-02-01T16:59:59Z')), { expiresFrom: '2028-02-01', expiresTo: '2028-03-01' });
});
