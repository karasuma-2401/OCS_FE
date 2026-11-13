import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/barcode.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let handler;
const apiClient = { get: (...args) => handler('get', ...args), put: (...args) => handler('put', ...args) };
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(() => ({ apiClient }), moduleObject, moduleObject.exports);
const { barcodeApi } = moduleObject.exports;

test('barcode generation, contract labels and template preserve response and version', async () => {
  const calls = [];
  const template = { widthMm: 60, heightMm: 35, columns: 3, fontSizePt: 8, version: 'version-1', updatedAt: null };
  handler = async (...args) => {
    calls.push(args);
    if (args[1] === '/contracts/barcode/new') return { data: { barcode: 'OCS-1234567890ABCDEF' } };
    if (args[1].endsWith('/barcode-products')) return { data: [{ id: '1', name: 'Áo', barcode: 'OCS-1234567890ABCDEF', listedPrice: 50000 }] };
    return { data: template };
  };
  assert.equal(await barcodeApi.generate(), 'OCS-1234567890ABCDEF');
  assert.equal((await barcodeApi.contractProducts('id/one'))[0].listedPrice, 50000);
  assert.equal(await barcodeApi.getTemplate(), template);
  assert.equal(await barcodeApi.saveTemplate(template), template);
  assert.deepEqual(calls, [['get', '/contracts/barcode/new'], ['get', '/contracts/id%2Fone/barcode-products'], ['get', '/barcode-label-template'], ['put', '/barcode-label-template', template]]);
});
