import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTypeScript(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => dependencies[name] ?? require(name), module, module.exports);
  return module.exports;
}

const permissions = loadTypeScript('../src/auth/permissions.ts');

test('shop navigation resolves English paths to the right screens and keeps permission requirements', () => {
  for (const [screen, path] of Object.entries(permissions.screenPaths)) {
    assert.match(path, /^\/(shop|admin)\/[a-z-]+$/);
    assert.equal(permissions.screenByPath[path], screen);
  }
  assert.equal(permissions.firstAllowedScreen(['screens.inventory']), '/shop/inventory');
  assert.equal(permissions.firstAllowedScreen(['screens.consignment']), null);
  assert.equal(permissions.firstAllowedScreen(['screens.consignment', 'appointments.staff.read']), '/shop/consignment');
  assert.equal(permissions.screenByPath['/admin/products'], 'inventory');
  assert.equal(permissions.screenByPath['/shop/buyouts'], 'buyout');
  assert.equal(permissions.canAccessScreen(['screens.inventory'], 'buyout'), false);
  assert.equal(permissions.canAccessScreen(['products.read'], 'buyout'), true);
  assert.equal(permissions.canAccessScreen(['screens.inventory', 'products.read'], 'buyout'), true);
});

