/**
 * Validation utilities matching OCS Backend / API Contract specifications.
 */

export function validateFullName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Vui lòng nhập họ và tên.';
  }
  const trimmed = name.trim();
  if (trimmed.length > 150) {
    return 'Họ và tên không được vượt quá 150 ký tự.';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'Vui lòng nhập địa chỉ email.';
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return 'Địa chỉ email không được vượt quá 254 ký tự.';
  }
  // Standard ASCII email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  return null;
}

export function validatePhoneNumber(phone: string): string | null {
  if (!phone || phone.trim().length === 0) {
    return 'Vui lòng nhập số điện thoại.';
  }
  const trimmed = phone.trim();
  // Vietnam phone number: exactly 10 digits starting with 0
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(trimmed)) {
    return 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng số 0).';
  }
  return null;
}

export function getPasswordRequirements(password: string) {
  return {
    // The backend's regex counts UTF-16 code units, as JavaScript string length does.
    validLength: password.length >= 8 && password.length <= 70,
    withinByteLimit: new TextEncoder().encode(password).length <= 72,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    // .NET matches UTF-16 surrogates as non-word characters, even in astral letters.
    hasDigitOrSpecial: /[\uD800-\uDFFF]/.test(password) || /(?:\p{Nd}|[^\p{L}\p{Mn}\p{Nd}\p{Pc}])/u.test(password),
  };
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }

  const requirements = getPasswordRequirements(password);
  if (!requirements.validLength) {
    return 'Mật khẩu phải từ 8 đến 70 ký tự.';
  }

  // Check UTF-8 byte length (BCrypt limit is 72 bytes)
  if (!requirements.withinByteLimit) {
    return 'Mật khẩu không được vượt quá 72 byte UTF-8.';
  }

  // Password complexity: at least 1 lowercase, 1 uppercase, and 1 digit or special char
  if (!requirements.hasLower || !requirements.hasUpper || !requirements.hasDigitOrSpecial) {
    return 'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt.';
  }

  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận lại mật khẩu.';
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.';
  }
  return null;
}

