import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/layout/Navbar.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
let currentAuth;
const module = { exports: {} };
const localRequire = name => {
  if (name === '@/context/AuthContext') return { useAuth: () => currentAuth };
  if (name === '@/components/notifications/NotificationBell') return { NotificationBell: () => null };
  if (name === '@/auth/permissions') return { firstAllowedScreen: permissions => permissions.includes('screens.inventory') ? '/shop/inventory' : null };
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  return require(name);
};
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);

function renderNavigation({ roles = [], permissions = [], isAuthenticated = false } = {}) {
  currentAuth = {
    user: isAuthenticated ? { fullName: 'Người dùng', roles, permissions } : null,
    isAuthenticated,
    hasRole: role => roles.includes(role),
    hasPermission: permission => permissions.includes(permission),
    logout: () => Promise.resolve(),
  };
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(module.exports.Navbar)));
}

test('public navigation is visible without showing customer or store pages to visitors', () => {
  const html = renderNavigation();
  for (const label of ['Trang chủ', 'Khám phá', 'Cách ký gửi']) assert.match(html, new RegExp(label));
  assert.doesNotMatch(html, /href="\/appointments"|Web POS|Kho hàng|>Quản lý</);
});

test('only a customer with appointment permission sees the appointment link', () => {
  const customer = renderNavigation({ isAuthenticated: true, roles: ['Customer'], permissions: ['appointments.create'] });
  const customerWithoutPermission = renderNavigation({ isAuthenticated: true, roles: ['Customer'] });
  const staff = renderNavigation({ isAuthenticated: true, roles: ['Staff'], permissions: ['appointments.create', 'screens.inventory'] });
  assert.match(customer, /href="\/appointments"/);
  assert.doesNotMatch(customerWithoutPermission, /href="\/appointments"/);
  assert.doesNotMatch(staff, /href="\/appointments"|Web POS|Kho hàng|>Quản lý</);
});
