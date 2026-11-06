import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/shared/DatePicker.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const module = { exports: {} };
const icon = () => null;
const localRequire = (name) => name === 'lucide-react' ? { CalendarDays: icon, ChevronLeft: icon, ChevronRight: icon } : require(name);
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const { DatePicker, parseDate, parseDisplayDate, toDateValue } = module.exports;

test('date parsing rejects impossible dates and accepts leap days without timezone shifts', () => {
  assert.equal(parseDisplayDate('29/02/2024'), '2024-02-29');
  assert.equal(parseDisplayDate('29/02/2023'), null);
  assert.equal(parseDisplayDate('31/04/2026'), null);
  assert.equal(parseDisplayDate('6/11/2026'), null);
  assert.equal(parseDate('2026-13-01'), null);
  assert.equal(toDateValue(parseDate('2026-11-06')), '2026-11-06');
});

test('date field displays a local date while submitting its ISO value', () => {
  const html = renderToStaticMarkup(React.createElement(DatePicker, { label: 'Ngày vào làm', value: '2026-11-06', name: 'hiredOn', required: true, onChange() {} }));
  assert.match(html, /Ngày vào làm/);
  assert.match(html, /value="06\/11\/2026"/);
  assert.match(html, /name="hiredOn" value="2026-11-06"/);
  assert.match(html, /required=""/);
  assert.match(html, /aria-expanded="false"/);
});
