import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/accounts.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const requests = [];
const apiClient = {
  get: async (path, config) => { requests.push({ method: 'GET', path, config }); return { data: {} }; },
  put: async (path, body) => { requests.push({ method: 'PUT', path, body }); return { data: {} }; },
  patch: async (path, body) => { requests.push({ method: 'PATCH', path, body }); return { data: {} }; },
  post: async (path, body) => { requests.push({ method: 'POST', path, body }); return { data: {} }; },
};
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === './client') return { apiClient };
  throw new Error(`Unexpected import: ${name}`);
}, moduleObject, moduleObject.exports);
const { accountsApi } = moduleObject.exports;

test('account list forwards server-side tab, search and pagination filters', async () => {
  requests.length = 0;
  const params = { page: 2, pageSize: 20, accountType: 0, status: 1, search: 'An' };
  await accountsApi.list(params);
  assert.deepEqual(requests, [{ method: 'GET', path: '/accounts', config: { params } }]);
});

test('account and employee edits use the documented endpoints and full payloads', async () => {
  requests.length = 0;
  const account = { fullName: 'An', email: 'an@example.com', phoneNumber: '0900000000', username: null };
  const profile = { fullName: 'An', phoneNumber: '0900000000', jobTitle: 'Staff', hiredOn: '2026-11-05' };
  await accountsApi.update('id-1', account);
  await accountsApi.updateEmployeeProfile('id-1', profile);
  assert.deepEqual(requests, [
    { method: 'PUT', path: '/accounts/id-1', body: account },
    { method: 'PATCH', path: '/accounts/id-1/employee-profile', body: profile },
  ]);
});
