import React, { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { parseProblemDetails } from '@/api/auth';
import { Card, Input, Button, Toast } from '@/components/shared';
import { LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine safe redirect destination
  const getSafeRedirectUrl = (roles: string[]): string => {
    const searchParams = new URLSearchParams(location.search);
    const fromQuery = searchParams.get('from');
    const fromState = (location.state as { from?: { pathname?: string; search?: string } })?.from;
    const candidatePath = fromQuery || (fromState?.pathname ? `${fromState.pathname}${fromState.search || ''}` : null);

    if (
      candidatePath &&
      candidatePath.startsWith('/') &&
      !candidatePath.startsWith('//') &&
      !candidatePath.includes('\\')
    ) {
      return candidatePath;
    }

    // Role-based default destination
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
    const targetUrl = getSafeRedirectUrl(user.roles);
    return <Navigate to={targetUrl} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      const response = await login({ email: trimmedEmail, password });

      // Navigate to destination
      const targetUrl = getSafeRedirectUrl(response.user.roles);
      navigate(targetUrl, { replace: true });
    } catch (err: unknown) {
      const problem = parseProblemDetails(err);

      if (problem.code === 'AUTH.ACCOUNT_PENDING_ACTIVATION') {
        // Redirect to OTP verification with continuation token
        navigate('/verify-otp', {
          state: {
            continuationToken: problem.continuationToken,
            email: problem.email || trimmedEmail,
          },
          replace: true,
        });
        return;
      }

      if (problem.code === 'AUTH.ACCOUNT_LOCKED') {
        const remainingMinutes = problem.retryAfterSeconds
          ? Math.ceil(problem.retryAfterSeconds / 60)
          : 15;
        setErrorMessage(
          `Tài khoản đã bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau ${remainingMinutes} phút.`
        );
        return;
      }

      if (problem.status === 401 || problem.code === 'AUTH.INVALID_CREDENTIALS') {
        setErrorMessage('Email hoặc mật khẩu không chính xác.');
        return;
      }

      setErrorMessage(problem.title || 'Đăng nhập không thành công. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-accent mb-3 font-black text-lg">
            OCS
          </div>
          <h1 className="text-2xl font-black text-ink">Đăng nhập tài khoản</h1>
          <p className="mt-1 text-sm text-muted">
            Sử dụng email và mật khẩu của bạn để truy cập hệ thống
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4">
            <Toast
              variant="error"
              title="Lỗi đăng nhập"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Địa chỉ Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@example.com"
            required
            autoComplete="email"
            disabled={loading}
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={loading}
          />

          <Button type="submit" className="w-full mt-2" loading={loading} disabled={loading}>
            <LogIn size={16} className="mr-2" />
            Đăng nhập
          </Button>
        </form>

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
