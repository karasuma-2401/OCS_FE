import test from 'node:test';
import assert from 'node:assert';

// Test ProblemDetails parsing logic matching parseProblemDetails in src/api/auth.ts
function parseProblemDetails(error) {
  if (error?.isAxiosError && error.response?.data) {
    const data = error.response.data;
    return {
      type: typeof data.type === 'string' ? data.type : undefined,
      title: typeof data.title === 'string' ? data.title : undefined,
      status: typeof data.status === 'number' ? data.status : error.response.status,
      detail: typeof data.detail === 'string' ? data.detail : undefined,
      code: typeof data.code === 'string' ? data.code : undefined,
      traceId: typeof data.traceId === 'string' ? data.traceId : undefined,
      errors: data.errors && typeof data.errors === 'object' ? data.errors : undefined,
      lockoutEndAt: typeof data.lockoutEndAt === 'string' ? data.lockoutEndAt : undefined,
      retryAfterSeconds: typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
      continuationToken: typeof data.continuationToken === 'string' ? data.continuationToken : undefined,
      email: typeof data.email === 'string' ? data.email : undefined,
    };
  }

  if (error?.isAxiosError && !error.response) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      title: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.',
    };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    title: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.',
  };
}

// Test Safe Return Path logic matching ProtectedRoute and LoginPage
function getSafeReturnPath(candidate, defaultPath = '/') {
  if (
    typeof candidate === 'string' &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !candidate.includes('\\')
  ) {
    return candidate;
  }
  return defaultPath;
}

// Test Role Authorization logic matching ProtectedRoute
function isAuthorized(userRoles, allowedRoles) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some((role) => allowedRoles.includes(role));
}

test('parseProblemDetails correctly extracts RFC 7807 fields from API error', () => {
  const axiosError = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        type: 'https://httpstatuses.com/400',
        title: 'Validation failed',
        code: 'VALIDATION_FAILED',
        traceId: '00-trace-123',
        errors: {
          email: ['Email không hợp lệ.'],
        },
      },
    },
  };

  const parsed = parseProblemDetails(axiosError);
  assert.strictEqual(parsed.status, 400);
  assert.strictEqual(parsed.code, 'VALIDATION_FAILED');
  assert.strictEqual(parsed.title, 'Validation failed');
  assert.strictEqual(parsed.traceId, '00-trace-123');
  assert.deepStrictEqual(parsed.errors.email, ['Email không hợp lệ.']);
});

test('parseProblemDetails correctly handles temporary lockout response with retryAfterSeconds', () => {
  const lockoutError = {
    isAxiosError: true,
    response: {
      status: 403,
      data: {
        title: 'Tài khoản đang bị tạm khóa.',
        code: 'AUTH.ACCOUNT_LOCKED',
        lockoutEndAt: '2026-11-03T18:00:00Z',
        retryAfterSeconds: 900,
      },
    },
  };

  const parsed = parseProblemDetails(lockoutError);
  assert.strictEqual(parsed.status, 403);
  assert.strictEqual(parsed.code, 'AUTH.ACCOUNT_LOCKED');
  assert.strictEqual(parsed.retryAfterSeconds, 900);
  assert.strictEqual(parsed.lockoutEndAt, '2026-11-03T18:00:00Z');
});

test('parseProblemDetails correctly handles pending activation with continuationToken', () => {
  const pendingError = {
    isAxiosError: true,
    response: {
      status: 403,
      data: {
        title: 'Tài khoản chưa được kích hoạt.',
        code: 'AUTH.ACCOUNT_PENDING_ACTIVATION',
        continuationToken: 'test-continuation-token',
        email: 't***@example.com',
      },
    },
  };

  const parsed = parseProblemDetails(pendingError);
  assert.strictEqual(parsed.status, 403);
  assert.strictEqual(parsed.code, 'AUTH.ACCOUNT_PENDING_ACTIVATION');
  assert.strictEqual(parsed.continuationToken, 'test-continuation-token');
  assert.strictEqual(parsed.email, 't***@example.com');
});

test('parseProblemDetails maps network connection errors cleanly without crashing', () => {
  const networkError = {
    isAxiosError: true,
    response: undefined,
  };

  const parsed = parseProblemDetails(networkError);
  assert.strictEqual(parsed.status, 0);
  assert.strictEqual(parsed.code, 'NETWORK_ERROR');
  assert.ok(parsed.title.includes('kết nối'));
});

test('Safe return path allows valid internal paths and query strings', () => {
  assert.strictEqual(getSafeReturnPath('/admin'), '/admin');
  assert.strictEqual(getSafeReturnPath('/admin/pos'), '/admin/pos');
  assert.strictEqual(getSafeReturnPath('/catalog?category=denim'), '/catalog?category=denim');
});

test('Safe return path rejects dangerous open-redirect targets', () => {
  assert.strictEqual(getSafeReturnPath('//evil.com/hack', '/'), '/');
  assert.strictEqual(getSafeReturnPath('https://evil.com', '/'), '/');
  assert.strictEqual(getSafeReturnPath('\\evil.com', '/'), '/');
  assert.strictEqual(getSafeReturnPath('javascript:alert(1)', '/'), '/');
  assert.strictEqual(getSafeReturnPath('', '/'), '/');
  assert.strictEqual(getSafeReturnPath(null, '/'), '/');
});

test('Role authorization enforces exact role codes', () => {
  assert.strictEqual(isAuthorized(['Admin'], ['Admin', 'Manager']), true);
  assert.strictEqual(isAuthorized(['Manager'], ['Admin', 'Manager']), true);
  assert.strictEqual(isAuthorized(['Staff'], ['Admin', 'Manager']), false);
  assert.strictEqual(isAuthorized(['Staff'], ['Admin', 'Manager', 'Staff']), true);
  assert.strictEqual(isAuthorized(['Customer'], ['Admin', 'Manager', 'Staff']), false);
  assert.strictEqual(isAuthorized([], ['Customer']), false);
  assert.strictEqual(isAuthorized(['Customer'], []), true); // Public route
});

