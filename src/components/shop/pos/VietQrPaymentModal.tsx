import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  Building2,
  Receipt,
  Maximize2,
  Minimize2,
  X,
  ScanLine,
  Zap,
} from 'lucide-react';
import { Badge, Button, Modal } from '@/components/shared';
import { posPaymentsApi } from '@/api/posPayments';
import type { VietQrPaymentSession } from '@/types';

export interface VietQrPaymentModalProps {
  open: boolean;
  saleInvoiceId: string | null;
  initialSession?: VietQrPaymentSession | null;
  initialInvoiceNumber?: string;
  initialAmount?: string | number;
  onClose: () => void;
  onPaymentSuccess?: (session: VietQrPaymentSession) => void;
  onSessionUpdate?: (session: VietQrPaymentSession) => void;
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1500;

export function playPaymentSuccessChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Upbeat 2-tone chime: C5 (523.25Hz) -> G5 (783.99Hz)
    playTone(523.25, now, 0.2);
    playTone(783.99, now + 0.12, 0.4);
  } catch {
    // Silently continue if audio context is blocked by browser policy
  }
}

export function formatVndCurrency(amountInput: string | number | undefined): string {
  if (amountInput === undefined || amountInput === null || amountInput === '') {
    return '0 ₫';
  }
  const numeric = typeof amountInput === 'number' ? amountInput : Number(amountInput);
  if (!Number.isFinite(numeric)) {
    return `${amountInput} ₫`;
  }
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(numeric)} ₫`;
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { title?: string; detail?: string; message?: string } } }).response;
    const msg = response?.data?.title || response?.data?.detail || response?.data?.message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }
  }
  return fallback;
}

export const VietQrPaymentModal: React.FC<VietQrPaymentModalProps> = ({
  open,
  saleInvoiceId,
  initialSession = null,
  initialInvoiceNumber,
  initialAmount,
  onClose,
  onPaymentSuccess,
  onSessionUpdate,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}) => {
  const [session, setSession] = useState<VietQrPaymentSession | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'reference' | 'account' | null>(null);
  const [qrImageError, setQrImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const notifiedSuccessTxIdRef = useRef<string | null>(null);

  onPaymentSuccessRef.current = onPaymentSuccess;
  onSessionUpdateRef.current = onSessionUpdate;

  const syncSessionState = useCallback((next: VietQrPaymentSession) => {
    setSession(next);
    setQrImageError(false);
    const expiresMs = Date.parse(next.expiresAt);
    if (Number.isFinite(expiresMs)) {
      const diffSec = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(next.status === 'Pending' && !next.isExpired ? diffSec : 0);
    } else {
      setRemainingSeconds(next.remainingSeconds ?? 0);
    }
    setLastCheckedAt(
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
    onSessionUpdateRef.current?.(next);

    const isPaid = next.status === 'Success' || next.invoicePaymentStatus === 'Paid';
    if (isPaid && notifiedSuccessTxIdRef.current !== next.transactionId) {
      notifiedSuccessTxIdRef.current = next.transactionId;
      playPaymentSuccessChime();
      onPaymentSuccessRef.current?.(next);
    }
  }, []);

  const startOrRotateQrSession = useCallback(
    async (forceNew = false) => {
      if (!saleInvoiceId) return;
      setInitializing(true);
      setError(null);
      try {
        const data = await posPaymentsApi.initiateVietQr(saleInvoiceId, forceNew);
        syncSessionState(data);
      } catch (err) {
        setError(
          extractApiErrorMessage(
            err,
            'Không thể khởi tạo mã thanh toán VietQR cho hóa đơn này. Vui lòng thử lại.',
          ),
        );
      } finally {
        setInitializing(false);
      }
    },
    [saleInvoiceId, syncSessionState],
  );

  const checkPaymentStatus = useCallback(
    async (isManualClick = false, signal?: AbortSignal) => {
      if (!session?.transactionId) return;
      if (isManualClick) {
        setCheckingStatus(true);
        setError(null);
      }
      try {
        const updated = await posPaymentsApi.getVietQrStatus(session.transactionId, signal);
        syncSessionState(updated);
      } catch (err) {
        if (signal?.aborted) return;
        if (isManualClick) {
          setError(
            extractApiErrorMessage(
              err,
              'Không thể kiểm tra trạng thái giao dịch lúc này. Vui lòng thử lại.',
            ),
          );
        }
      } finally {
        if (isManualClick) {
          setCheckingStatus(false);
        }
      }
    },
    [session?.transactionId, syncSessionState],
  );

  const handleSimulateBankWebhook = useCallback(async () => {
    if (!session?.transactionId) return;
    setSimulatingWebhook(true);
    setError(null);
    try {
      const updated = await posPaymentsApi.simulateVietQrWebhook(session.transactionId);
      syncSessionState(updated);
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Không thể giả lập Webhook ngân hàng lúc này. Vui lòng thử lại.',
        ),
      );
    } finally {
      setSimulatingWebhook(false);
    }
  }, [session?.transactionId, syncSessionState]);

  // Initialize or reload QR session on open with a valid saleInvoiceId
  useEffect(() => {
    if (!open || !saleInvoiceId) {
      setSession(null);
      setError(null);
      setRemainingSeconds(0);
      setLastCheckedAt(null);
      setIsZoomed(false);
      notifiedSuccessTxIdRef.current = null;
      return;
    }
    if (initialSession && initialSession.saleInvoiceId === saleInvoiceId) {
      setError(null);
      syncSessionState(initialSession);
      return;
    }
    void startOrRotateQrSession(false);
  }, [open, saleInvoiceId, initialSession, syncSessionState, startOrRotateQrSession]);

  // Handle ESC key to exit customer zoom view
  useEffect(() => {
    if (!isZoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isZoomed]);

  // 1-second local countdown timer while transaction is Pending
  useEffect(() => {
    if (!open || !session || session.status !== 'Pending' || session.isExpired) {
      return;
    }

    const timer = window.setInterval(() => {
      const expiresMs = Date.parse(session.expiresAt);
      if (Number.isFinite(expiresMs)) {
        const diffSec = Math.max(0, Math.ceil((expiresMs - Date.now()) / 1000));
        setRemainingSeconds(diffSec);
        if (diffSec === 0) {
          void checkPaymentStatus(false);
        }
      } else {
        setRemainingSeconds((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open, session, checkPaymentStatus]);

  const remainingSecondsRef = useRef(remainingSeconds);
  remainingSecondsRef.current = remainingSeconds;

  const isPaid =
    session?.status === 'Success' || session?.invoicePaymentStatus === 'Paid';
  const isExpiredOrFailed =
    !isPaid &&
    Boolean(
      session &&
        (session.isExpired ||
          session.status === 'Failed' ||
          remainingSeconds <= 0),
    );
  const isWaiting = Boolean(session && !isPaid && !isExpiredOrFailed);

  // Auto close zoom popup and modal when payment is successfully confirmed
  useEffect(() => {
    if (!isPaid) return;
    const timer = window.setTimeout(() => {
      setIsZoomed(false);
      onClose();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [isPaid, onClose]);

  // Automatic polling while transaction is Pending and not expired
  useEffect(() => {
    if (
      !open ||
      !session?.transactionId ||
      session.status !== 'Pending' ||
      session.isExpired
    ) {
      return;
    }

    const controller = new AbortController();
    const interval = window.setInterval(() => {
      if (remainingSecondsRef.current <= 0) return;
      void checkPaymentStatus(false, controller.signal);
    }, pollIntervalMs);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [
    open,
    session?.transactionId,
    session?.status,
    session?.isExpired,
    pollIntervalMs,
    checkPaymentStatus,
  ]);

  const handleCopy = async (text: string, field: 'reference' | 'account') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Ignore clipboard permission denial
    }
  };

  const displayInvoiceNumber =
    session?.invoiceNumber || initialInvoiceNumber || 'Đang tải...';
  const displayAmount = session?.amount ?? initialAmount;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        loading={initializing && !session}
        error={error}
        className="max-w-2xl"
        contentClassName="!py-3.5"
        title={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight">
              <QrCode className="size-4.5" aria-hidden="true" />
            </div>
            <span className="text-base font-extrabold text-ink">Thanh toán VietQR</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-paper px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
              <Receipt className="size-3 text-brand-highlight" aria-hidden="true" />
              {displayInvoiceNumber}
            </span>
          </div>
        }
        footer={
          /* Read-only Webhook verification: Thu ngân không thể tự bấm xác nhận đã nhận chuyển khoản */
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!isPaid && session && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={simulatingWebhook}
                  loadingText="Đang giả lập..."
                  startIcon={<Zap className="size-3.5 text-amber-600" aria-hidden="true" />}
                  onClick={() => void handleSimulateBankWebhook()}
                  title="Giả lập ngân hàng gửi Webhook biến động số dư (môi trường Dev/Demo)"
                  className="border border-dashed border-amber-300 bg-amber-50/60 text-amber-900 enabled:hover:bg-amber-100/80 font-semibold"
                >
                  Giả lập tiền về (Sandbox)
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {isExpiredOrFailed && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={initializing}
                  loadingText="Đang tạo mã..."
                  startIcon={<RotateCcw className="size-3.5" aria-hidden="true" />}
                  onClick={() => void startOrRotateQrSession(true)}
                >
                  Tạo lại mã QR mới
                </Button>
              )}
              {!isPaid && session && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={checkingStatus}
                  loadingText="Đang kiểm tra..."
                  startIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                  onClick={() => void checkPaymentStatus(true)}
                  className="border-brand-pink/60 bg-paper text-brand-ink enabled:hover:bg-brand-pink-surface enabled:hover:border-brand-highlight"
                >
                  Kiểm tra lại kết quả
                </Button>
              )}
              {isPaid ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onClose}
                  startIcon={<Check className="size-3.5" aria-hidden="true" />}
                >
                  Hoàn tất & Đóng
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onClose} className="text-muted enabled:hover:text-ink">
                  Đóng
                </Button>
              )}
            </div>
          </div>
        }
      >
        {session && (
          <div className="space-y-3.5">
            {/* Prominent Success Celebration Banner */}
            {isPaid && (
              <div
                className="flex flex-col gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-3.5 shadow-2xs"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-emerald-950">
                        Thanh toán thành công
                      </h3>
                      <Badge variant="success" className="text-[11px] font-bold">
                        Đã khớp giao dịch
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-emerald-900">
                      Đã nhận đủ{' '}
                      <strong className="font-mono font-bold text-emerald-950">
                        {formatVndCurrency(displayAmount)}
                      </strong>{' '}
                      cho hóa đơn{' '}
                      <strong className="font-mono font-bold text-emerald-950">
                        {displayInvoiceNumber}
                      </strong>
                      {session.paymentReference ? (
                        <>
                          {' '}• Mã GD:{' '}
                          <code className="font-mono font-bold text-emerald-950">
                            {session.paymentReference}
                          </code>
                        </>
                      ) : null}
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Status + Countdown + Live Check Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface/65 px-3 py-2">
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <Badge variant="success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Đã nhận chuyển khoản hợp lệ
                  </Badge>
                ) : isExpiredOrFailed ? (
                  <Badge variant="danger">
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                    Mã QR đã hết hạn
                  </Badge>
                ) : (
                  <Badge variant="warning" loading>
                    Chờ khách quét mã & chuyển khoản
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-xs text-muted">
                {lastCheckedAt && !isPaid && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                    <span className="size-1.5 rounded-full bg-brand-highlight animate-pulse" aria-hidden="true" />
                    {lastCheckedAt}
                  </span>
                )}
                {isWaiting && (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-paper px-2.5 py-1 text-xs text-muted whitespace-nowrap"
                    aria-label="Thời gian hiệu lực còn lại"
                  >
                    <Clock className="size-3.5 text-brand-highlight" aria-hidden="true" />
                    <span>Còn</span>
                    <span className="font-mono font-bold tabular-nums text-ink">
                      {formatCountdown(remainingSeconds)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2-column balanced layout: Clean QR Card on Left + Unified Transfer Card on Right */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-stretch">
              {/* Left Column: Clean Single QR Card (Click to Zoom) */}
              <div className="flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-white p-3.5 md:col-span-5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="group relative flex aspect-square w-full max-w-[235px] cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-white p-1 focus-visible:outline-2 focus-visible:outline-brand-highlight"
                  title="Bấm vào mã QR để phóng to toàn màn hình cho khách quét"
                  aria-label="Phóng to mã QR cho khách quét"
                >
                  {!qrImageError && session.qrCodeUrl ? (
                    <img
                      src={session.qrCodeUrl}
                      alt={`Mã VietQR cho hóa đơn ${session.invoiceNumber}`}
                      className={`h-full w-full object-contain transition duration-200 ${
                        isExpiredOrFailed ? 'opacity-20 blur-[2px]' : 'group-hover:scale-[1.02]'
                      }`}
                      onError={() => setQrImageError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-muted">
                      <QrCode className="mb-2 size-12 text-brand-highlight/60" aria-hidden="true" />
                      <p className="font-semibold text-ink">Dữ liệu VietQR</p>
                      <p className="mt-1 break-all font-mono text-[10px] text-muted">{session.qrPayload}</p>
                    </div>
                  )}

                  {!isPaid && !isExpiredOrFailed && (
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-ink/75 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100">
                      <Maximize2 className="size-3.5 text-brand-pink" aria-hidden="true" />
                      <span>Phóng to</span>
                    </div>
                  )}

                  {isExpiredOrFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/75 p-3 text-center text-white backdrop-blur-[1px]">
                      <AlertTriangle className="mb-1.5 size-7 text-amber-300" aria-hidden="true" />
                      <p className="text-xs font-bold">Mã QR đã hết hạn</p>
                      <p className="mt-0.5 text-[11px] text-white/80">
                        Bấm &ldquo;Tạo lại mã QR mới&rdquo;
                      </p>
                    </div>
                  )}

                  {isPaid && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 p-3 text-center text-white backdrop-blur-[1px]">
                      <CheckCircle2 className="mb-1.5 size-9 text-emerald-300" aria-hidden="true" />
                      <p className="text-sm font-bold">Thanh toán thành công</p>
                      <p className="mt-0.5 text-xs text-emerald-100/90">
                        Giao dịch đã được ghi nhận
                      </p>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-pink/50 bg-brand-pink-surface/80 px-3 py-1.5 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-light hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight cursor-pointer"
                >
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                  <span>Phóng to cho khách quét</span>
                </button>
              </div>

              {/* Right Column: Unified Transfer Details Card */}
              <div className="flex flex-col rounded-2xl border border-border/80 bg-paper overflow-hidden md:col-span-7">
                {/* Highlighted Amount Band */}
                <div className="border-b border-border/70 bg-brand-pink-surface/75 px-4 py-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Số tiền cần thanh toán
                  </span>
                  <p
                    className="mt-0.5 font-mono text-2xl font-black tabular-nums tracking-tight text-brand-ink"
                    data-testid="vietqr-amount"
                  >
                    {formatVndCurrency(displayAmount)}
                  </p>
                </div>

                {/* Transfer Content Row */}
                <div className="border-b border-border/70 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Nội dung chuyển khoản
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className="font-mono text-base font-extrabold tracking-wide text-brand-ink truncate"
                      data-testid="vietqr-transfer-content"
                    >
                      {session.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(session.transferContent, 'reference')}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink transition hover:border-brand-pink hover:bg-brand-pink-surface focus-visible:outline-2 focus-visible:outline-brand-highlight cursor-pointer"
                      title="Sao chép nội dung chuyển khoản"
                      aria-label="Sao chép nội dung chuyển khoản"
                    >
                      {copiedField === 'reference' ? (
                        <>
                          <Check className="size-3 text-emerald-600" aria-hidden="true" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" aria-hidden="true" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Beneficiary Rows */}
                <div className="flex-1 flex flex-col justify-center divide-y divide-border/50 px-4 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2 py-2">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Building2 className="size-3.5 text-muted" aria-hidden="true" />
                      Ngân hàng
                    </span>
                    <span className="font-bold text-ink">{session.bankCode}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-2">
                    <span className="text-muted">Số tài khoản</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold tabular-nums text-ink">
                        {session.bankAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopy(session.bankAccountNumber, 'account')}
                        className="rounded p-1 text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-highlight cursor-pointer"
                        title="Sao chép số tài khoản"
                        aria-label="Sao chép số tài khoản"
                      >
                        {copiedField === 'account' ? (
                          <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-2">
                    <span className="text-muted">Chủ tài khoản</span>
                    <span className="font-semibold text-ink text-right">
                      {session.bankAccountHolderName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Fullscreen Customer Display Lightbox / Zoom Mode (Rendered via Portal with z-[2000] to sit cleanly on top of Modal z-[1000]) */}
      {isZoomed && session && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mã VietQR phóng to cho khách hàng quét"
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative flex w-full max-w-lg flex-col items-center rounded-3xl bg-white p-7 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-surface text-muted transition hover:bg-brand-pink-light hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-highlight"
              aria-label="Đóng chế độ phóng to (phím Escape)"
              title="Đóng chế độ phóng to"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* Header for Customer */}
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight shadow-2xs">
                <ScanLine className="size-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black text-ink">Quét mã VietQR để thanh toán</h3>
              <p className="mt-0.5 text-xs text-muted">Mở camera hoặc ứng dụng Mobile Banking bất kỳ để quét mã</p>
            </div>

            {/* Big Zoomed QR Code Image */}
            <div className="relative flex aspect-square w-full max-w-[340px] items-center justify-center overflow-hidden rounded-2xl border-2 border-brand-lavender/50 bg-white p-3 shadow-inner">
              {!qrImageError && session.qrCodeUrl ? (
                <img
                  src={session.qrCodeUrl}
                  alt={`Mã VietQR cho hóa đơn ${session.invoiceNumber}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="p-4 text-center text-sm font-mono">{session.qrPayload}</div>
              )}

              {isPaid && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/95 p-6 text-center text-white backdrop-blur-[2px] animate-in fade-in duration-200">
                  <div className="mb-2.5 flex size-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-4 ring-emerald-500/30">
                    <CheckCircle2 className="size-12 animate-pulse" aria-hidden="true" />
                  </div>
                  <p className="text-2xl font-black text-white">THANH TOÁN THÀNH CÔNG!</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-200">
                    Đã nhận đủ {formatVndCurrency(displayAmount)}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-100/80">Cảm ơn quý khách đã mua sắm tại OCS</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsZoomed(false);
                      onClose();
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-950 shadow-md transition hover:bg-emerald-50"
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    <span>Hoàn tất giao dịch</span>
                  </button>
                </div>
              )}
            </div>

            {/* Amount and Content Highlight for Customer */}
            <div className="mt-5 grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl border border-brand-lavender/40 bg-brand-pink-surface p-3.5">
                <p className="text-xs font-medium text-muted">Số tiền thanh toán</p>
                <p className="mt-0.5 text-2xl font-black text-brand-ink">{formatVndCurrency(displayAmount)}</p>
              </div>

              <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-3.5">
                <p className="text-xs font-medium text-amber-900">Nội dung chuyển khoản</p>
                <p className="mt-0.5 font-mono text-lg font-extrabold text-amber-950">{session.transferContent}</p>
              </div>
            </div>

            {/* Status Footer in Zoom Mode */}
            <div className="mt-5 flex w-full items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-brand-highlight" aria-hidden="true" />
                <span>Thời gian hiệu lực: <strong className="font-mono text-sm text-ink">{formatCountdown(remainingSeconds)}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 font-semibold text-brand-highlight hover:bg-brand-pink-surface transition"
              >
                <Minimize2 className="size-4" aria-hidden="true" />
                <span>Thu nhỏ (Esc)</span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default VietQrPaymentModal;
