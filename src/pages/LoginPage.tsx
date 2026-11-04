import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { parseProblemDetails, extractFieldError } from '@/api/auth';
import { validateEmail } from '@/utils/validation';
import { Card, Form, Input, Button, Toast } from '@/components/shared';
import { LogIn } from 'lucide-react';

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

  // Helper: determine safe return path or default based on role hierarchy
  const getSafeDestination = (roles: string[]): string => {
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

    // Role priority: Admin / Manager -> /admin, Staff -> /admin/pos, Customer -> /
    if (roles.includes('Admin') || roles.includes('Manager')) {
      return '/admin';
    }
    if (roles.includes('Staff')) {
      return '/admin/pos';
    }
    return '/';
  };

  // If already authenticated, redirect
  if (isAuthenticated && user) {
    const destination = getSafeDestination(user.roles);
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

      const destination = getSafeDestination(response.user.roles);
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
        const remainingMinutes = problem.retryAfterSeconds
          ? Math.ceil(problem.retryAfterSeconds / 60)
          : 15;
        setFormError(
          `Tài khoản đang bị tạm khóa do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMinutes} phút.`
        );
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
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-accent mb-3 font-black text-lg shadow-sm">
            OCS
          </div>
          <h1 className="text-2xl font-black text-ink">Đăng nhập tài khoản</h1>
          <p className="mt-1 text-sm text-muted">
            Sử dụng email và mật khẩu của bạn để truy cập hệ thống
          </p>
        </div>

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

        <Form onSubmit={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
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
            placeholder="ban@example.com"
            required
            autoComplete="email"
            error={fieldErrors.email}
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
            autoComplete="current-password"
            error={fieldErrors.password}
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <LogIn size={16} className="mr-2" />
            Đăng nhập
          </Button>
        </Form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-sm text-muted">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-bold text-accent-dark hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
