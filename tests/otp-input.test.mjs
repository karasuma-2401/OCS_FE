import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/otp.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compiled)(module, module.exports);
const { fillOtpDigits, deleteOtpDigit } = module.exports;

test('pasting a complete code fills all six positions from any focused box', () => {
  const result = fillOtpDigits(['9', '', '', '', '', ''], '12 34-56', 3);
  assert.deepEqual(result, { digits: ['1', '2', '3', '4', '5', '6'], focusIndex: 5 });
});

test('partial input fills from the focused position and ignores non-digits', () => {
  assert.deepEqual(fillOtpDigits(['1', '', '', '', '', ''], '2a3', 1),
    { digits: ['1', '2', '3', '', '', ''], focusIndex: 3 });
  assert.equal(fillOtpDigits(['', '', '', '', '', ''], 'abc', 0), null);
});

test('backspace removes the current digit or returns to the preceding digit', () => {
  assert.deepEqual(deleteOtpDigit(['1', '2', '', '', '', ''], 2),
    { digits: ['1', '', '', '', '', ''], focusIndex: 1 });
  assert.deepEqual(deleteOtpDigit(['1', '2', '', '', '', ''], 1),
    { digits: ['1', '', '', '', '', ''], focusIndex: 1 });
});
