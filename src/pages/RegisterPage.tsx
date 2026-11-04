import React, { useId, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { register, parseProblemDetails, extractFieldError } from '@/api/auth';
import {
  validateFullName,
  validateEmail,
  validatePhoneNumber,
  validatePasswordPolicy,
  getPasswordRequirements,
  validateConfirmPassword,
} from '@/utils/validation';
import { Form, Input, Button, Toast } from '@/components/shared';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';

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
  const passwordRequirementsId = useId();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRequirements = getPasswordRequirements(password);
  const passwordChecklist = [
    { label: 'Từ 8–70 ký tự, tối đa 72 byte UTF-8', met: passwordRequirements.validLength && passwordRequirements.withinByteLimit },
    { label: 'Ít nhất một chữ hoa (A–Z)', met: passwordRequirements.hasUpper },
    { label: 'Ít nhất một chữ thường (a–z)', met: passwordRequirements.hasLower },
    { label: 'Ít nhất một chữ số hoặc ký tự đặc biệt', met: passwordRequirements.hasDigitOrSpecial },
  ];

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
    <div>
        <div className="auth-panel__eyebrow">BẮT ĐẦU CÙNG OCS</div>
        <h1 className="auth-panel__title">Tạo tài khoản</h1>
        <p className="auth-panel__description">
          Tạo tài khoản để bắt đầu hành trình cùng OCS.
        </p>

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

        <Form className="auth-form" onSubmit={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
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
            label="Địa chỉ email"
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

          <div className="auth-password-field">
          <Input
            label="Mật khẩu"
            type={showPassword ? 'text' : 'password'}
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
            aria-describedby={passwordRequirementsId}
            error={fieldErrors.password}
            disabled={isSubmitting}
            endAdornment={
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} disabled={isSubmitting}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <ul id={passwordRequirementsId} className="auth-password-requirements" aria-label="Điều kiện mật khẩu">
            {passwordChecklist.map((requirement) => (
              <li key={requirement.label} className={requirement.met ? 'is-met' : undefined}>
                <span className="auth-password-requirements__icon" aria-hidden="true">{requirement.met && <Check size={11} strokeWidth={3} />}</span>
                <span><span className="sr-only">{requirement.met ? 'Đã đạt: ' : 'Chưa đạt: '}</span>{requirement.label}</span>
              </li>
            ))}
          </ul>
          </div>

          <Input
            label="Xác nhận mật khẩu"
            type={showConfirmPassword ? 'text' : 'password'}
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
            endAdornment={
              <button type="button" className="auth-password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'} aria-pressed={showConfirmPassword} disabled={isSubmitting}>
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            disabled={isSubmitting}
            endIcon={<ArrowRight size={16} aria-hidden="true" />}
          >
            Đăng ký tài khoản
          </Button>
        </Form>

        <div className="auth-panel__footer">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
    </div>
  );
};
