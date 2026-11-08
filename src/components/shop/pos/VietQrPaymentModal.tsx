import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  Building2,
  FileText,
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

const DEFAULT_POLL_INTERVAL_MS = 4000;

export function formatVndCurrency(amountInput: string | number | undefined): string {
  if (amountInput === undefined || amountInput === null || amountInput === '') {
    return '0 ₫';
  }
  const numeric = typeof amountInput === 'number' ? amountInput : Number(amountInput);
  if (!Number.isFinite(numeric)) {
    return `${amountInput} ₫`;
  }
  return `${ new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(numeric)} ₫`;
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
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'reference' | 'account' | null>(null);
  const [qrImageError, setQrImageError] = useState(false);

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

  // Initialize VietQR session when modal opens with a valid saleInvoiceId
  useEffect(() => {
    if (!open || !saleInvoiceId) {
      setSession(null);
      setError(null);
      setRemainingSeconds(0);
      setLastCheckedAt(null);
      return;
    }
    void startOrRotateQrSession(false);
  }, [open, saleInvoiceId, startOrRotateQrSession]);

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
    <Modal
      open={open}
      onClose={onClose}
      loading={initializing && !session}
      error={error}
      className="max-w-2xl"
      title={
        <div className="flex flex-wrap items-center gap-2.5">
          <QrCode className="size-5 text-brand-highlight" aria-hidden="true" />
          <span>Quét mã VietQR Thanh Toán Tại Quầy</span>
        </div>
      }
      description={
        <span>
          Hóa đơn bán lẻ:{' '}
          <strong className="font-semibold text-ink">{displayInvoiceNumber}</strong>
        </span>
      }
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted">
            {lastCheckedAt ? (
              <span>Kiểm tra trạng thái gần nhất: {lastCheckedAt}</span>
            ) : (
              <span>Tự động đồng bộ trạng thái từ cổng thanh toán</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isExpiredOrFailed && (
              <Button
                variant="secondary"
                size="md"
                loading={initializing}
                loadingText="Đang tạo mã mới..."
                startIcon={<RotateCcw className="size-4" aria-hidden="true" />}
                onClick={() => void startOrRotateQrSession(true)}
              >
                Tạo lại mã QR mới
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
            <Button variant="outline" size="md" onClick={onClose}>
              {isPaid ? 'Hoàn tất & Đóng' : 'Đóng cửa sổ'}
            </Button>
          </div>
        </div>
      }
    >
      {session && (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-brand-pink-surface/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              {isPaid ? (
                <Badge variant="success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Đã nhận chuyển khoản hợp lệ
                </Badge>
              ) : isExpiredOrFailed ? (
                <Badge variant="danger">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Mã QR đã hết hạn / Chưa thanh toán
                </Badge>
              ) : (
                <Badge variant="warning" loading>
                  Đang chờ khách quét mã & chuyển khoản
                </Badge>
              )}
            </div>

            {isWaiting && (
              <div
                className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-1 text-xs font-semibold text-ink shadow-xs"
                aria-label="Thời gian hiệu lực còn lại"
              >
                <Clock className="size-3.5 text-brand-highlight" aria-hidden="true" />
                <span>Hết hạn sau:</span>
                <span className="font-mono text-sm font-bold text-brand-highlight">
                  {formatCountdown(remainingSeconds)}
                </span>
              </div>
            )}
          </div>

          {/* Main Grid: QR Image (Left) + Transfer Details (Right) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* QR Code Display Column */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 shadow-xs md:col-span-5">
              <div className="relative flex aspect-square w-full max-w-[230px] items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white p-2">
                {!qrImageError && session.qrCodeUrl ? (
                  <img
                    src={session.qrCodeUrl}
                    alt={`Mã VietQR cho hóa đơn ${session.invoiceNumber}`}
                    className={`h-full w-full object-contain transition duration-200 ${
                      isExpiredOrFailed ? ' opacity-25 blur-[2px]' : ''
                    }`}
                    onError={() => setQrImageError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-muted">
                    <QrCode className="mb-2 size-12 text-brand-highlight/60" aria-hidden="true" />
                    <p className="font-semibold text-ink">Dữ liệu VietQR đã khởi tạo</p>
                    <p className="mt-1 break-all font-mono text-[11px]">{session.qrPayload}</p>
                  </div>
                )}

                {isExpiredOrFailed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/65 p-4 text-center text-white">
                    <AlertTriangle className="mb-2 size-8 text-amber-300" aria-hidden="true" />
                    <p className="text-sm font-bold">Mã QR đã hết hiệu lực</p>
                    <p className="mt-1 text-xs text-white/85">
                      Vui lòng bấm &ldquo;Tạo lại mã QR mới&rdquo; nếu khách vẫn muốn thanh toán.
                    </p>
                  </div>
                )}

                {isPaid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/80 p-4 text-center text-white">
                    <CheckCircle2 className="mb-2 size-10 text-emerald-300" aria-hidden="true" />
                    <p className="text-sm font-bold">Thanh toán hoàn tất</p>
                    <p className="mt-1 text-xs text-white/90">
                      Hệ thống đã ghi nhận giao dịch thành công.
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-2.5 text-center text-xs text-muted">
                Mở ứng dụng Ngân hàng / Ví điện tử bất kỳ để quét mã VietQR
              </p>
            </div>

            {/* Transfer Information Column */}
            <div className="flex flex-col justify-between space-y-3 rounded-2xl border border-border bg-paper p-4 md:col-span-7">
              <div className="space-y-3">
                {/* Total Amount Box */}
                <div className="rounded-xl border border-brand-lavender/40 bg-brand-pink-surface/70 p-3.5">
                  <p className="text-xs font-medium text-muted">Số tiền cần thanh toán</p>
                  <p
                    className="mt-0.5 text-2xl font-extrabold tracking-tight text-brand-ink"
                    data-testid="vietqr-amount"
                  >
                    {formatVndCurrency(displayAmount)}
                  </p>
                </div>

                {/* Bank Details */}
                <div className="space-y-2 rounded-xl border border-border bg-white p-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Building2 className="size-3.5" aria-hidden="true" />
                      Ngân hàng thụ hưởng
                    </span>
                    <span className="font-bold text-ink">{session.bankCode}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <span className="text-xs text-muted">Số tài khoản</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-ink">
                        {session.bankAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopy(session.bankAccountNumber, 'account')}
                        className="rounded-md p-1 text-muted transition hover:bg-brand-pink-surface hover:text-ink"
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

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <span className="text-xs text-muted">Chủ tài khoản</span>
                    <span className="text-right font-semibold text-ink">
                      {session.bankAccountHolderName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <FileText className="size-3.5" aria-hidden="true" />
                      Mã hóa đơn
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink">
                      {session.invoiceNumber}
                    </span>
                  </div>
                </div>

                {/* Transfer Content / Reference Code */}
                <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-950">
                      Nội dung chuyển khoản (Mã tham chiếu)
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(session.transferContent, 'reference')}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-900 shadow-2xs transition hover:bg-amber-100"
                    >
                      {copiedField === 'reference' ? (
                        <>
                          <Check className="size-3 text-emerald-600" aria-hidden="true" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" aria-hidden="true" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p
                    className="mt-1 font-mono text-lg font-extrabold tracking-wider text-amber-950"
                    data-testid="vietqr-transfer-content"
                  >
                    {session.transferContent}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90">
                    Nội dung chuyển khoản đã được gắn tự động trong mã QR. Khách hàng vui lòng giữ nguyên để hệ thống đối soát.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Non-bypassable Cashier Policy Guardrail Notice */}
          <div
            className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-dashboard px-4 py-3 text-xs text-muted"
            role="note"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-brand-highlight" aria-hidden="true" />
            <div>
              <p className="font-semibold text-ink">
                Quy định kiểm soát thanh toán VietQR tại quầy POS:
              </p>
              <p className="mt-0.5 leading-relaxed">
                Việc hiển thị mã QR chưa được xem là đã nhận tiền. Thu ngân <strong>không thể tự bấm xác nhận đã nhận chuyển khoản</strong>; hóa đơn chỉ hoàn tất khi hệ thống nhận xác nhận thanh toán hợp lệ. Bạn có thể theo dõi trạng thái tự động hoặc bấm <strong>&ldquo;Kiểm tra lại kết quả&rdquo;</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VietQrPaymentModal;
