import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  RefreshCw,
  Clock,
  CheckCircle2,
  Receipt,
  Search,
  Calendar,
  Printer,
  X,
} from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, SkeletonLoading } from '@/components/shared';
import { posPaymentsApi } from '@/api/posPayments';
import { posApi, type PosInvoiceDetailDto } from '@/api/pos';
import {
  VietQrPaymentModal,
  formatVndCurrency,
  playPaymentSuccessChime,
} from './VietQrPaymentModal';
import { PosInvoiceSuccessModal } from './PosInvoiceSuccessModal';
import type { PosPendingInvoiceSummary, VietQrPaymentSession } from '@/types';

interface CompletedInvoiceRecord {
  saleInvoiceId: string;
  invoiceNumber: string;
  totalAmount: string | number;
  paidAt: string;
  paymentReference?: string;
}

export interface PosVietQrWorkspaceProps {
  open: boolean;
  onClose: () => void;
  onPendingCountChange?: (count: number) => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PosVietQrWorkspace: React.FC<PosVietQrWorkspaceProps> = ({
  open,
  onClose,
  onPendingCountChange,
}) => {
  const [invoices, setInvoices] = useState<PosPendingInvoiceSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<{
    saleInvoiceId: string;
    invoiceNumber?: string;
    totalAmount?: string;
  } | null>(null);

  const [completedInvoices, setCompletedInvoices] = useState<CompletedInvoiceRecord[]>([]);
  const [newlyPaidAlert, setNewlyPaidAlert] = useState<CompletedInvoiceRecord | null>(null);
  const [toastNotification, setToastNotification] = useState<CompletedInvoiceRecord | null>(null);
  const [loadingReceiptNumber, setLoadingReceiptNumber] = useState<string | null>(null);
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<PosInvoiceDetailDto | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const knownInvoicesRef = React.useRef<Map<string, PosPendingInvoiceSummary>>(new Map());
  const hasLoadedInitialRef = React.useRef(false);
  const onPendingCountChangeRef = React.useRef(onPendingCountChange);
  onPendingCountChangeRef.current = onPendingCountChange;

  const loadPendingInvoices = useCallback(
    async (signal?: AbortSignal, isSilent = false) => {
      if (!isSilent) {
        setLoadingList(true);
      }
      setListError(null);
      try {
        const items = await posPaymentsApi.listPendingInvoices(signal);

        if (hasLoadedInitialRef.current) {
          const newMap = new Map(items.map((i) => [i.saleInvoiceId, i]));
          const disappearedInvoices: PosPendingInvoiceSummary[] = [];

          knownInvoicesRef.current.forEach((oldInv, oldId) => {
            if (!newMap.has(oldId)) {
              disappearedInvoices.push(oldInv);
            }
          });

          if (disappearedInvoices.length > 0) {
            const nowFormatted = new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const newlyCompleted: CompletedInvoiceRecord[] = disappearedInvoices.map((inv) => ({
              saleInvoiceId: inv.saleInvoiceId,
              invoiceNumber: inv.invoiceNumber,
              totalAmount: inv.totalAmount,
              paidAt: nowFormatted,
              paymentReference: inv.activePaymentReference || undefined,
            }));

            playPaymentSuccessChime();
            setNewlyPaidAlert(newlyCompleted[0]);
            setToastNotification(newlyCompleted[0]);

            setCompletedInvoices((prev) => {
              const ids = new Set(newlyCompleted.map((c) => c.saleInvoiceId));
              return [...newlyCompleted, ...prev.filter((p) => !ids.has(p.saleInvoiceId))].slice(0, 8);
            });
          }
        }

        knownInvoicesRef.current = new Map(items.map((i) => [i.saleInvoiceId, i]));
        hasLoadedInitialRef.current = true;
        setInvoices(items);
        onPendingCountChangeRef.current?.(items.length);
      } catch (err) {
        if (signal?.aborted) return;
        const msg =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          typeof (err as { response?: { data?: { title?: string } } }).response?.data?.title === 'string'
            ? (err as { response: { data: { title: string } } }).response.data.title
            : 'Không thể tải danh sách hóa đơn chờ từ máy chủ.';
        setListError(msg);
      } finally {
        if (!signal?.aborted && !isSilent) {
          setLoadingList(false);
        }
      }
    },
    [],
  );

  // Initial load + periodic silent background polling every 2.5s
  useEffect(() => {
    const controller = new AbortController();
    void loadPendingInvoices(controller.signal, false);

    const interval = window.setInterval(() => {
      void loadPendingInvoices(controller.signal, true);
    }, 2500);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadPendingInvoices]);

  // Refresh immediately when drawer opens
  useEffect(() => {
    if (!open) return;
    setSearchError(null);
    setReceiptError(null);
    void loadPendingInvoices(undefined, true);
  }, [open, loadPendingInvoices]);

  // Close drawer on Escape (only when child modals are closed)
  useEffect(() => {
    if (!open || selectedInvoice || receiptModalInvoice) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedInvoice, receiptModalInvoice, onClose]);

  // Auto-dismiss floating toast after 6 seconds
  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => {
      setToastNotification(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return invoices;
    return invoices.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.saleInvoiceId.toLowerCase().includes(query),
    );
  }, [invoices, searchQuery]);

