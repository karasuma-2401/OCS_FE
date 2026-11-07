import { authStyles } from '@/components/layout/authStyles';
import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { parseProblemDetails, extractFieldError } from '@/api/auth';
import { validateEmail } from '@/utils/validation';
import { Form, Input, PasswordInput, Button, Toast } from '@/components/shared';
import { ArrowRight } from 'lucide-react';
import { firstAllowedScreen } from '@/auth/permissions';
import type { User } from '@/types';

interface FieldErrors {
  email?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Use the current permission set to choose an accessible landing screen.
  const getSafeDestination = (account: User): string => {
    const searchParams = new URLSearchParams(location.search);
    const fromQuery = searchParams.get('from');
    const fromState = (location.state as { from?: { pathname?: string; search?: string } })?.from;
    const candidate = fromQuery || (fromState?.pathname ? `${fromState.pathname}${fromState.search || ''}` : null);

    if (
      candidate &&
      candidate.startsWith('/') &&
      !candidate.startsWith('//') &&
      !candidate.includes('\\')
    ) {
      return candidate;
    }

    return firstAllowedScreen(account.permissions ?? []) ?? '/';
  };

  // If already authenticated, redirect
  if (isAuthenticated && user) {
    const destination = getSafeDestination(user);
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const errors: FieldErrors = {};

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      errors.email = emailError;
    }

    // Validate password (required check, no trimming)
    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const response = await login({ email: trimmedEmail, password });

      const destination = getSafeDestination(response.user);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const problem = parseProblemDetails(err);

      // 403: Account Pending Activation -> navigate to OTP challenge screen
      if (problem.code === 'AUTH.ACCOUNT_PENDING_ACTIVATION') {
        navigate('/verify-otp', {
          state: {
            challengeId: problem.challengeId,
            maskedDestination: problem.maskedDestination,
            expiresAt: problem.expiresAt,
            resendAvailableAt: problem.resendAvailableAt,
            continuationToken: problem.continuationToken,
            email: problem.email || email.trim(),
          },
          replace: true,
        });
        return;
      }

      // 403: Account Locked (temporary or admin)
      if (problem.code === 'AUTH.ACCOUNT_LOCKED') {
        setFormError(problem.retryAfterSeconds
          ? `Tài khoản đang bị tạm khóa. Vui lòng thử lại sau ${Math.ceil(problem.retryAfterSeconds / 60)} phút.`
          : 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
        return;
      }

      // 403: Account Deactivated
      if (problem.code === 'AUTH.ACCOUNT_DEACTIVATED') {
        setFormError('Tài khoản đã bị ngừng hoạt động. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
        return;
      }

      // 401: Invalid credentials
      if (problem.status === 401 || problem.code === 'AUTH.INVALID_CREDENTIALS') {
        setFormError('Email hoặc mật khẩu không chính xác.');
        return;
      }

      // 400: Validation failed from backend
      if (problem.code === 'VALIDATION_FAILED' && problem.errors) {
        const serverFieldErrors: FieldErrors = {};
        const emailErr = extractFieldError(problem.errors, 'email');
        const passErr = extractFieldError(problem.errors, 'password');

        if (emailErr) serverFieldErrors.email = emailErr;
        if (passErr) serverFieldErrors.password = passErr;

        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors);
          return;
        }
      }

      if (problem.code === 'AUTH.RESEND_COOLDOWN') {
        setFormError(`Vui lòng đợi ${problem.retryAfterSeconds || 60} giây trước khi yêu cầu mã xác thực mới.`);
        return;
      }

      // 429: Rate limited
      if (problem.status === 429 || problem.code === 'AUTH.RATE_LIMITED') {
        setFormError('Quá nhiều yêu cầu đăng nhập từ thiết bị của bạn. Vui lòng thử lại sau ít phút.');
        return;
      }

      // Network error
      if (problem.code === 'NETWORK_ERROR') {
        setFormError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
        return;
      }

      // Fallback
      setFormError(problem.title || 'Đăng nhập không thành công. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
        <div className={authStyles.eyebrow}>CHÀO MỪNG BẠN TRỞ LẠI</div>
        <h1 className={authStyles.title}>Đăng nhập</h1>
        <p className={authStyles.description}>
          Đăng nhập để tiếp tục khám phá cùng OCS.
        </p>

        {formError && (
          <div className="mb-4">
            <Toast
              variant="error"
              title="Lỗi đăng nhập"
              message={formError}
              onClose={() => setFormError(null)}
            />
          </div>
        )}

        <Form className={authStyles.form} onSubmit={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
          <Input
            label="Địa chỉ email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="ban@example.com"
            required
            autoComplete="email"
            error={fieldErrors.email}
            disabled={isSubmitting}
          />

          <PasswordInput
            label="Mật khẩu"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          <div className="text-right"><Link className={`${authStyles.link} text-sm`} to="/forgot-password">Quên mật khẩu?</Link></div>

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={isSubmitting}
            endIcon={<ArrowRight size={16} aria-hidden="true" />}
          >
            Đăng nhập
          </Button>
        </Form>

        <div className={authStyles.footer}>
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register">
              Đăng ký ngay
            </Link>
          </p>
        </div>
    </div>
  );
};
