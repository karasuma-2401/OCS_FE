import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { register, parseProblemDetails, extractFieldError } from '@/api/auth';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePasswordPolicy,
  validateConfirmPassword,
} from '@/utils/validation';
import { Card, Form, Input, Button, Toast } from '@/components/shared';
import { UserPlus } from 'lucide-react';

interface RegisterFieldErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
}

export const RegisterPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const errors: RegisterFieldErrors = {};

    // Validate inputs
    const nameError = validateFullName(fullName);
    if (nameError) errors.fullName = nameError;

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const phoneError = validatePhoneNumber(phoneNumber);
    if (phoneError) errors.phoneNumber = phoneError;

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) errors.password = passwordError;

    const confirmError = validateConfirmPassword(password, confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      });

      // Account is in PendingActivation state. Transition directly to OTP verification screen.
      navigate('/verify-otp', {
        state: {
          challengeId: response.challengeId,
          email: email.trim(),
          maskedDestination: response.maskedDestination,
          expiresAt: response.expiresAt,
          resendAvailableAt: response.resendAvailableAt,
          continuationToken: response.continuationToken,
        },
        replace: true,
      });
    } catch (err: unknown) {
      const problem = parseProblemDetails(err);

      // 409: Email already exists (Anti-enumeration uniform message)
      if (problem.status === 409 || problem.code === 'AUTH.EMAIL_EXISTS') {
        setFormError(
          'Không thể hoàn tất đăng ký với địa chỉ email này. Nếu bạn đã có tài khoản, vui lòng đăng nhập hoặc yêu cầu hỗ trợ.'
        );
        return;
      }

      // 400: Validation failed from backend
      if (problem.code === 'VALIDATION_FAILED' && problem.errors) {
        const serverFieldErrors: RegisterFieldErrors = {};
        const nameErr = extractFieldError(problem.errors, 'fullName');
        const emailErr = extractFieldError(problem.errors, 'email');
        const phoneErr = extractFieldError(problem.errors, 'phoneNumber');
        const passErr = extractFieldError(problem.errors, 'password');

        if (nameErr) serverFieldErrors.fullName = nameErr;
        if (emailErr) serverFieldErrors.email = emailErr;
        if (phoneErr) serverFieldErrors.phoneNumber = phoneErr;
        if (passErr) serverFieldErrors.password = passErr;

        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors);
          return;
        }
      }

      // 429: Rate limited
      if (problem.status === 429 || problem.code === 'AUTH.RATE_LIMITED') {
        setFormError('Vượt quá số lần gửi mã xác thực. Vui lòng thử lại sau.');
        return;
      }

      // 503: Email service unavailable
      if (problem.status === 503 || problem.code === 'AUTH.DELIVERY_UNAVAILABLE') {
        setFormError(
          'Dịch vụ gửi email xác thực gặp sự cố tạm thời. Tài khoản đang chờ kích hoạt; hãy đăng nhập lại sau để yêu cầu mã mới.'
        );
        return;
      }

      // Network error
      if (problem.code === 'NETWORK_ERROR') {
        setFormError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
        return;
      }

      // Fallback
      setFormError(problem.title || 'Đăng ký không thành công. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-lg p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight mb-3 shadow-sm">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-black text-ink">Đăng ký tài khoản</h1>
          <p className="mt-1 text-sm text-muted">
            Tạo tài khoản khách hàng để trải nghiệm mua sắm và ký gửi quần áo cùng OCS
          </p>
        </div>

        {formError && (
          <div className="mb-4">
            <Toast
              variant="error"
              title="Lỗi đăng ký"
              message={formError}
              onClose={() => setFormError(null)}
            />
          </div>
        )}

        <Form onSubmit={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
          <Input
            label="Họ và tên"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }
            }}
            placeholder="Nguyễn Văn A"
            required
            autoComplete="name"
            error={fieldErrors.fullName}
            disabled={isSubmitting}
          />

          <Input
            label="Địa chỉ Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="nguyenvana@example.com"
            required
            autoComplete="email"
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          <Input
            label="Số điện thoại"
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (fieldErrors.phoneNumber) {
                setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
              }
            }}
            placeholder="0912345678"
            required
            autoComplete="tel"
            helperText="Số điện thoại gồm 10 chữ số tại Việt Nam"
            error={fieldErrors.phoneNumber}
            disabled={isSubmitting}
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            helperText="Từ 8–70 ký tự, gồm ít nhất một chữ hoa, một chữ thường và một chữ số hoặc ký tự đặc biệt"
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          <Input
            label="Xác nhận mật khẩu"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            className="w-full mt-4"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Đăng ký tài khoản
          </Button>
        </Form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-sm text-muted">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-accent-dark hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
