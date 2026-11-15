import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shop/BuyoutManagement.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let roles = [];
let permissions = [];
const wrapper = ({ children }) => React.createElement('div', null, children);
const shared = new Proxy({}, { get: (_, name) => name === 'PageHeaderCard' ? ({ title, actions }) => React.createElement('div', null, title, actions) : wrapper });
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => {
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: { roles }, hasPermission: permission => permissions.includes(permission) }) };
  if (name === '@/components/shared') return shared;
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name === 'react-router-dom') return { Link: wrapper };
  if (name === './buyout/BuyoutCreateForm') return { BuyoutCreateForm: wrapper };
  if (name.startsWith('@/api/')) return {};
  return require(name);
}, moduleObject, moduleObject.exports);

test('buyout review controls require both an eligible role and approval permission', () => {
  roles = ['Manager']; permissions = ['products.read', 'products.create', 'products.approve'];
  let html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.match(html, /Chờ duyệt/);
  assert.match(html, /Lập phiếu/);
  roles = ['Staff'];
  html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.doesNotMatch(html, /aria-pressed="false"[^>]*>Chờ duyệt/);
  assert.match(html, /Lập phiếu/);
  roles = ['Manager']; permissions = ['products.read'];
  html = renderToStaticMarkup(React.createElement(moduleObject.exports.BuyoutManagement));
  assert.doesNotMatch(html, /aria-pressed="false"[^>]*>Chờ duyệt/);
  assert.doesNotMatch(html, /Lập phiếu/);
});
