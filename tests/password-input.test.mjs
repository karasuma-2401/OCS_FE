import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shared/PasswordInput.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let activeState;
const localRequire = name => {
  if (name === 'react') return { useState: initial => {
    const state = activeState;
    return [state.value ?? initial, update => { state.value = update(state.value ?? initial); }];
  } };
  if (name === './Input') return { Input: () => null };
  if (name === 'lucide-react') return { Eye: () => null, EyeOff: () => null };
  return require(name);
};
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const { PasswordInput } = module.exports;
const render = (state, props = {}) => { activeState = state; return PasswordInput(props).props; };

test('password visibility toggles independently without changing the input value or submitting', () => {
  const firstState = {};
  const secondState = {};
  const props = { label: 'Mật khẩu mới', value: 'Example123!', autoComplete: 'new-password', required: true };
  let input = render(firstState, props);
  assert.equal(input.type, 'password');
  assert.equal(input.endAdornment.props.type, 'button');
  assert.equal(input.endAdornment.props['aria-label'], 'Hiện mật khẩu mới');
  assert.equal(input.endAdornment.props['aria-pressed'], false);
  input.endAdornment.props.onClick();
  input = render(firstState, props);
  assert.equal(input.type, 'text');
  assert.equal(input.value, props.value);
  assert.equal(input.autoComplete, 'new-password');
  assert.equal(input.required, true);
  assert.equal(input.endAdornment.props['aria-label'], 'Ẩn mật khẩu mới');
  assert.equal(input.endAdornment.props['aria-pressed'], true);
  assert.equal(render(secondState, { label: 'Xác nhận mật khẩu mới' }).type, 'password');
  input.endAdornment.props.onClick();
  assert.equal(render(firstState, props).type, 'password');
});

test('password toggle respects disabled and loading states and passes validation props through', () => {
  const props = { label: 'Mật khẩu', error: 'Không hợp lệ', helperText: 'Gợi ý', disabled: true };
  let input = render({}, props);
  assert.equal(input.disabled, true);
  assert.equal(input.endAdornment.props.disabled, true);
  assert.equal(input.error, props.error);
  assert.equal(input.helperText, props.helperText);
  input = render({}, { label: 'Mật khẩu', loading: true });
  assert.equal(input.loading, true);
  assert.equal(input.endAdornment.props.disabled, true);
});
