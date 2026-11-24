import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

test('withdrawal API separates customer ownership routes from permissioned staff actions', async () => {
  const calls = [];
  const client = { get: async (...args) => { calls.push(['get', ...args]); return { data: [] }; }, post: async (...args) => { calls.push(['post', ...args]); return { data: {} }; } };
  const api = load('../src/api/earlyWithdrawals.ts', { './client': { apiClient: client } }).earlyWithdrawalsApi;
  const signal = new AbortController().signal;
  await api.eligible(signal);
  await api.list(true, 2, 20, signal);
  await api.detail(false, 'phiếu/1', signal);
  await api.create(['p1', 'p2'], 'Lấy lại hàng');
  await api.cancel('phiếu/1');
  await api.approve('phiếu/1');
  await api.reject('phiếu/1', 'Hàng không còn đủ điều kiện');
  await api.pay('phiếu/1', { amount: 12345.68, paymentMethod: 'BankTransfer', reference: 'BANK-1' });
  await api.handover('phiếu/1', 'Biên bản BG-1');
  assert.deepEqual(calls, [
    ['get', '/customers/me/early-withdrawals/eligible-products', { signal }],
    ['get', '/customers/me/early-withdrawals', { params: { page: 2, pageSize: 20 }, signal }],
    ['get', '/early-withdrawals/phi%E1%BA%BFu%2F1', { signal }],
    ['post', '/customers/me/early-withdrawals', { productIds: ['p1', 'p2'], reason: 'Lấy lại hàng' }],
    ['post', '/customers/me/early-withdrawals/phi%E1%BA%BFu%2F1/cancel'],
    ['post', '/early-withdrawals/phi%E1%BA%BFu%2F1/approve'],
    ['post', '/early-withdrawals/phi%E1%BA%BFu%2F1/reject', { note: 'Hàng không còn đủ điều kiện' }],
    ['post', '/early-withdrawals/phi%E1%BA%BFu%2F1/payment', { amount: 12345.68, paymentMethod: 'BankTransfer', reference: 'BANK-1' }],
    ['post', '/early-withdrawals/phi%E1%BA%BFu%2F1/handover', { evidence: 'Biên bản BG-1' }],
  ]);
});

const helpers = load('../src/utils/earlyWithdrawals.ts');
test('fee and next-step descriptions distinguish waiting, ended, paid, partial and free requests', () => {
  const row = { status: 'Pending', totalPenaltyAmount: 3000, paymentStatus: 'Unpaid', paidAt: null };
  assert.equal(helpers.withdrawalFeeState(row).label, 'Chưa đến bước thu phí');
  for (const status of ['Cancelled', 'Rejected']) {
    assert.equal(helpers.withdrawalFeeState({ ...row, status }).label, 'Không cần đóng phí');
    assert.equal(helpers.withdrawalFeeState({ ...row, status, paymentStatus: 'Partial' }).label, 'Đã thu một phần');
    assert.equal(helpers.withdrawalFeeState({ ...row, status, paymentStatus: 'Paid' }).label, 'Đã thu đủ phí');
  }
  assert.equal(helpers.withdrawalFeeState({ ...row, status: 'Approved' }).label, 'Chờ thu phí');
  assert.equal(helpers.withdrawalFeeState({ ...row, status: 'Approved', paymentStatus: 'Paid', totalPenaltyAmount: 0 }).label, 'Miễn phí');
  assert.match(helpers.withdrawalNextStep({ ...row, status: 'Approved', paymentStatus: 'Paid' }, true), /nhận hàng/);
  assert.match(helpers.withdrawalNextStep({ ...row, status: 'Approved' }, false), /Xác nhận thu đủ phí/);
  assert.match(helpers.withdrawalNextStep({ ...row, status: 'Completed', handedOverAt: '2026-11-25T01:00:00Z' }, true), /Đã nhận đủ hàng/);
});
test('withdrawal search and summary use server totals and preserve customer scope and filters', async () => {
  const calls = [];
  const signal = new AbortController().signal;
  const expected = { items: [], totalCount: 38, totalPages: 2, page: 2, pageSize: 20 };
  const api = load('../src/api/earlyWithdrawals.ts', { './client': { apiClient: { get: async (...args) => { calls.push(args); return { data: expected }; } } } }).earlyWithdrawalsApi;
  const filters = { page: 2, pageSize: 20, q: 'Áo', status: 'Approved', paymentStatus: 'Paid', sort: 'oldest' };
  assert.deepEqual(await api.search(false, filters, signal), expected);
  await api.summary(false, signal);
  await api.search(true, filters, signal);
  await api.summary(true, signal);
  assert.deepEqual(calls, [
    ['/early-withdrawals/search', { params: filters, signal }], ['/early-withdrawals/summary', { signal }],
    ['/customers/me/early-withdrawals/search', { params: filters, signal }], ['/customers/me/early-withdrawals/summary', { signal }],
  ]);
});
test('fee preview sums server amounts without floating point residue or recalculating rates', () => {
  assert.equal(helpers.withdrawalEstimate([{ penaltyAmount: .1 }, { penaltyAmount: .2 }]), .3);
  assert.equal(helpers.withdrawalEstimate([{ penaltyAmount: 12345.68, listedPrice: 999999, penaltyRate: 90 }, { penaltyAmount: 0 }]), 12345.68);
  assert.equal(helpers.withdrawalEstimate([]), 0);
});
test('payment and handover gates follow the server workflow including explicitly free requests', () => {
  const pending = { status: 'Pending', paymentStatus: 'Unpaid', totalPenaltyAmount: 10, paidAt: null };
  assert.deepEqual(helpers.withdrawalActions(pending), { cancel: true, approve: true, reject: true, pay: false, handover: false });
  const approved = { ...pending, status: 'Approved' };
  assert.equal(helpers.withdrawalActions(approved).pay, true);
  assert.equal(helpers.withdrawalActions(approved).handover, false);
  const paid = { ...approved, paymentStatus: 'Paid', paidAt: '2026-11-24T10:00:00Z' };
  assert.equal(helpers.withdrawalActions(paid).reject, false);
  assert.equal(helpers.withdrawalActions(paid).handover, true);
  const free = { ...approved, totalPenaltyAmount: 0, paymentStatus: 'Paid' };
  assert.equal(helpers.withdrawalActions(free).pay, false);
  assert.equal(helpers.withdrawalActions(free).handover, true);
  assert.equal(helpers.withdrawalActions(free).reject, true);
  for (const status of ['Rejected', 'Completed', 'Cancelled', 'Legacy']) {
    assert.equal(Object.values(helpers.withdrawalActions({ ...paid, status })).some(Boolean), false);
  }
});
test('business rejection reasons survive error handling and withdrawal screens require read permission', () => {
  assert.equal(helpers.withdrawalError({ response: { status: 409, data: { title: 'Sản phẩm đã bán.' } } }), 'Sản phẩm đã bán.');
  assert.match(helpers.withdrawalError({ response: { status: 403 } }), /không có quyền/);
  const permissions = load('../src/auth/permissions.ts');
  assert.equal(permissions.screenByPath['/shop/withdrawals'], 'withdrawals');
  assert.equal(permissions.canAccessScreen(['withdrawals.read'], 'withdrawals'), true);
  assert.equal(permissions.canAccessScreen(['screens.inventory'], 'withdrawals'), false);
});
