import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import zxing from '@zxing/library';
import JsBarcode from 'jsbarcode';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { BitArray, Code128Reader } = zxing;
const source = readFileSync(new URL('../src/components/shop/barcodeGeometry.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, moduleObject, moduleObject.exports);
const { barcodeOptions, barcodeModuleWidthMm } = moduleObject.exports;

test('distinct Code 128 product barcodes decode to their original values', () => {
  const values = ['OCS-1234567890ABCDEF', 'OCS-FEDCBA0987654321', 'OCS-AAAAAAAAAAAAAAAA'];
  const patterns = [];
  for (const value of values) {
    const encoded = {};
    JsBarcode(encoded, value, barcodeOptions);
    const data = encoded.encodings.map(item => item.data).join('');
    patterns.push(data);
    const left = barcodeOptions.marginLeft / barcodeOptions.width;
    const right = barcodeOptions.marginRight / barcodeOptions.width;
    assert.ok(left >= 10 && right >= 10);
    const bits = '0'.repeat(left) + data + '0'.repeat(right);
    const row = new BitArray(bits.length * 3);
    for (let i = 0; i < bits.length; i++) if (bits[i] === '1') row.setRange(i * 3, (i + 1) * 3);
    assert.equal(new Code128Reader().decodeRow(0, row, new Map()).getText(), value);
  }
  assert.equal(new Set(patterns).size, values.length);
  assert.ok(barcodeModuleWidthMm(values[2], 40) < 0.254);
  assert.ok(barcodeModuleWidthMm(values[2], 90) > 0.254);
});
