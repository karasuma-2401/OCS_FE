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
    if (dependency === 'react-dom') return { createPortal: element => element };
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

test('modal honors wider layouts and keeps its content scrollable within the viewport', () => {
  const { Modal } = loadComponent('Modal');
  const originalDocument = globalThis.document;
  globalThis.document = { body: {} };
  try {
    const html = renderToStaticMarkup(React.createElement(Modal, { open: true, onClose() {}, title: 'Xem PDF', className: 'max-w-[96rem]', footer: 'Đóng' }, 'Nội dung dài'));
    assert.match(html, /max-w-\[96rem\]/);
    assert.doesNotMatch(html, /max-w-lg/);
    assert.match(html, /max-h-\[calc\(100dvh-1rem\)\]/);
    assert.match(html, /min-h-0 min-w-0 overflow-y-auto/);
    assert.match(html, /<footer/);
  } finally { globalThis.document = originalDocument; }
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

test('shop detail layout keeps the list in the page and exposes a closable detail region', () => {
  const { DetailSplitLayout, DetailPanel } = loadComponent('DetailSplitLayout');
  const tree = React.createElement(DetailSplitLayout, { open: true },
    React.createElement('section', null, 'Danh sách lịch hẹn'),
    React.createElement(DetailPanel, { panelRef: { current: null }, title: 'Chi tiết lịch hẹn', description: 'Thông tin lịch hẹn', onClose() {} }, 'Lịch đã chọn'));
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Danh sách lịch hẹn/);
  assert.match(html, /<aside[^>]*aria-label="Chi tiết lịch hẹn"/);
  assert.match(html, /aria-label="Đóng chi tiết lịch hẹn"/);
  assert.match(html, /Lịch đã chọn/);
  assert.doesNotMatch(html, /aria-modal|role="dialog"/);
});

test('AlertBanner and Toast support semantic variants, actions, and accessibility roles', () => {
  const { AlertBanner } = loadComponent('AlertBanner');
  const { Toast } = loadComponent('Toast');

  const errorBannerHtml = renderToStaticMarkup(
    React.createElement(AlertBanner, {
      variant: 'error',
      title: 'Lỗi kết nối',
      description: 'Vui lòng thử lại sau.',
      action: { label: 'Thử lại', onClick() {} },
    }),
  );
  assert.match(errorBannerHtml, /role="alert"/);
  assert.match(errorBannerHtml, /aria-live="assertive"/);
  assert.match(errorBannerHtml, /Lỗi kết nối/);
  assert.match(errorBannerHtml, /Thử lại/);

  const brandToastHtml = renderToStaticMarkup(
    React.createElement(Toast, {
      variant: 'brand',
      title: 'Ưu đãi mới',
      message: 'Giảm 5% phí ký gửi',
      showProgress: true,
      durationMs: 4000,
      action: { label: 'Xem ngay', onClick() {} },
    }),
  );
  assert.match(brandToastHtml, /role="status"/);
  assert.match(brandToastHtml, /aria-live="polite"/);
  assert.match(brandToastHtml, /Ưu đãi mới/);
  assert.match(brandToastHtml, /Xem ngay/);
  assert.match(brandToastHtml, /toast-progress 4000ms linear/);
});
