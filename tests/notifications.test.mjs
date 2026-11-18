import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const hookSource = ts.transpileModule(readFileSync(new URL('../src/hooks/useFcm.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function mountHook({ failRegistration = false, initialStorage = [], getToken = async () => 'device-token', testResult, options = {} } = {}) {
  const storage = new Map(initialStorage);
  const hooks = [];
  let cursor = 0, dirty = true, effects = [], result, currentOptions = { enabled: true, userId: 'A', ...options };
  const browserEvents = new Map(), workerEvents = new Map();
  const calls = [];
  let fail = failRegistration;
  const subscribe = (map, type, fn) => { if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks[index], value => {
        const next = typeof value === 'function' ? value(hooks[index]) : value;
        if (!Object.is(next, hooks[index])) { hooks[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = cursor++; return hooks[index] ??= { current: initial }; },
    useCallback(fn, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) hooks[index] = { fn, deps };
      return hooks[index].fn;
    },
    useEffect(fn, deps) {
      const index = cursor++, previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        hooks[index] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { hooks[index].cleanup?.(); hooks[index].cleanup = fn(); });
      }
    },
  };
  function Notification() { throw new Error('The page must not synthesize a system notification'); }
  Notification.permission = 'granted';
  const registration = {};
  const api = {
    async registerFcmToken(token) { calls.push(token); if (fail) throw new Error('503 registration failed'); },
    async getFcmStatus() { return { configured: true, registeredDeviceCount: fail ? 0 : 1, devices: [] }; },
    async sendTestNotification() { return testResult; },
    async unregisterFcmToken() {},
  };
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, Notification, console,
    window: {
      Notification,
      addEventListener: (type, fn) => subscribe(browserEvents, type, fn),
      removeEventListener: (type, fn) => browserEvents.get(type)?.delete(fn),
      setInterval: () => 1, clearInterval() {}, dispatchEvent() {},
    },
    document: { visibilityState: 'visible' },
    navigator: { serviceWorker: {
      register: async () => registration, ready: Promise.resolve(registration),
      addEventListener: (type, fn) => subscribe(workerEvents, type, fn),
      removeEventListener: (type, fn) => workerEvents.get(type)?.delete(fn),
    } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    require(name) {
      if (name === 'react') return react;
      if (name === 'firebase/messaging') return { getToken };
      if (name === '@/config/firebase') return { getFirebaseMessagingInstance: async () => ({}), isFirebaseClientConfigured: true, firebaseVapidKey: 'mock', clearFirebaseRegistration: async () => storage.delete('ocs_active_fcm_token') };
      if (name === '@/api/notificationApi') return { notificationApi: api };
      throw new Error(`Unexpected module: ${name}`);
    },
  };
  vm.runInNewContext(hookSource, context);
  const render = () => { cursor = 0; dirty = false; result = module.exports.useFcm(currentOptions); };
  render();
  return {
    storage, calls,
    get result() { return result; },
    setFailure(value) { fail = value; },
    rerender(options) { currentOptions = { ...currentOptions, ...options }; dirty = true; },
    dispatch(type) { for (const fn of browserEvents.get(type) ?? []) fn(); },
    message(payload) { for (const fn of workerEvents.get('message') ?? []) fn({ data: payload }); },
    unmount() { for (const hook of hooks) hook?.cleanup?.(); },
    async flush() {
      for (let i = 0; i < 30; i++) {
        if (dirty) render();
        const queued = effects; effects = []; queued.forEach(fn => fn());
        await new Promise(resolve => setImmediate(resolve));
        if (!dirty && effects.length === 0) return;
      }
      throw new Error('Hook failed to settle');
    },
  };
}

test('cached local sync markers never skip server registration after restart or login', async () => {
  const hook = mountHook({ initialStorage: [['ocs_active_fcm_token', 'device-token'], ['ocs_fcm_synced_A', 'device-token']] });
  await hook.flush();
  assert.deepEqual(hook.calls, ['device-token']);
  assert.equal(hook.result.isPushActive, true);
  assert.equal(hook.storage.has('ocs_fcm_synced_A'), false);
  hook.unmount();
});

test('failed registration stays inactive and retries on reconnect without a render loop', async () => {
  const hook = mountHook({ failRegistration: true });
  await hook.flush();
  assert.equal(hook.result.isPushActive, false);
  assert.equal(hook.calls.length, 1);
  assert.equal(hook.storage.has('ocs_active_fcm_token'), false);
  hook.setFailure(false);
  hook.dispatch('online');
  await hook.flush();
  assert.equal(hook.calls.length, 2);
  assert.equal(hook.result.isPushActive, true);
  hook.unmount();
});

test('an old account registration cannot overwrite the current account after an async token lookup', async () => {
  let resolveOld;
  let requests = 0;
  const hook = mountHook({ getToken: () => ++requests === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve('B-token') });
  await hook.flush();
  hook.rerender({ userId: 'B' });
  await hook.flush();
  resolveOld('A-token');
  await hook.flush();
  assert.deepEqual(hook.calls, ['B-token']);
  assert.equal(hook.result.fcmToken, 'B-token');
  assert.equal(hook.storage.get('ocs_active_fcm_token'), 'B-token');
  hook.unmount();
});

test('worker messages refresh only the current recipient and do not create duplicate notifications', async () => {
  let received = 0;
  const hook = mountHook({ options: { onForegroundMessage: () => received++ } });
  await hook.flush();
  hook.message({ type: 'ocs:push', payload: { data: { recipientAccountId: 'B' } } });
  hook.message({ type: 'unrelated', payload: {} });
  hook.message({ type: 'ocs:push', payload: { data: { recipientAccountId: 'A' } } });
  assert.equal(received, 1);
  hook.unmount();
  hook.message({ type: 'ocs:push', payload: {} });
  assert.equal(received, 1);
});

test('test notification requires a successful FCM dispatch and never fabricates a local notification', async () => {
  const failed = mountHook({ testResult: { pushDelivery: { successCount: 0 } } });
  await failed.flush();
  await assert.rejects(failed.result.sendTestNotification(), /FCM/);
  failed.unmount();
  const sent = mountHook({ testResult: { pushDelivery: { successCount: 1 } } });
  await sent.flush();
  assert.equal((await sent.result.sendTestNotification()).pushDelivery.successCount, 1);
  sent.unmount();
});

for (const clientCount of [0, 1, 2]) {
  test(`worker displays one notification and forwards payload to ${clientCount} open tabs`, async () => {
    const handlers = {}, shown = [], messages = [];
    const self = {
      addEventListener: (type, fn) => { handlers[type] = fn; },
      clients: { matchAll: async () => Array.from({ length: clientCount }, () => ({ postMessage: message => messages.push(message) })) },
      registration: { showNotification: async (...args) => shown.push(args) },
    };
    vm.runInNewContext(readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8'), { self, URL });
    let pending;
    const payload = { notification: { title: 'Test', body: 'Body' }, data: { notificationId: 'notification-1' } };
    handlers.push({ data: { json: () => payload }, waitUntil: task => { pending = task; } });
    await pending;
    assert.equal(shown.length, 1);
    assert.equal(shown[0][0], 'Test');
    assert.equal(shown[0][1].tag, 'notification-1');
    assert.equal(messages.length, clientCount);
    for (const message of messages) { assert.equal(message.type, 'ocs:push'); assert.equal(message.payload, payload); }
  });
}
