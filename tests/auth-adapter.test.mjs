import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function loadSource(relativePath, mocks = {}) {
  const filename = new URL(relativePath, import.meta.url);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}
const requests = [];
const client = { apiClient: { post: async (path, body) => { requests.push({ path, body }); return { data: {} }; } } };
const { parseProblemDetails, extractFieldError, verifyOtp, resendOtp } = loadSource('../src/api/auth.ts', { './client': client });
const { validateFullName, validateEmail, validatePhoneNumber, getPasswordRequirements, validatePasswordPolicy, validateConfirmPassword } = loadSource('../src/utils/validation.ts');

test('OTP API sends the current continuation token for verification and resend', async () => {
  requests.length = 0;
  await verifyOtp({ challengeId: 'challenge', continuationToken: 'credential', code: '123456' });
  await resendOtp({ challengeId: 'challenge', continuationToken: 'credential' });
  assert.deepStrictEqual(requests, [
    { path: '/auth/otp/verify', body: { challengeId: 'challenge', continuationToken: 'credential', code: '123456' } },
    { path: '/auth/otp/resend', body: { challengeId: 'challenge', continuationToken: 'credential' } },
  ]);
});

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

test('password checklist matches the backend rules at Unicode and UTF-8 boundaries', () => {
  assert.deepStrictEqual(getPasswordRequirements(''), {
    validLength: false, withinByteLimit: true, hasLower: false, hasUpper: false, hasDigitOrSpecial: false,
  });
  assert.strictEqual(getPasswordRequirements('Passwordé').hasDigitOrSpecial, false);
  assert.notStrictEqual(validatePasswordPolicy('Passwordé'), null);
  assert.strictEqual(getPasswordRequirements('Password١').hasDigitOrSpecial, true);
  assert.strictEqual(validatePasswordPolicy('Password١'), null);
  assert.strictEqual(validatePasswordPolicy('Password😀'), null);
  assert.strictEqual(validatePasswordPolicy('Password𐐀'), null);
  assert.strictEqual(getPasswordRequirements('A1' + '😀'.repeat(35)).validLength, false);
  assert.strictEqual(getPasswordRequirements('A1' + '密'.repeat(24)).withinByteLimit, false);
  assert.strictEqual(getPasswordRequirements('A1' + '密'.repeat(23) + 'a').withinByteLimit, true);
});

test('validateConfirmPassword enforces exact match', () => {
  assert.strictEqual(validateConfirmPassword('Pass123@', ''), 'Vui lòng xác nhận lại mật khẩu.');
  assert.strictEqual(validateConfirmPassword('Pass123@', 'Pass123#'), 'Mật khẩu xác nhận không khớp.');
  assert.strictEqual(validateConfirmPassword('Pass123@', 'Pass123@'), null);
});

test('parseProblemDetails maps OTP specific error codes cleanly', () => {
  const otpInvalidError = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        code: 'AUTH.OTP_INVALID',
        title: 'Mã OTP không chính xác.',
      },
    },
  };
  assert.strictEqual(parseProblemDetails(otpInvalidError).code, 'AUTH.OTP_INVALID');

  const otpExpiredError = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        code: 'AUTH.OTP_EXPIRED',
        title: 'Mã OTP đã hết hạn.',
      },
    },
  };
  assert.strictEqual(parseProblemDetails(otpExpiredError).code, 'AUTH.OTP_EXPIRED');

  const attemptsExceededError = {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        code: 'AUTH.OTP_ATTEMPTS_EXCEEDED',
        title: 'Đã vượt quá số lần thử OTP.',
      },
    },
  };
  assert.strictEqual(parseProblemDetails(attemptsExceededError).code, 'AUTH.OTP_ATTEMPTS_EXCEEDED');

  const deliveryError = {
    isAxiosError: true,
    response: {
      status: 503,
      data: {
        code: 'AUTH.DELIVERY_UNAVAILABLE',
        title: 'Dịch vụ gửi email không khả dụng.',
      },
    },
  };
  assert.strictEqual(parseProblemDetails(deliveryError).code, 'AUTH.DELIVERY_UNAVAILABLE');
});
