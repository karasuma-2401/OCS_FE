import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sharedDir = fileURLToPath(new URL('../src/components/shared/', import.meta.url));
const cache = new Map();
const icons = new Proxy({}, { get: () => props => React.createElement('svg', { 'aria-hidden': props['aria-hidden'] }) });

function loadComponent(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const filename = path.join(sharedDir, `${name}.${name === 'joinClasses' ? 'ts' : 'tsx'}`);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  cache.set(name, module);
  const localRequire = dependency => {
    if (dependency === 'lucide-react') return icons;
    if (dependency.endsWith('.css')) return {};
    if (dependency.startsWith('./')) return loadComponent(dependency.slice(2));
    return require(dependency);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}

test('shared input preserves labels, validation descriptions and loading state', () => {
  const { Input } = loadComponent('Input');
  const html = renderToStaticMarkup(React.createElement(Input, {
    id: 'email', label: 'Email', type: 'email', error: 'Email không hợp lệ',
    helperText: 'Nhập email', 'aria-describedby': 'extra-help', loading: true,
  }));
  assert.match(html, /<label for="email"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="extra-help email-error"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Email không hợp lệ/);
  assert.doesNotMatch(html, /Nhập email/);
});

test('shared button preserves button type, loading and disabled behavior', () => {
  const { Button } = loadComponent('Button');
  const html = renderToStaticMarkup(React.createElement(Button, { loading: true, loadingText: 'Đang lưu' }, 'Lưu'));
  assert.match(html, /type="button"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /ocs-button--primary/);
  assert.match(html, /Đang lưu/);
});

test('table renders rows and empty state; legacy ui exports the same components', () => {
  const { Table } = loadComponent('Table');
  const ui = loadComponent('ui');
  assert.equal(ui.Table, Table);
  assert.equal(ui.Input, loadComponent('Input').Input);
  const columns = [{ key: 'name', header: 'Tên', accessor: 'name' }];
  const table = renderToStaticMarkup(React.createElement(Table, { columns, data: [{ name: 'Áo khoác' }] }));
  const empty = renderToStaticMarkup(React.createElement(Table, { columns, data: [], emptyTitle: 'Không có sản phẩm' }));
  assert.match(table, /Áo khoác/);
  assert.match(table, /scope="col"/);
  assert.match(empty, /Không có sản phẩm/);
});
