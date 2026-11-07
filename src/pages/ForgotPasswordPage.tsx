import { authStyles } from '@/components/layout/authStyles';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, MailCheck, RefreshCw, X } from 'lucide-react';
import { completePasswordReset, parseProblemDetails, requestPasswordReset, verifyPasswordReset } from '@/api/auth';
import { Button, Form, Input, PasswordInput, Toast } from '@/components/shared';
import { validateConfirmPassword, validateEmail, validatePasswordPolicy } from '@/utils/validation';
import { deleteOtpDigit, fillOtpDigits } from '@/utils/otp';

const emptyDigits = () => Array<string>(6).fill('');

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(emptyDigits);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<number>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join('');
  const remainingSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (step === 'otp') inputRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 'otp' || remainingSeconds === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step, remainingSeconds > 0]);

  const send = async () => {
    const validation = validateEmail(email);
    if (validation) { setError(validation); return; }
    setLoading(true); setError(null); setNotice(false);
    try {
      const policy = await requestPasswordReset(email.trim());
      const requestedAt = Date.now();
      setExpiryMinutes(policy.expiryMinutes);
      setNow(requestedAt);
      setResendAt(requestedAt + (policy.resendSeconds ?? 0) * 1000);
      setStep('otp');
      setNotice(true);
    } catch (err) { setError(parseProblemDetails(err).title || 'Không thể gửi yêu cầu. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  const fillDigits = (value: string, index: number) => {
    const result = fillOtpDigits(digits, value, index);
    if (!result) return;
    setDigits(result.digits);
    setError(null);
    inputRefs.current[result.focusIndex]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const result = deleteOtpDigit(digits, index);
      setDigits(result.digits);
      inputRefs.current[result.focusIndex]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault(); inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault(); inputRefs.current[index + 1]?.focus();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (step === 'email') { await send(); return; }
    setError(null); setNotice(false);
    if (step === 'otp' && !/^\d{6}$/.test(code)) { setError('Vui lòng nhập mã gồm 6 chữ số.'); return; }
    if (step === 'password') {
      const validation = validatePasswordPolicy(password) || validateConfirmPassword(password, confirm);
      if (validation) { setError(validation); return; }
    }
    setLoading(true);
    try {
      if (step === 'otp') {
        const resetToken = await verifyPasswordReset(email.trim(), code);
        setToken(resetToken); setDigits(emptyDigits()); setStep('password');
      } else if (step === 'password') {
        await completePasswordReset(email.trim(), token, password);
        setToken(''); setPassword(''); setConfirm(''); setStep('done');
      }
    } catch (err) { setError(parseProblemDetails(err).title || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  };

  const title = { email: 'Quên mật khẩu', otp: 'Xác thực email', password: 'Tạo mật khẩu mới', done: 'Đặt lại mật khẩu thành công' }[step];
  return (
    <div>
      <div className={authStyles.eyebrow}>KHÔI PHỤC TÀI KHOẢN</div>
      <h1 className={authStyles.title}>{title}</h1>
      <p className={authStyles.description}>
        {step === 'email' && 'Nhập email tài khoản để nhận mã xác thực.'}
        {step === 'otp' && <>Nhập mã gồm 6 chữ số được gửi đến <strong className="font-semibold break-all text-[#51444d]">{email.trim()}</strong>.</>}
        {step === 'password' && 'Nhập mật khẩu mới và xác nhận lại để hoàn tất.'}
        {step === 'done' && 'Bạn có thể đăng nhập bằng mật khẩu mới.'}
      </p>
      {error && <div className="mb-[1.35rem]"><Toast variant="error" title="Không thể thực hiện" message={error} onClose={() => setError(null)} /></div>}
      {notice && <div className="mb-[1.35rem] flex items-start gap-3 rounded-xl border border-[#c5ddfa] bg-[#f1f7ff] px-4 py-[.95rem] text-xs leading-[1.55] text-[#275b8c]" role="status">
        <MailCheck size={20} className="mt-[.1rem] shrink-0 text-[#3c78b8]" aria-hidden="true" />
        <div className="min-w-0 flex-1"><strong className="block text-[.76rem] text-[#245785]">Kiểm tra hộp thư của bạn</strong><p className="mt-[.22rem]">Nếu email đủ điều kiện, mã xác thực sẽ được gửi đến. Hãy kiểm tra cả thư mục spam nhé.</p></div>
        <button type="button" className={`
          shrink-0 cursor-pointer rounded-[4px] border-0 bg-transparent p-0 text-[#7192b1] hover:text-[#245785]
          focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#b35a80]
        `} onClick={() => setNotice(false)} aria-label="Đóng thông báo"><X size={17} /></button>
      </div>}
      {step !== 'done' && <Form className={authStyles.form} onSubmit={submit} loading={loading} disabled={loading}>
        {step === 'email' && <Input label="Địa chỉ email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="ban@example.com" required />}
        {step === 'otp' && <div>
          <div className="mb-[.65rem] flex items-center justify-between text-[.7rem] font-bold text-[#514a50]"><span id="reset-otp-label">Mã xác thực</span><span className="text-[.65rem] font-medium text-[#a69aa1]">6 chữ số</span></div>
          <div className={`${authStyles.otpGrid} !m-0 !w-full !max-w-none !gap-[clamp(.35rem,1.1vw,.6rem)] !p-0`} role="group" aria-labelledby="reset-otp-label" onPaste={event => {
            event.preventDefault();
            const index = inputRefs.current.findIndex(input => input === document.activeElement);
            fillDigits(event.clipboardData.getData('text'), Math.max(0, index));
          }}>
            {digits.map((digit, index) => <input
              key={index}
              ref={element => { inputRefs.current[index] = element; }}
              className={`${authStyles.otpInput} !h-[3.35rem] !rounded-[10px] !font-sans !text-xl ${digit ? authStyles.otpFilled : ''}`}
              type="text" inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1} value={digit} disabled={loading} aria-label={`Chữ số ${index + 1} trong 6`}
              onFocus={event => event.currentTarget.select()}
              onChange={event => {
                if (!event.target.value) setDigits(current => current.map((item, i) => i === index ? '' : item));
                else fillDigits(event.target.value, index);
              }}
              onKeyDown={event => handleKeyDown(event, index)}
            />)}
          </div>
          <p className="mt-[.6rem] text-[.68rem] leading-normal text-[#91858d]">Bạn có thể dán cả mã vào các ô trên.</p>
          {expiryMinutes && <p className="mt-4 flex items-center gap-2 rounded-[9px] bg-[#faf6f8] px-[.8rem] py-[.7rem] text-[.7rem] leading-normal text-[#7f6674]"><Clock3 size={16} className="shrink-0 text-[#b78399]" aria-hidden="true" /><span>Mã có hiệu lực trong <strong className="text-[#765364]">{expiryMinutes} phút</strong> kể từ khi được tạo.</span></p>}
        </div>}
        {step === 'password' && <>
          <PasswordInput label="Mật khẩu mới" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
          <PasswordInput label="Xác nhận mật khẩu mới" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
        </>}
        <Button type="submit" className="w-full !min-h-12 !rounded-[10px]" loading={loading} disabled={loading || (step === 'otp' && code.length !== 6)} endIcon={<ArrowRight size={16} aria-hidden="true" />}>
          {step === 'email' ? 'Gửi mã xác thực' : step === 'otp' ? 'Xác thực mã' : 'Đặt lại mật khẩu'}
        </Button>
      </Form>}
      {step === 'otp' && <div className="mt-5 flex flex-wrap items-center justify-center gap-x-[.4rem] gap-y-[.7rem] text-[.72rem]">
        <p className="text-[#8a7e86]">Chưa nhận được mã?</p>
        <button className={`
          inline-flex cursor-pointer items-center justify-center gap-[.35rem] rounded-[4px] border-0 bg-transparent
          p-0 text-[.72rem] font-bold text-[#a75574] hover:enabled:text-[#843b59] hover:enabled:underline
          focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#b35a80]
          disabled:cursor-default disabled:text-[#aa9da4]
        `} type="button" disabled={loading || remainingSeconds > 0} onClick={send}>
          <RefreshCw size={15} aria-hidden="true" />
          {remainingSeconds > 0 ? `Gửi lại mã sau ${remainingSeconds}s` : 'Gửi lại mã'}
        </button>
        <button type="button" className={`
          inline-flex basis-full cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent
          p-[.2rem] text-[.72rem] font-bold text-[#81727b] hover:enabled:text-[#843b59] hover:enabled:underline
          focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#b35a80]
          disabled:cursor-default disabled:text-[#aa9da4]
        `} disabled={loading} onClick={() => { setStep('email'); setDigits(emptyDigits()); setError(null); setNotice(false); }}>Thay đổi email</button>
      </div>}
      {step === 'password' && error && <div className="mt-4 text-center"><button type="button" className={`
        inline-flex cursor-pointer items-center justify-center gap-[.35rem] rounded-[4px] border-0 bg-transparent
        p-0 text-[.72rem] font-bold text-[#a75574] hover:text-[#843b59] hover:underline focus-visible:outline-2
        focus-visible:outline-offset-[3px] focus-visible:outline-[#b35a80]
      `} onClick={() => { setToken(''); setStep('email'); setError(null); }}>Bắt đầu lại</button></div>}
      {step === 'done' && <div className="flex items-center gap-[.55rem] rounded-[10px] bg-[#f0f9f3] p-[.85rem] text-xs text-[#397452]"><CheckCircle2 size={18} aria-hidden="true" /> Mật khẩu mới đã sẵn sàng sử dụng.</div>}
      <div className={authStyles.footer}><Link className="inline-flex items-center justify-center gap-[.4rem]" to="/login"><ArrowLeft size={15} aria-hidden="true" /> Quay lại đăng nhập</Link></div>
    </div>
  );
};
