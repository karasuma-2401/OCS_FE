import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function apiWith(client) {
  const source = readFileSync(new URL('../src/api/expiry.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(() => ({ apiClient: client }), module, module.exports);
  return module.exports.expiryApi;
}

test('expiry list sends customer and deadline filters to server with pagination', async () => {
  const calls = [];
  const api = apiWith({ get: async (...args) => { calls.push(args); return { data: { items: [], totalCount: 0 } }; } });
  const filters = { page: 2, pageSize: 20, customerQuery: 'Lan', status: 'Pending', type: 'Return', deadlineFrom: '2026-11-01T00:00:00Z', deadlineTo: '2026-11-30T23:59:59Z' };
  await api.list(filters);
  assert.deepEqual(calls, [['/expiry-processings', { params: filters }]]);
});

test('partial handovers send selected barcodes and receipt lookup remains separate', async () => {
  const calls = [];
  const api = apiWith({ post: async (...args) => { calls.push(args); return { data: {} }; }, get: async (...args) => { calls.push(args); return { data: [] }; } });
  await api.confirmReturn('phiếu/1', ['A', 'B']);
  await api.confirmDonation('phiếu/1', ['C'], 'Tổ chức', 'BB-1', 'Ghi chú');
  await api.donationReceipts('phiếu/1');
  assert.deepEqual(calls, [
    ['/expiry-processings/phi%E1%BA%BFu%2F1/confirm-return', { barcodes: ['A', 'B'] }],
    ['/expiry-processings/phi%E1%BA%BFu%2F1/confirm-donation', { barcodes: ['C'], recipientOrganization: 'Tổ chức', evidence: 'BB-1', note: 'Ghi chú' }],
    ['/expiry-processings/phi%E1%BA%BFu%2F1/donation-receipts'],
  ]);
});
