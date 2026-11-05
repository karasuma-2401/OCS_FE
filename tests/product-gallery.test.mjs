import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/customer/ProductImageGallery.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
const icon = () => null;
const localRequire = (name) => name === 'lucide-react' ? { ChevronLeft: icon, ChevronRight: icon } : require(name);
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const { ProductImageGallery } = module.exports;

test('product gallery renders distinct labeled controls for multiple views', () => {
  const html = renderToStaticMarkup(React.createElement(ProductImageGallery, {
    productName: 'Áo khoác',
    images: [{ src: '/front.jpg', label: 'Mặt trước' }, { src: '/side.jpg', label: 'Mặt bên' }, { src: '/back.jpg', label: 'Mặt sau' }],
  }));
  assert.match(html, /Ảnh trước/);
  assert.match(html, /Ảnh tiếp theo/);
  assert.match(html, /Xem mặt bên/);
  assert.match(html, /Xem mặt sau/);
  assert.match(html, /aria-pressed="true"/);
});

test('product gallery supports products with only one or no image', () => {
  const single = renderToStaticMarkup(React.createElement(ProductImageGallery, { productName: 'Áo', images: [{ src: '/only.jpg', label: 'Mặt trước' }] }));
  assert.match(single, /Áo - Mặt trước/);
  assert.doesNotMatch(single, /Ảnh tiếp theo/);
  assert.equal(renderToStaticMarkup(React.createElement(ProductImageGallery, { productName: 'Áo', images: [] })), '');
});
