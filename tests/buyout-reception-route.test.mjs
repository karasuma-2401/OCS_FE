import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/pages/ReceptionPage.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let query = '';
let permissions = [];
let route = '';
let reception;
let layout;
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => {
  if (name === 'react-router-dom') return {
    useNavigate: () => path => { route = path; },
    useSearchParams: () => [new URLSearchParams(query)],
    Navigate: ({ to }) => React.createElement('span', null, to),
  };
  if (name === '@/context/AuthContext') return { useAuth: () => ({ hasPermission: code => permissions.includes(code), hasRole: () => false }) };
  if (name === '@/components/shop/ContractPageLayout') return { ContractPageLayout: props => { layout = props; return React.createElement('div', null, props.children); } };
  if (name === '@/components/shop/buyout/BuyoutReception') return { BuyoutReception: props => { reception = props; return React.createElement('div', null, 'Buyout reception'); } };
  if (name === '@/components/shop/reception') return { ConsignmentReceptionModal: props => { reception = props; return React.createElement('div', null, 'Consignment reception'); } };
  if (name === 'lucide-react') return { ShoppingBag: () => null };
  if (name.startsWith('@/api/')) return {};
  return require(name);
}, moduleObject, moduleObject.exports);

test('direct buyout reception opens inspection and returns to its originating page', () => {
  query = 'direct=1&type=buyout&from=buyouts';
  permissions = ['products.read', 'products.create', 'appointments.staff.reception', 'customers.read'];
  const html = renderToStaticMarkup(React.createElement(moduleObject.exports.ReceptionPage));
  assert.match(html, /Buyout reception/);
  assert.equal(reception.canInspect, true);
  assert.equal(layout.activeItem, 'buyout');
  assert.equal(layout.backTo, '/shop/buyouts');
  reception.onConsignment();
  assert.equal(route, '/shop/reception/new?direct=1&type=consignment&from=buyouts');
});

test('direct consignment intake links its buyout tab to the approval workflow', () => {
  query = 'direct=1';
  permissions = ['products.read', 'products.create', 'appointments.staff.reception', 'customers.read'];
  const html = renderToStaticMarkup(React.createElement(moduleObject.exports.ReceptionPage));
  assert.match(html, /Consignment reception/);
  assert.equal(reception.canBuyout, true);
  reception.onBuyout();
  assert.equal(route, '/shop/reception/new?direct=1&type=buyout');
});

test('buyout intake enforces product permissions while inspection remains separately permissioned', () => {
  query = 'direct=1&type=buyout';
  permissions = ['products.read'];
  assert.match(renderToStaticMarkup(React.createElement(moduleObject.exports.ReceptionPage)), /unauthorized/);
  permissions.push('products.create');
  assert.match(renderToStaticMarkup(React.createElement(moduleObject.exports.ReceptionPage)), /Buyout reception/);
  assert.equal(reception.canInspect, false);
  assert.equal(reception.canConsign, false);
});
