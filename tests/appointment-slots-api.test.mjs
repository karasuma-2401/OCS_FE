import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/appointmentApi.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const calls = [];
const apiClient = Object.fromEntries(['get', 'post', 'put', 'patch'].map(method => [method, async (...args) => { calls.push([method, ...args]); return { data: { id: 'slot-1' } }; }]));
const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => name === './client' ? { apiClient } : {}, moduleObject, moduleObject.exports);

test('slot management sends capacity and version to manager endpoints', async () => {
  const { appointmentApi } = moduleObject.exports;
  const payload = { startTime: '09:00:00', endTime: '10:00:00', maxCustomers: 4, isActive: true, expectedUpdatedAt: null };
  await appointmentApi.getManagedTimeSlots();
  await appointmentApi.createTimeSlot(payload);
  await appointmentApi.updateTimeSlot('slot/1', payload);
  assert.deepEqual(calls, [['get', '/appointment-slots'], ['post', '/appointment-slots', payload], ['put', '/appointment-slots/slot%2F1', payload]]);
});
