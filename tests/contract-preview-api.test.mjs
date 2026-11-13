import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/api/contracts.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
let handler;
const apiClient = { get: (...args) => handler('get', ...args), put: (...args) => handler('put', ...args), post: (...args) => handler(...args) };
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => name === './client' ? { apiClient } : require(name), moduleObject, moduleObject.exports);
const { previewContract, getIntakeTemplate, getManagedTemplate, saveManagedTemplate, previewManagedTemplate } = moduleObject.exports;

test('preview sends the current contract to the PDF preview endpoint', async () => {
  const request = { requestId: 'request-1', terms: 'Điều khoản' };
  const pdf = new Blob(['%PDF-test'], { type: 'application/pdf' });
  handler = async (path, body, config) => {
    assert.equal(path, '/contracts/preview');
    assert.deepEqual(body, request);
    assert.equal(config.responseType, 'blob');
    return { data: pdf };
  };
  assert.equal(await previewContract(request), pdf);
});

test('template management and staff defaults use separate endpoints and preserve the version', async () => {
  const template = { title: 'Mẫu', defaultTerms: 'Điều khoản', version: 'version-1' };
  const calls = [];
  handler = async (...args) => { calls.push(args); return { data: template }; };
  assert.equal(await getIntakeTemplate(), template);
  assert.equal(await getManagedTemplate(), template);
  assert.equal(await saveManagedTemplate(template), template);
  assert.deepEqual(calls, [['get', '/contracts/template'], ['get', '/contract-template'], ['put', '/contract-template', template]]);
  handler = async (path, data, config) => { assert.equal(path, '/contract-template/preview'); assert.equal(data, template); assert.equal(config.responseType, 'blob'); return { data: new Blob(['pdf']) }; };
  assert.ok(await previewManagedTemplate(template) instanceof Blob);
});

test('preview makes validation errors readable when the server returns JSON in a blob', async () => {
  const problem = { title: 'Không thể tạo bản xem trước', detail: 'Ngày kết thúc phải sau ngày ký.' };
  const error = { isAxiosError: true, response: { status: 400, data: new Blob([JSON.stringify(problem)], { type: 'application/problem+json' }) } };
  handler = async () => { throw error; };
  await assert.rejects(() => previewContract({}), actual => {
    assert.equal(actual, error);
    assert.deepEqual(actual.response.data, problem);
    return true;
  });
});
