import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/contractErrors.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === './auth') return { parseProblemDetails: error => ({ status: error.status }) };
  throw new Error(`Unexpected import: ${name}`);
}, moduleObject, moduleObject.exports);
const { contractLoadError, loadContractPart } = moduleObject.exports;

test('contract errors distinguish database failures, permissions, missing PDF and network errors', () => {
  assert.match(contractLoadError('mẫu hợp đồng', { status: 500 }), /mẫu hợp đồng \(HTTP 500\).*cơ sở dữ liệu/);
  assert.match(contractLoadError('PDF hợp đồng', { status: 404 }), /Không tìm thấy PDF hợp đồng/);
  assert.match(contractLoadError('PDF hợp đồng', { status: 403 }), /không có quyền/);
  assert.match(contractLoadError('hồ sơ nhân viên', { status: 0 }), /kiểm tra kết nối/);
});

test('contract load identifies which request failed', async () => {
  await assert.rejects(loadContractPart('mẫu hợp đồng', Promise.reject({ status: 500 })), /mẫu hợp đồng \(HTTP 500\)/);
  assert.equal(await loadContractPart('danh mục sản phẩm', Promise.resolve('ok')), 'ok');
});
