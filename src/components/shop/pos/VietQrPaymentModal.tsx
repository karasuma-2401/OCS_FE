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
  ShieldCheck,
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
      return;
    }
    void startOrRotateQrSession(false);
  }, [open, saleInvoiceId, startOrRotateQrSession]);

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

  // Automatic polling while transaction is Pending and not expired
  useEffect(() => {
    if (
      !open ||
      !session?.transactionId ||
      session.status !== 'Pending' ||
      session.isExpired ||
      remainingSeconds <= 0
    ) {
      return;
    }

    const controller = new AbortController();
    const interval = window.setInterval(() => {
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
    remainingSeconds,
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
        className="max-w-3xl"
        title={
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight shadow-2xs">
              <QrCode className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Thanh toán VietQR tại Quầy</h2>
              <p className="text-xs font-normal text-muted">
                Quét mã tức thì qua ứng dụng ngân hàng — Hệ thống tự động xác nhận
              </p>
            </div>
          </div>
        }
        description={
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-surface-dashboard px-2.5 py-1 text-xs text-muted">
            <Receipt className="size-3.5 text-brand-highlight" aria-hidden="true" />
            <span>
              Hóa đơn: <strong className="font-semibold text-ink">{displayInvoiceNumber}</strong>
            </span>
          </div>
        }
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span
                className={`size-2 rounded-full ${
                  isPaid ? 'bg-state-success' : 'bg-brand-highlight animate-pulse'
                }`}
                aria-hidden="true"
              />
              {lastCheckedAt ? (
                <span>Cập nhật lúc: {lastCheckedAt}</span>
              ) : (
                <span>Đang tự động theo dõi giao dịch</span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isExpiredOrFailed && (
                <Button
                  variant="secondary"
                  size="md"
                  loading={initializing}
                  loadingText="Đang tạo mã..."
                  startIcon={<RotateCcw className="size-4" aria-hidden="true" />}
                  onClick={() => void startOrRotateQrSession(true)}
                >
                  Tạo lại mã QR mới
                </Button>
              )}
              {!isPaid && session && (
                <Button
                  variant="secondary"
                  size="md"
                  loading={simulatingWebhook}
                  loadingText="Đang gửi Webhook..."
                  startIcon={<Zap className="size-4 text-amber-600" aria-hidden="true" />}
                  onClick={() => void handleSimulateBankWebhook()}
                  title="Giả lập ngân hàng gửi Webhook biến động số dư về hệ thống (Dành cho môi trường Dev/Demo)"
                >
                  Giả lập tiền về (Sandbox)
                </Button>
              )}
              {!isPaid && session && (
                <Button
                  variant="primary"
                  size="md"
                  loading={checkingStatus}
                  loadingText="Đang kiểm tra..."
                  startIcon={<RefreshCw className="size-4" aria-hidden="true" />}
                  onClick={() => void checkPaymentStatus(true)}
                >
                  Kiểm tra lại kết quả
                </Button>
              )}
              {isPaid ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={onClose}
                  startIcon={<Check className="size-4" aria-hidden="true" />}
                >
                  Hoàn tất & Đóng
                </Button>
              ) : (
                <Button variant="outline" size="md" onClick={onClose}>
                  Đóng cửa sổ
                </Button>
              )}
            </div>
          </div>
        }
      >
        {session && (
          <div className="space-y-4 pt-1">
            {/* Prominent Success Celebration Banner */}
            {isPaid && (
              <div
                className="flex flex-col gap-2.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/95 p-4 shadow-sm"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="size-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-emerald-950">
                        🎉 THANH TOÁN THÀNH CÔNG!
                      </h3>
                      <Badge variant="success" className="text-[11px] font-bold">
                        Đã khớp giao dịch
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-emerald-900">
                      Hệ thống đã nhận đủ{' '}
                      <strong className="font-bold text-emerald-950">
                        {formatVndCurrency(displayAmount)}
                      </strong>{' '}
                      cho hóa đơn{' '}
                      <strong className="font-bold text-emerald-950">
                        {displayInvoiceNumber}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/80 pt-2.5 text-xs text-emerald-950">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-700" aria-hidden="true" />
                    <span>
                      Mã chuẩn chi VietQR:{' '}
                      <code className="font-mono font-bold text-emerald-900">
                        {session.paymentReference}
                      </code>
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-800">
                    Tự động gạch nợ hóa đơn & cập nhật kho
                  </span>
                </div>
              </div>
            )}

            {/* Status Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-dashboard/70 p-3">
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

              {isWaiting && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-paper px-2.5 py-1 text-xs text-muted"
                  aria-label="Thời gian hiệu lực còn lại"
                >
                  <Clock className="size-3.5 text-brand-highlight" aria-hidden="true" />
                  <span>Hiệu lực còn:</span>
                  <span className="font-mono font-bold text-ink">
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>
              )}
            </div>

            {/* 2-column layout: Large QR on Left + Details on Right */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
              {/* Left Column: Prominent QR Code Card (Click to Zoom) */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-lavender/40 bg-paper p-5 md:col-span-6">
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="group relative flex aspect-square w-full max-w-[270px] cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border-2 border-border/70 bg-white p-3 shadow-sm transition-all duration-200 hover:border-brand-pink hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-highlight"
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

                  {/* Hover Overlay Prompt to Zoom */}
                  {!isPaid && !isExpiredOrFailed && (
                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-ink/75 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100">
                      <Maximize2 className="size-3.5 text-brand-pink" aria-hidden="true" />
                      <span>Bấm để phóng to cho khách</span>
                    </div>
                  )}

                  {isExpiredOrFailed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/75 p-3 text-center text-white backdrop-blur-[1px]">
                      <AlertTriangle className="mb-1.5 size-7 text-amber-300" aria-hidden="true" />
                      <p className="text-xs font-bold">Mã QR đã hết hạn</p>
                      <p className="mt-0.5 text-[11px] text-white/80">
                        Bấm &ldquo;Tạo lại mã QR mới&rdquo; để tiếp tục
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

                {/* Direct Action Button below QR */}
                <button
                  type="button"
                  onClick={() => setIsZoomed(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-lavender/60 bg-brand-pink-surface px-3.5 py-1.5 text-xs font-semibold text-brand-highlight shadow-2xs transition hover:bg-brand-pink-light hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-brand-highlight"
                >
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                  <span>Phóng to toàn màn hình cho khách quét</span>
                </button>
              </div>

              {/* Right Column: Payment Details */}
              <div className="flex flex-col justify-between space-y-3.5 md:col-span-6">
                {/* Amount Display */}
                <div className="rounded-2xl border border-brand-lavender/40 bg-brand-pink-surface/80 p-4">
                  <span className="text-xs font-medium text-muted">Số tiền cần thanh toán</span>
                  <p
                    className="mt-0.5 text-2xl font-black tracking-tight text-brand-ink"
                    data-testid="vietqr-amount"
                  >
                    {formatVndCurrency(displayAmount)}
                  </p>
                </div>

                {/* Transfer Content / Reference Code Highlight */}
                <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 p-3.5">
                  <p className="text-xs font-semibold text-amber-950">
                    Nội dung chuyển khoản
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className="font-mono text-lg font-extrabold tracking-wider text-amber-950"
                      data-testid="vietqr-transfer-content"
                    >
                      {session.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(session.transferContent, 'reference')}
                      className="rounded-lg p-1.5 text-amber-900 transition hover:bg-amber-200/50 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-brand-highlight"
                      title="Sao chép nội dung chuyển khoản"
                      aria-label="Sao chép nội dung chuyển khoản"
                    >
                      {copiedField === 'reference' ? (
                        <Check className="size-4 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Beneficiary Details */}
                <div className="space-y-2 rounded-2xl border border-border/70 bg-paper p-3.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Building2 className="size-3.5 text-muted" aria-hidden="true" />
                      Ngân hàng
                    </span>
                    <span className="font-bold text-ink">{session.bankCode}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                    <span className="text-muted">Số tài khoản</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-ink">
                        {session.bankAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopy(session.bankAccountNumber, 'account')}
                        className="rounded-sm p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-highlight"
                        title="Sao chép số tài khoản"
                        aria-label="Sao chép số tài khoản"
                      >
                        {copiedField === 'account' ? (
                          <Check className="size-3 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
                    <span className="text-muted">Chủ tài khoản</span>
                    <span className="font-semibold text-ink text-right">
                      {session.bankAccountHolderName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Minimalist Policy Note */}
            <div
              className="flex items-center gap-2 rounded-xl bg-surface-dashboard px-3.5 py-2.5 text-[11px] text-muted"
              role="note"
            >
              <ShieldCheck className="size-4 shrink-0 text-brand-highlight" aria-hidden="true" />
              <span>
                Hệ thống tự động xác nhận khi nhận tiền. Thu ngân <strong>không thể tự bấm xác nhận đã nhận chuyển khoản</strong>.
              </span>
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
