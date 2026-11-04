import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp, parseProblemDetails } from '@/api/auth';
import { Card, Button, Toast } from '@/components/shared';
import { MailCheck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

interface OtpLocationState {
  challengeId?: string;
  email?: string;
  maskedDestination?: string;
  expiresAt?: string;
  resendAvailableAt?: string;
  continuationToken?: string;
}

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as OtpLocationState) || {};

  // Challenge metadata
  const [challengeId, setChallengeId] = useState<string | undefined>(state.challengeId);
  const [maskedDestination, setMaskedDestination] = useState<string | undefined>(
    state.maskedDestination || (state.email ? maskEmail(state.email) : undefined)
  );
  const [expiresAt, setExpiresAt] = useState<string | undefined>(state.expiresAt);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | undefined>(state.resendAvailableAt);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(state.continuationToken);

  // 6-digit OTP input state
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Action states
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Time ticker for timestamp-based countdowns (updates every 1 second)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate remaining seconds for challenge expiration
  const expirySecondsRemaining = useMemo(() => {
    if (!expiresAt) return 0;
    const target = new Date(expiresAt).getTime();
    return Math.max(0, Math.floor((target - currentTime) / 1000));
  }, [expiresAt, currentTime]);

  // Calculate remaining seconds for resend cooldown
  const cooldownSecondsRemaining = useMemo(() => {
    if (!resendAvailableAt) return 0;
    const target = new Date(resendAvailableAt).getTime();
    return Math.max(0, Math.floor((target - currentTime) / 1000));
  }, [resendAvailableAt, currentTime]);

  // Auto-focus first input on load
  useEffect(() => {
    if (challengeId && !isSuccess) {
      inputRefs.current[0]?.focus();
    }
  }, [challengeId, isSuccess]);

  // Helpers
  function maskEmail(email: string): string {
    const atIndex = email.indexOf('@');
    if (atIndex <= 1) return email;
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    if (local.length <= 2) {
      return `${local[0]}***${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}${domain}`;
  }

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const code = digits.join('');
  const isCodeComplete = code.length === 6 && /^\d{6}$/.test(code);
  const isExpired = expiresAt !== undefined && expirySecondsRemaining <= 0;

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const singleDigit = cleaned.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = singleDigit;
    setDigits(nextDigits);
    setErrorMessage(null);

    // Focus next box if available
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keyboard navigation (Backspace, Left/Right arrows)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste full 6-digit code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericChars = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!numericChars) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = numericChars[i] || '';
    }
    setDigits(nextDigits);
    setErrorMessage(null);

    // Focus on the next empty box or the last box
    const focusIndex = Math.min(numericChars.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Verify OTP submission
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!challengeId || !continuationToken || !isCodeComplete || isVerifying || isResending || isExpired) return;

    setIsVerifying(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await verifyOtp({
        challengeId,
        code,
        continuationToken,
      });

      setIsSuccess(true);
      // Auto-redirect to login after 2.5s
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const problem = parseProblemDetails(err);

      if (problem.code === 'AUTH.OTP_INVALID') {
        setErrorMessage('Mã OTP không chính xác. Vui lòng kiểm tra lại mã 6 chữ số trong email.');
      } else if (problem.code === 'AUTH.OTP_EXPIRED') {
        setErrorMessage('Mã OTP đã hết hiệu lực sau 5 phút. Vui lòng nhấn "Gửi lại mã OTP" để nhận mã mới.');
      } else if (problem.code === 'AUTH.OTP_ATTEMPTS_EXCEEDED') {
        setErrorMessage('Bạn đã nhập sai mã OTP quá 5 lần. Mã này đã bị hủy để bảo mật. Vui lòng nhấn "Gửi lại mã OTP" để lấy mã mới.');
      } else if (problem.code === 'AUTH.CHALLENGE_NOT_FOUND') {
        setErrorMessage('Phiên xác thực không còn tồn tại hoặc đã được kích hoạt. Vui lòng chuyển sang trang đăng nhập.');
      } else if (problem.code === 'NETWORK_ERROR') {
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng của bạn.');
      } else {
        setErrorMessage(problem.title || 'Xác thực mã OTP thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP action
  const handleResend = async () => {
    if (!challengeId || !continuationToken || isResending || isVerifying || cooldownSecondsRemaining > 0) return;

    setIsResending(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await resendOtp({
        challengeId,
        continuationToken,
      });

      // Update challenge metadata
      setChallengeId(response.challengeId);
      setMaskedDestination(response.maskedDestination);
      setExpiresAt(response.expiresAt);
      setResendAvailableAt(response.resendAvailableAt);
      setContinuationToken(response.continuationToken);

      // Reset digit boxes
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      setInfoMessage('Mã OTP mới đã được gửi tới email của bạn. Lưu ý: Các mã OTP cũ đã hết hiệu lực, vui lòng chỉ nhập mã mới nhất.');
    } catch (err: unknown) {
      const problem = parseProblemDetails(err);

      if (problem.code === 'AUTH.RESEND_COOLDOWN') {
        setErrorMessage('Vui lòng đợi hết thời gian chờ 60 giây trước khi yêu cầu gửi lại mã.');
      } else if (problem.code === 'AUTH.RATE_LIMITED') {
        setErrorMessage('Bạn đã vượt quá số lần gửi mã OTP trong 1 giờ. Vui lòng thử lại sau.');
      } else if (problem.code === 'AUTH.DELIVERY_UNAVAILABLE') {
        setErrorMessage('Dịch vụ gửi email gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.');
      } else if (problem.code === 'AUTH.CHALLENGE_NOT_FOUND') {
        setErrorMessage('Phiên xác thực không còn tồn tại. Vui lòng đăng nhập để bắt đầu lại.');
      } else if (problem.code === 'NETWORK_ERROR') {
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.');
      } else {
        setErrorMessage(problem.title || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // If visited directly with NO challenge context
  if (!challengeId || !continuationToken) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
        <Card className="w-full max-w-md p-8 shadow-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-black text-ink">Không tìm thấy phiên xác thực</h1>
          <p className="mt-2 text-sm text-muted">
            Trang này yêu cầu thông tin phiên xác thực từ bước Đăng ký hoặc Đăng nhập tài khoản chờ kích hoạt.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login">
              <Button className="w-full">Đăng nhập tài khoản</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" className="w-full">Đăng ký mới</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Success state view
  if (isSuccess) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
        <Card className="w-full max-w-md p-8 shadow-lg text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-state-success-soft text-state-success-strong mb-4">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-black text-ink">Kích hoạt thành công!</h1>
          <p className="mt-2 text-sm text-muted">
            Tài khoản của bạn đã được kích hoạt thành công. Bạn có thể đăng nhập ngay bây giờ để bắt đầu sử dụng OCS.
          </p>
          <div className="mt-6">
            <Link to="/login">
              <Button className="w-full">Chuyển đến trang Đăng nhập</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-dark mb-3">
            <MailCheck size={24} />
          </div>
          <h1 className="text-2xl font-black text-ink">Xác thực Email OTP</h1>
          <p className="mt-2 text-sm text-muted">
            Mã gồm 6 chữ số đã được gửi tới địa chỉ:
          </p>
          <p className="mt-0.5 text-sm font-bold text-ink">
            {maskedDestination || 'email của bạn'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4">
            <Toast
              variant="error"
              title="Lỗi xác thực"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
          </div>
        )}

        {infoMessage && (
          <div className="mb-4">
            <Toast
              variant="info"
              title="Thông báo"
              message={infoMessage}
              onClose={() => setInfoMessage(null)}
            />
          </div>
        )}

        {/* Expiration Timer Indicator */}
        <div className="mb-6 flex items-center justify-between rounded-xl bg-slate-50 border border-border p-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted">
            <Clock size={15} />
            <span>Thời hạn mã:</span>
          </div>
          <div className="font-bold">
            {isExpired ? (
              <span className="text-state-danger flex items-center gap-1">
                <AlertCircle size={13} />
                Đã hết hạn
              </span>
            ) : (
              <span className="text-accent-dark font-mono text-sm">
                {formatCountdown(expirySecondsRemaining)}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6 Digit Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted text-center mb-3">
              Nhập mã xác thực 6 chữ số
            </label>
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={isVerifying || isResending || isExpired}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`h-12 w-10 sm:h-14 sm:w-12 rounded-xl border text-center font-mono text-xl sm:text-2xl font-bold transition outline-none ${
                    digit
                      ? 'border-accent bg-accent/5 text-ink shadow-sm'
                      : 'border-border bg-white text-ink hover:border-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20'
                  } ${isExpired ? 'bg-slate-100 opacity-60' : ''}`}
                  aria-label={`Số thứ ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={isVerifying}
            disabled={!isCodeComplete || isVerifying || isResending || isExpired}
          >
            Xác thực tài khoản
          </Button>
        </form>

        {/* Resend Cooldown Section */}
        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-xs text-muted mb-3">
            Không nhận được mã hoặc mã đã hết hạn?
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            loading={isResending}
            disabled={cooldownSecondsRemaining > 0 || isResending || isVerifying}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
            {cooldownSecondsRemaining > 0
              ? `Gửi lại mã sau (${cooldownSecondsRemaining}s)`
              : 'Gửi lại mã OTP'}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
          >
            <ArrowLeft size={13} />
            Quay lại trang Đăng nhập
          </Link>
        </div>
      </Card>
    </div>
  );
};
