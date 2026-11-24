import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/components/notifications/notificationMeta.tsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
  },
}).outputText;

const moduleObject = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => {
    if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    return {};
  },
  moduleObject,
  moduleObject.exports,
);

const {
  extractNotificationHighlights,
  extractNotificationMetadata,
  formatHighlightChip,
  formatNotificationFullDateTime,
  getNotificationActionLabel,
  isNotificationToday,
  resolveNotificationTargetLink,
} = moduleObject.exports;

test('extractNotificationHighlights preserves full GUID-suffixed codes and VND amounts', () => {
  const text =
    'Phiếu BO-114b9425fe414969851f911c5e7dc5ba cho lịch APT-261117-1320 tổng 1.250.000đ đã hoàn tất.';
  assert.deepEqual(extractNotificationHighlights(text), [
    '#BO-114b9425fe414969851f911c5e7dc5ba',
    '#APT-261117-1320',
    '1.250.000đ',
  ]);
});

test('formatHighlightChip middle-ellipsizes long code chips while preserving full copyValue', () => {
  const longFormatted = formatHighlightChip('#BO-114b9425fe414969851f911c5e7dc5ba');
  assert.equal(longFormatted.isCode, true);
  assert.equal(longFormatted.copyValue, 'BO-114b9425fe414969851f911c5e7dc5ba');
  assert.equal(longFormatted.label, '#BO-114b9425…c5ba');

  const shortFormatted = formatHighlightChip('#APT-261117-1320');
  assert.equal(shortFormatted.isCode, true);
  assert.equal(shortFormatted.label, '#APT-261117-1320');
  assert.equal(shortFormatted.copyValue, 'APT-261117-1320');

  const moneyFormatted = formatHighlightChip('1.250.000đ');
  assert.equal(moneyFormatted.isCode, false);
  assert.equal(moneyFormatted.label, '1.250.000đ');
});

test('isNotificationToday accurately distinguishes today vs yesterday timestamps', () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  assert.equal(isNotificationToday(now.toISOString()), true);
  assert.equal(isNotificationToday(yesterday.toISOString()), false);
  assert.equal(isNotificationToday('invalid-date'), false);
});

test('resolveNotificationTargetLink maps staff Buyout links to /shop/buyouts', () => {
  assert.equal(
    resolveNotificationTargetLink({ category: 'Buyout', type: 0, title: '', content: '' }, true),
    '/shop/buyouts',
  );
  assert.equal(
    resolveNotificationTargetLink({ link: '/shop/buyout', category: 'Buyout', type: 0, title: '', content: '' }, true),
    '/shop/buyouts',
  );
  assert.equal(
    resolveNotificationTargetLink({ category: 'Appointment', type: 0, title: '', content: '' }, true),
    '/shop/consignment',
  );
  assert.equal(
    resolveNotificationTargetLink({ category: 'Buyout', type: 0, title: '', content: '' }, false),
    '/my-consignments',
  );
});

test('extractNotificationMetadata, getNotificationActionLabel, and formatNotificationFullDateTime work cleanly', () => {
  const meta = extractNotificationMetadata('Phiếu #BO-2026 giá trị 1.250.000đ đã duyệt');
  assert.deepEqual(meta.codes, ['#BO-2026']);
  assert.deepEqual(meta.amounts, ['1.250.000đ']);

  assert.equal(getNotificationActionLabel('Buyout', true), 'Mở phiếu thu mua');
  assert.equal(getNotificationActionLabel('Appointment', false), 'Xem lịch hẹn của tôi');
  assert.equal(formatNotificationFullDateTime('bad-date'), '');
  assert.match(formatNotificationFullDateTime('2026-11-24T07:30:00Z'), /\d{2}:\d{2} · /);
});
