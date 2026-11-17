import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/utils/currencyWords.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  () => {},
  mod,
  mod.exports,
);
const { formatVndInWords } = mod.exports;

test('formatVndInWords formats standard Vietnamese amounts', () => {
  assert.equal(formatVndInWords(0), 'Không đồng');
  assert.equal(formatVndInWords(50000), 'Năm mươi nghìn đồng');
  assert.equal(formatVndInWords(100000), 'Một trăm nghìn đồng');
  assert.equal(formatVndInWords(150000), 'Một trăm năm mươi nghìn đồng');
  assert.equal(formatVndInWords(205000), 'Hai trăm linh năm nghìn đồng');
  assert.equal(formatVndInWords(215000), 'Hai trăm mười lăm nghìn đồng');
  assert.equal(formatVndInWords(221000), 'Hai trăm hai mươi mốt nghìn đồng');
  assert.equal(formatVndInWords(500000), 'Năm trăm nghìn đồng');
  assert.equal(formatVndInWords(1000000), 'Một triệu đồng');
  assert.equal(formatVndInWords(1250000), 'Một triệu hai trăm năm mươi nghìn đồng');
});
