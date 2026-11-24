import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('withdrawal QR transport scopes transactions, forwards cancellation and never treats cash as QR success', async () => {
  const calls = [];
  let response = { transactionId: 'tx', earlyWithdrawalId: 'request', requestNumber: 'RS-request', amount: '3000.00', status: 'Pending', paymentStatus: 'Unpaid' };
  const client = Object.fromEntries(['get', 'post'].map(method => [method, async (...args) => { calls.push([method, ...args]); return { data: response }; }]));
  const code = ts.transpileModule(readFileSync(new URL('../src/api/withdrawalPayments.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(() => ({ apiClient: client }), module, module.exports);
  const api = module.exports.withdrawalPaymentApi('request');
  const first = await api.initiateVietQr('request');
  assert.equal(first.invoiceNumber, 'RS-request');
  assert.deepEqual(calls[0], ['post', '/early-withdrawals/request/payment/vietqr', { forceNew: false }]);
  await api.initiateVietQr('request', true);
  assert.deepEqual(calls[1][2], { forceNew: true });
  const signal = new AbortController().signal;
  response = { ...response, status: 'Failed', paymentStatus: 'Paid' };
  assert.equal((await api.getVietQrStatus('tx', signal)).invoicePaymentStatus, 'Unpaid');
  assert.deepEqual(calls[2], ['get', '/early-withdrawals/request/payment/vietqr/tx', { signal }]);
  response = { ...response, status: 'Success' };
  assert.equal((await api.getVietQrStatus('tx')).invoicePaymentStatus, 'Paid');
  assert.equal(api.simulateVietQrWebhook, undefined);
});
