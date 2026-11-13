import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shop/ContractMoneyInput.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
const { ContractMoneyInput } = module.exports;

test('contract price groups digits and rejects letters without losing integer precision', () => {
  let changed;
  const element = ContractMoneyInput({ value: 1234567, onChange: value => { changed = value; }, className: '' });
  assert.equal(element.props.value, '1.234.567');
  assert.equal(element.props.inputMode, 'numeric');
  const saved = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0;
  try {
    element.props.onChange({ currentTarget: { value: '12x345.678', selectionStart: 10 } });
    assert.equal(changed, 12345678);
    element.props.onChange({ currentTarget: { value: '1234567890123456789', selectionStart: 19 } });
    assert.equal(changed, 123456789012345);
    element.props.onChange({ currentTarget: { value: '', selectionStart: 0 } });
    assert.equal(changed, null);
  } finally { globalThis.requestAnimationFrame = saved; }
});
