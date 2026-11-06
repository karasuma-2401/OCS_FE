import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shared/Skeleton.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, module, module.exports);
const { SkeletonLoading } = module.exports;

test('loading placeholders announce one accessible status and hide decorative shapes', () => {
  for (const variant of ['table', 'cards', 'list', 'detail', 'page', 'slots', 'products', 'permissions', 'rail']) {
    const html = renderToStaticMarkup(React.createElement(SkeletonLoading, { variant, label: 'Đang tải thử...' }));
    assert.equal((html.match(/role="status"/g) ?? []).length, 1, variant);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Đang tải thử/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /motion-reduce:animate-none/);
  }
});

test('product skeleton respects the requested number of cards', () => {
  const html = renderToStaticMarkup(React.createElement(SkeletonLoading, { variant: 'products', count: 6 }));
  assert.equal((html.match(/aspect-\[3\/4\]/g) ?? []).length, 6);
});
