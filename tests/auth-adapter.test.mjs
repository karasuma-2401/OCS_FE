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

function extractFieldError(errors, field) {
  if (!errors) return undefined;
  const lowerField = field.toLowerCase();
  for (const [key, messages] of Object.entries(errors)) {
    if (key.toLowerCase() === lowerField && Array.isArray(messages) && messages.length > 0) {
      return messages[0];
    }
  }
  return undefined;
}

// Validation logic matching src/utils/validation.ts
function validateFullName(name) {
  if (!name || name.trim().length === 0) {
    return 'Vui lòng nhập họ và tên.';
  }
  const trimmed = name.trim();
  if (trimmed.length > 150) {
    return 'Họ và tên không được vượt quá 150 ký tự.';
  }
  return null;
}

function validateEmail(email) {
  if (!email || email.trim().length === 0) {
    return 'Vui lòng nhập địa chỉ email.';
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return 'Địa chỉ email không được vượt quá 254 ký tự.';
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  return null;
}

function validatePhoneNumber(phone) {
  if (!phone || phone.trim().length === 0) {
    return 'Vui lòng nhập số điện thoại.';
  }
  const trimmed = phone.trim();
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(trimmed)) {
    return 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).';
  }
  return null;
}

function validatePasswordPolicy(password) {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }

  const charCount = Array.from(password).length;
  if (charCount < 8 || charCount > 70) {
    return 'Mật khẩu phải từ 8 đến 70 ký tự.';
  }

  const utf8Bytes = new TextEncoder().encode(password).length;
  if (utf8Bytes > 72) {
    return 'Mật khẩu không được vượt quá 72 byte UTF-8.';
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigitOrSpecial = /[\d\W]/.test(password);

  if (!hasLower || !hasUpper || !hasDigitOrSpecial) {
    return 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt.';
  }

  return null;
}

function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận lại mật khẩu.';
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.';
  }
  return null;
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

// Tests
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

test('extractFieldError performs case-insensitive field matching on errors dict', () => {
  const errors = {
    Email: ['Địa chỉ email đã được sử dụng.'],
    Password: ['Mật khẩu không đạt độ phức tạp.'],
    fullName: ['Họ và tên không được để trống.'],
  };

  assert.strictEqual(extractFieldError(errors, 'email'), 'Địa chỉ email đã được sử dụng.');
  assert.strictEqual(extractFieldError(errors, 'EMAIL'), 'Địa chỉ email đã được sử dụng.');
  assert.strictEqual(extractFieldError(errors, 'FullName'), 'Họ và tên không được để trống.');
  assert.strictEqual(extractFieldError(errors, 'phoneNumber'), undefined);
  assert.strictEqual(extractFieldError(undefined, 'email'), undefined);
});

test('validateFullName enforces length and non-empty checks', () => {
  assert.strictEqual(validateFullName(''), 'Vui lòng nhập họ và tên.');
  assert.strictEqual(validateFullName('   '), 'Vui lòng nhập họ và tên.');
  assert.strictEqual(validateFullName('a'.repeat(151)), 'Họ và tên không được vượt quá 150 ký tự.');
  assert.strictEqual(validateFullName('Nguyễn Văn A'), null);
});

test('validateEmail validates format and maximum length', () => {
  assert.strictEqual(validateEmail(''), 'Vui lòng nhập địa chỉ email.');
  assert.strictEqual(validateEmail('invalid-email'), 'Địa chỉ email không đúng định dạng.');
  assert.strictEqual(validateEmail('@no-local.com'), 'Địa chỉ email không đúng định dạng.');
  assert.strictEqual(validateEmail('user@'), 'Địa chỉ email không đúng định dạng.');
  assert.strictEqual(validateEmail('valid.user@example.com'), null);
  assert.strictEqual(validateEmail('  valid.user@example.com  '), null);
});

test('validatePhoneNumber enforces Vietnam 10-digit format starting with 0', () => {
  assert.strictEqual(validatePhoneNumber(''), 'Vui lòng nhập số điện thoại.');
  assert.strictEqual(validatePhoneNumber('1234567890'), 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).');
  assert.strictEqual(validatePhoneNumber('091234567'), 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).');
  assert.strictEqual(validatePhoneNumber('09123456789'), 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).');
  assert.strictEqual(validatePhoneNumber('091234abcd'), 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).');
  assert.strictEqual(validatePhoneNumber('0912345678'), null);
  assert.strictEqual(validatePhoneNumber('  0912345678  '), null);
});

test('validatePasswordPolicy checks 8-70 chars, 72 bytes UTF-8, and complexity', () => {
  assert.strictEqual(validatePasswordPolicy(''), 'Vui lòng nhập mật khẩu.');
  assert.strictEqual(validatePasswordPolicy('Short1!'), 'Mật khẩu phải từ 8 đến 70 ký tự.');
  assert.strictEqual(validatePasswordPolicy('a'.repeat(71)), 'Mật khẩu phải từ 8 đến 70 ký tự.');

  // UTF-8 byte boundary: 25 characters of 3-byte Chinese characters = 75 bytes > 72 bytes
  const longUtf8Password = '密'.repeat(25) + 'A1!'; // 25*3 + 3 = 78 bytes, charCount = 28 (< 70)
  assert.strictEqual(validatePasswordPolicy(longUtf8Password), 'Mật khẩu không được vượt quá 72 byte UTF-8.');

  // Missing complexity
  assert.strictEqual(validatePasswordPolicy('alllowercase1!'), 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt.');
  assert.strictEqual(validatePasswordPolicy('ALLUPPERCASE1!'), 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt.');
  assert.strictEqual(validatePasswordPolicy('NoDigitOrSpecial'), 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt.');

  // Valid passwords
  assert.strictEqual(validatePasswordPolicy('Password123@'), null);
  assert.strictEqual(validatePasswordPolicy('P@ssw0rdSecure'), null);
});

test('validateConfirmPassword enforces exact match', () => {
  assert.strictEqual(validateConfirmPassword('Pass123@', ''), 'Vui lòng xác nhận lại mật khẩu.');
  assert.strictEqual(validateConfirmPassword('Pass123@', 'Pass123#'), 'Mật khẩu xác nhận không khớp.');
  assert.strictEqual(validateConfirmPassword('Pass123@', 'Pass123@'), null);
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