  const handleOpenVietQrForInvoice = (invoice: PosPendingInvoiceSummary) => {
    setSearchError(null);
    setSelectedInvoice({
      saleInvoiceId: invoice.saleInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
    });
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchError(null);
      return;
    }

    const exactOrFirstMatch = filteredInvoices[0];
    if (exactOrFirstMatch) {
      setSearchError(null);
      handleOpenVietQrForInvoice(exactOrFirstMatch);
      return;
    }

    if (UUID_REGEX.test(query)) {
      setSearchError(null);
      setSelectedInvoice({ saleInvoiceId: query });
      return;
    }

    setSearchError(`Không tìm thấy hóa đơn chờ khớp với "${query}".`);
  };

  const handleSessionUpdate = useCallback((session: VietQrPaymentSession) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.saleInvoiceId === session.saleInvoiceId
          ? {
              ...inv,
              paymentStatus: session.invoicePaymentStatus,
              activeTransactionId:
                session.status === 'Pending' && !session.isExpired
                  ? session.transactionId
                  : null,
              activePaymentReference:
                session.status === 'Pending' && !session.isExpired
                  ? session.paymentReference
                  : null,
              activeExpiresAt:
                session.status === 'Pending' && !session.isExpired
                  ? session.expiresAt
                  : null,
            }
          : inv,
      ),
    );
  }, []);

  const handlePaymentSuccess = useCallback(
    (session: VietQrPaymentSession) => {
      const nowFormatted = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const record: CompletedInvoiceRecord = {
        saleInvoiceId: session.saleInvoiceId,
        invoiceNumber: session.invoiceNumber,
        totalAmount: session.amount,
        paidAt: nowFormatted,
        paymentReference: session.paymentReference,
      };
      setNewlyPaidAlert(record);
      setToastNotification(record);
      setCompletedInvoices((prev) => [
        record,
        ...prev.filter((p) => p.saleInvoiceId !== session.saleInvoiceId),
      ].slice(0, 8));
      void loadPendingInvoices(undefined, true);
    },
    [loadPendingInvoices],
  );

  const handleOpenCompletedReceipt = async (invoiceNumber: string) => {
    setReceiptError(null);
    setLoadingReceiptNumber(invoiceNumber);
    try {
      const detail = await posApi.getInvoiceDetail(invoiceNumber);
      setReceiptModalInvoice(detail);
    } catch {
      setReceiptError(`Không tải được chi tiết hóa đơn ${invoiceNumber} để in bill.`);
    } finally {
      setLoadingReceiptNumber(null);
    }
  };

  return (
    <>
      {/* Slide-over Chờ VietQR Drawer */}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[950] flex justify-end bg-ink/40 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Hóa đơn chờ VietQR"
              className="relative flex h-full w-full max-w-md flex-col bg-paper shadow-2xl border-l border-brand-lavender/40"
            >
              {/* Top brand gradient hairline */}
              <div
                aria-hidden="true"
                className="h-1 w-full shrink-0"
                style={{
                  background:
                    'linear-gradient(90deg, var(--color-brand-pink-gradient), var(--color-brand-lavender-gradient) 52%, var(--color-brand-blue-gradient))',
                }}
              />

              {/* Drawer Header */}
              <header className="shrink-0 border-b border-border/70 bg-brand-pink-surface/65 px-4 py-3.5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight">
                      <QrCode className="size-4" aria-hidden="true" />
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-extrabold text-brand-ink truncate">
                        Hóa đơn chờ VietQR
                      </h3>
                      <Badge variant={invoices.length > 0 ? 'warning' : 'neutral'}>
                        {invoices.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void loadPendingInvoices()}
                      disabled={loadingList}
                      aria-label="Làm mới danh sách hóa đơn chờ"
                      title="Làm mới ngay"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-brand-pink-light hover:text-brand-ink disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`size-4 ${loadingList ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Đóng ngăn hóa đơn chờ VietQR"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-brand-pink-light hover:text-brand-ink cursor-pointer"
                    >
                      <X className="size-4.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Inline Filter / Search Input */}
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchError) setSearchError(null);
                      }}
                      placeholder="Tìm theo mã hóa đơn (VD: INV...)..."
                      className="w-full rounded-xl border border-border/80 bg-paper pl-8 pr-8 py-1.5 text-xs text-ink placeholder:text-muted/70 focus:border-brand-highlight focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchError(null);
                        }}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {searchError && (
                    <p className="mt-1 text-[11px] font-medium text-red-700">{searchError}</p>
                  )}
                </form>
              </header>

              {/* Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
                {newlyPaidAlert && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-900">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" aria-hidden="true" />
                        <span className="font-extrabold">
                          Đã nhận thanh toán {newlyPaidAlert.invoiceNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewlyPaidAlert(null)}
                        className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                        aria-label="Ẩn thông báo thanh toán"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-emerald-800">
                        {formatVndCurrency(newlyPaidAlert.totalAmount)} • {newlyPaidAlert.paidAt}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={loadingReceiptNumber === newlyPaidAlert.invoiceNumber}
                        startIcon={<Printer className="size-3.5" aria-hidden="true" />}
                        onClick={() => void handleOpenCompletedReceipt(newlyPaidAlert.invoiceNumber)}
                        className="border-emerald-300 bg-white text-emerald-900 enabled:hover:bg-emerald-100 enabled:hover:border-emerald-400"
                      >
                        In bill
                      </Button>
                    </div>
                  </div>
                )}

                {receiptError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {receiptError}
                  </p>
                )}

                {listError && (
                  <ErrorState
                    title="Không thể tải hóa đơn chờ"
                    description={listError}
                    onRetry={() => void loadPendingInvoices()}
                    loading={loadingList}
                    className="py-4"
                  />
                )}

                {/* Pending List */}
                <section className="space-y-2.5">
                  {loadingList && invoices.length === 0 ? (
                    <SkeletonLoading variant="list" count={3} />
                  ) : filteredInvoices.length === 0 ? (
                    <EmptyState
                      icon={<Receipt className="size-6 text-brand-highlight" aria-hidden="true" />}
                      title={
                        searchQuery.trim()
                          ? 'Không có hóa đơn phù hợp'
                          : 'Không có hóa đơn chờ VietQR'
                      }
                      description={
                        searchQuery.trim()
                          ? 'Thử xóa từ khóa tìm kiếm hoặc làm mới danh sách.'
                          : 'Các hóa đơn VietQR chưa hoàn tất sẽ xuất hiện tại đây để mở lại mã QR nhanh.'
                      }
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            searchQuery.trim() ? setSearchQuery('') : void loadPendingInvoices()
                          }
                        >
                          {searchQuery.trim() ? 'Xóa bộ lọc' : 'Kiểm tra lại'}
                        </Button>
                      }
                    />
                  ) : (
                    filteredInvoices.map((inv) => {
                      const hasActiveQr = Boolean(inv.activeTransactionId && inv.activePaymentReference);
                      const isPaid = inv.paymentStatus === 'Paid';
                      const createdAtDate = new Date(inv.createdAt);
                      const formattedTime = !isNaN(createdAtDate.getTime())
                        ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : '';

                      return (
                        <div
                          key={inv.saleInvoiceId}
                          className="rounded-2xl border border-border/75 bg-white p-3.5 space-y-2.5 transition-all hover:border-brand-pink shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-extrabold text-ink truncate">
                                  {inv.invoiceNumber}
                                </span>
                                {isPaid ? (
                                  <Badge variant="success">Đã thanh toán</Badge>
                                ) : hasActiveQr ? (
                                  <Badge variant="warning">
                                    <Clock className="size-3" aria-hidden="true" />
                                    Đang chờ QR
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral">Chưa thanh toán</Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-muted">
                                {formattedTime && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="size-3" aria-hidden="true" />
                                    {formattedTime}
                                  </span>
                                )}
                                <span className="text-muted/50">•</span>
                                <span
                                  className="font-mono text-[10.5px]"
                                  title={`ID: ${inv.saleInvoiceId}`}
                                >
                                  #{inv.saleInvoiceId.slice(-8).toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <span className="font-mono text-sm font-black tabular-nums text-brand-ink shrink-0">
                              {formatVndCurrency(inv.totalAmount)}
                            </span>
                          </div>

                          {!isPaid && (
                            <div className="flex justify-end pt-1 border-t border-border/40">
                              <Button
                                variant={hasActiveQr ? 'secondary' : 'primary'}
                                size="sm"
                                startIcon={<QrCode className="size-3.5" aria-hidden="true" />}
                                onClick={() => handleOpenVietQrForInvoice(inv)}
                              >
                                {hasActiveQr ? 'Xem mã QR' : 'Mở VietQR'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </section>

                {/* Recently Paid in Session with Direct Print Bill */}
                {completedInvoices.length > 0 && (
                  <section className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                        Vừa thanh toán gần đây
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700">
                        {completedInvoices.length} đơn
                      </span>
                    </div>

                    <div className="space-y-2">
                      {completedInvoices.map((item) => (
                        <div
                          key={item.saleInvoiceId}
                          className="rounded-xl border border-emerald-200/80 bg-emerald-50/35 px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-ink truncate">
                              {item.invoiceNumber}
                            </p>
                            <p className="text-[11px] text-muted">
                              {item.paidAt} •{' '}
                              <span className="font-mono font-bold text-emerald-700">
                                {formatVndCurrency(item.totalAmount)}
                              </span>
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            loading={loadingReceiptNumber === item.invoiceNumber}
                            startIcon={<Printer className="size-3.5" aria-hidden="true" />}
                            onClick={() => void handleOpenCompletedReceipt(item.invoiceNumber)}
                            className="shrink-0 border-emerald-300 bg-white text-emerald-900 enabled:hover:bg-emerald-50 enabled:hover:border-emerald-400"
                          >
                            In bill
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )}

      {/* VietQR Payment Modal */}
      <VietQrPaymentModal
        open={Boolean(selectedInvoice)}
        saleInvoiceId={selectedInvoice?.saleInvoiceId ?? null}
        initialInvoiceNumber={selectedInvoice?.invoiceNumber}
        initialAmount={selectedInvoice?.totalAmount}
        onClose={() => setSelectedInvoice(null)}
        onSessionUpdate={handleSessionUpdate}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Completed VietQR Bill Print & PDF Modal */}
      <PosInvoiceSuccessModal
        open={Boolean(receiptModalInvoice)}
        invoice={receiptModalInvoice}
        paymentMethod="vietqr"
        onClose={() => setReceiptModalInvoice(null)}
      />

      {/* Floating Toast Notification for Real-time Webhook Confirmation (z-[3000]) */}
      {toastNotification &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed top-5 right-5 z-[3000] flex max-w-sm items-start gap-3.5 rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="size-6 animate-pulse" aria-hidden="true" />
            </div>
            <div className="flex-1 pr-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-emerald-950">
                  Thanh toán thành công!
                </h4>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {toastNotification.paidAt}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink leading-relaxed">
                Hóa đơn <strong className="font-bold text-ink">{toastNotification.invoiceNumber}</strong> đã nhận đủ{' '}
                <strong className="font-bold text-emerald-700">
                  {formatVndCurrency(toastNotification.totalAmount)}
                </strong>{' '}
                qua VietQR.
              </p>
              {toastNotification.paymentReference && (
                <p className="mt-1 text-[11px] text-muted">
                  Mã GD: <code className="font-mono font-bold text-ink">{toastNotification.paymentReference}</code>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-highlight cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

export default PosVietQrWorkspace;
