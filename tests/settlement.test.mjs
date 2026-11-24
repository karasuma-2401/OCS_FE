import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const apiDir = fileURLToPath(new URL('../src/api/', import.meta.url));

function loadSettlementsModule() {
  const filename = path.join(apiDir, 'settlements.ts');
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

  const mockStorage = new Map();
  const mockLocalStorage = {
    getItem: (key) => mockStorage.get(key) ?? null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
  };

  // Mock global window & localStorage
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.window = { localStorage: mockLocalStorage };
  globalThis.localStorage = mockLocalStorage;

  const module = { exports: {} };
  const localRequire = (dependency) => {
    if (dependency === './client') {
      return {
        apiClient: {
          get: async () => {
            throw new Error('Fallback to local store');
          },
          post: async () => {
            throw new Error('Fallback to local store');
          },
        },
      };
    }
    return require(dependency);
  };

  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);

  return {
    ...module.exports,
    cleanup: () => {
      globalThis.window = originalWindow;
      globalThis.localStorage = originalLocalStorage;
    },
  };
}

test('calculateNetPayout calculates net payout accurately and clamps negative to zero', () => {
  const { calculateNetPayout, formatVnd, cleanup } = loadSettlementsModule();

  // Standard case: 5.000.000 revenue - 750.000 commission (15%) - 50.000 fee = 4.200.000
  assert.equal(calculateNetPayout(5000000, 750000, 50000), 4200000);

  // Zero revenue with fee: clamp to 0
  assert.equal(calculateNetPayout(0, 0, 50000), 0);

  // Exact match
  assert.equal(calculateNetPayout(100000, 80000, 20000), 0);

  // formatVnd helper
  const formatted = formatVnd(4200000);
  assert.ok(formatted.includes('4.200.000') || formatted.includes('4,200,000'));
  assert.ok(formatted.includes('₫'));

  cleanup();
});

test('settlementsApi lists, filters by query, and filters by status', async () => {
  const { settlementsApi, cleanup } = loadSettlementsModule();
  settlementsApi.resetStore();

  const all = await settlementsApi.list();
  assert.ok(Array.isArray(all));
  assert.ok(all.length >= 5);

  // Filter by status 'Pending'
  const pending = await settlementsApi.list({ status: 'Pending' });
  assert.ok(pending.length > 0);
  assert.ok(pending.every((item) => item.status === 'Pending'));

  // Filter by query customer phone
  const byPhone = await settlementsApi.list({ query: '0912345678' });
  assert.equal(byPhone.length, 1);
  assert.equal(byPhone[0].customerName, 'Nguyễn Thị Bích Phượng');

  // Filter by contract number
  const byContract = await settlementsApi.list({ query: 'HD-2026-0042' });
  assert.equal(byContract.length, 1);
  assert.equal(byContract[0].settlementNumber, 'QT-2026-001');

  // Filter by bank account
  const byBank = await settlementsApi.list({ query: '0071001234567' });
  assert.equal(byBank.length, 1);

  cleanup();
});

test('settlementsApi handles approval and rejection lifecycle with role auditing', async () => {
  const { settlementsApi, cleanup } = loadSettlementsModule();
  settlementsApi.resetStore();

  // Test Approve
  const approved = await settlementsApi.approve(
    'stl-001',
    { managerNote: 'Đã kiểm tra chứng từ và duyệt chi' },
    { id: 'mgr-01', fullName: 'Quản lý Trần Hữu Toàn' }
  );

  assert.equal(approved.status, 'Approved');
  assert.equal(approved.approval.approvedByEmployeeName, 'Quản lý Trần Hữu Toàn');
  assert.equal(approved.approval.managerNote, 'Đã kiểm tra chứng từ và duyệt chi');
  assert.ok(approved.approval.approvedAt);

  // Test Reject
  await assert.rejects(
    async () => {
      await settlementsApi.reject('stl-006', { rejectionReason: '' });
    },
    /Vui lòng nhập lý do từ chối/
  );

  const rejected = await settlementsApi.reject(
    'stl-006',
    { rejectionReason: 'Sai lệch số lượng hàng ký gửi' },
    { id: 'mgr-01', fullName: 'Quản lý Trần Hữu Toàn' }
  );

  assert.equal(rejected.status, 'Rejected');
  assert.equal(rejected.approval.rejectionReason, 'Sai lệch số lượng hàng ký gửi');
  assert.equal(rejected.approval.rejectedByEmployeeName, 'Quản lý Trần Hữu Toàn');

  cleanup();
});

test('settlementsApi records bank transfer, uploads receipt proof, and completes payout', async () => {
  const { settlementsApi, cleanup } = loadSettlementsModule();
  settlementsApi.resetStore();

  // Record transfer on stl-002
  const recorded = await settlementsApi.recordTransfer(
    'stl-002',
    {
      paymentMethod: 'BankTransfer',
      bankTransactionReference: 'FT261124888999',
      transferNote: 'Thanh toan quyet toan QT-2026-002',
      receiptDocument: {
        fileName: 'UNC_MB_002.jpg',
        fileType: 'image',
        fileSize: 154000,
        dataUrl: 'data:image/jpeg;base64,dGVzdA==',
      },
    },
    { id: 'staff-02', fullName: 'Kế toán Lê Quỳnh Mai' }
  );

  assert.equal(recorded.status, 'PaymentRecorded');
  assert.equal(recorded.payment.bankTransactionReference, 'FT261124888999');
  assert.equal(recorded.payment.paidByEmployeeName, 'Kế toán Lê Quỳnh Mai');
  assert.equal(recorded.documents.length, 1);
  assert.equal(recorded.documents[0].fileName, 'UNC_MB_002.jpg');

  // Complete settlement
  const completed = await settlementsApi.complete('stl-002', { fullName: 'Giám đốc' });
  assert.equal(completed.status, 'Completed');
  assert.ok(completed.notes?.includes('Đã hoàn tất đối soát'));

  // Document add and remove
  const withExtraDoc = await settlementsApi.addDocument('stl-002', {
    fileName: 'hoa_don_vat.pdf',
    fileType: 'pdf',
    fileSize: 200000,
    dataUrl: 'data:application/pdf;base64,dGVzdA==',
    uploadedByName: 'Kế toán',
    documentType: 'SettlementSheet',
  });

  assert.equal(withExtraDoc.documents.length, 2);
  const extraDocId = withExtraDoc.documents[1].id;

  const afterRemoval = await settlementsApi.removeDocument('stl-002', extraDocId);
  assert.equal(afterRemoval.documents.length, 1);

  cleanup();
});
