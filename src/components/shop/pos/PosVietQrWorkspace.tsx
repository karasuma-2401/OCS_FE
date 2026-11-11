import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  RefreshCw,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Receipt,
  Search,
  Calendar,
  X,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeaderCard, SkeletonLoading } from '@/components/shared';
import { posPaymentsApi } from '@/api/posPayments';
import {
  VietQrPaymentModal,
  formatVndCurrency,
  playPaymentSuccessChime,
} from './VietQrPaymentModal';
import type { PosPendingInvoiceSummary, VietQrPaymentSession } from '@/types';

interface CompletedInvoiceRecord {
  saleInvoiceId: string;
  invoiceNumber: string;
  totalAmount: string | number;
  paidAt: string;
  paymentReference?: string;
}

export const PosVietQrWorkspace: React.FC = () => {
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

  const [lastCompletedSession, setLastCompletedSession] =
    useState<VietQrPaymentSession | null>(null);
  const [completedInvoices, setCompletedInvoices] = useState<CompletedInvoiceRecord[]>([]);
  const [newlyPaidAlert, setNewlyPaidAlert] = useState<CompletedInvoiceRecord | null>(null);
  const [toastNotification, setToastNotification] = useState<CompletedInvoiceRecord | null>(null);
  const knownInvoicesRef = React.useRef<Map<string, PosPendingInvoiceSummary>>(new Map());
  const hasLoadedInitialRef = React.useRef(false);

  const loadPendingInvoices = useCallback(
    async (signal?: AbortSignal, isSilent = false) => {
      if (!isSilent) {
        setLoadingList(true);
      }
      setListError(null);
      try {
        const items = await posPaymentsApi.listPendingInvoices(signal);

        // Detect newly paid invoices if we previously had pending invoices loaded
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

            // Play auditory feedback
            playPaymentSuccessChime();

            // Set top alert and floating toast for the latest completed invoice
            setNewlyPaidAlert(newlyCompleted[0]);
            setToastNotification(newlyCompleted[0]);

            // Add to completed invoices list
            setCompletedInvoices((prev) => {
              const ids = new Set(newlyCompleted.map((c) => c.saleInvoiceId));
              return [...newlyCompleted, ...prev.filter((p) => !ids.has(p.saleInvoiceId))].slice(0, 8);
            });
          }
        }

        // Update known invoices cache
        knownInvoicesRef.current = new Map(items.map((i) => [i.saleInvoiceId, i]));
        hasLoadedInitialRef.current = true;
        setInvoices(items);
      } catch (err) {
        if (signal?.aborted) return;
        const msg =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          typeof (err as { response?: { data?: { title?: string } } }).response?.data?.title === 'string'
            ? (err as { response: { data: { title: string } } }).response.data.title
            : 'Không thể tải danh sách hóa đơn chờ từ máy chủ. Vui lòng bấm thử lại.';
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

  const handleOpenVietQrForInvoice = (invoice: PosPendingInvoiceSummary) => {
    setSearchError(null);
    setSelectedInvoice({
      saleInvoiceId: invoice.saleInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
    });
  };

  const handleQuickSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Vui lòng nhập mã hóa đơn (ví dụ: HD-POS-DEMO-001) hoặc mã UUID.');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(query);

    // Try finding by exact UUID or invoiceNumber or partial invoiceNumber
    const matched = invoices.find((item) => {
      if (isUuid && item.saleInvoiceId.toLowerCase() === query.toLowerCase()) return true;
      if (item.invoiceNumber.toLowerCase() === query.toLowerCase()) return true;
      if (item.invoiceNumber.toLowerCase().includes(query.toLowerCase())) return true;
      return false;
    });

    if (matched) {
      setSearchError(null);
      setSelectedInvoice({
        saleInvoiceId: matched.saleInvoiceId,
        invoiceNumber: matched.invoiceNumber,
        totalAmount: matched.totalAmount,
      });
      return;
    }

    // If query is an unknown UUID, allow opening it directly
    if (isUuid) {
      setSearchError(null);
      setSelectedInvoice({
        saleInvoiceId: query,
        invoiceNumber: undefined,
        totalAmount: undefined,
      });
      return;
    }

    setSearchError(`Không tìm thấy hóa đơn nào khớp với "${query}".`);
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
      setLastCompletedSession(session);
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

  // Auto-dismiss floating toast after 6 seconds
  useEffect(() => {
    if (!toastNotification) return;
    const timer = window.setTimeout(() => {
      setToastNotification(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [toastNotification]);

  return (
    <div className="space-y-5">
      <PageHeaderCard
        icon={<QrCode size={24} aria-hidden="true" />}
        title="Thanh toán VietQR tại quầy"
        description="Quét mã tức thì qua Mobile Banking, đối soát giao dịch tự động 100%."
        actions={
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Cổng thanh toán sẵn sàng
            </span>
            <Button
              variant="outline"
              size="sm"
              loading={loadingList}
              loadingText="Đang tải..."
              startIcon={<RefreshCw className="size-3.5" aria-hidden="true" />}
              onClick={() => void loadPendingInvoices()}
            >
              Làm mới danh sách
            </Button>
          </>
        }
      />

      {/* Prominent Real-time Payment Success Banner */}
      {(newlyPaidAlert || lastCompletedSession) && (
        <div
          className="flex flex-col gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/95 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="size-6 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-emerald-950">
                  🎉 THANH TOÁN THÀNH CÔNG!
                </span>
                <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                  {newlyPaidAlert?.paidAt || 'Vừa xong'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-900">
                Hóa đơn <strong className="font-bold text-emerald-950">{newlyPaidAlert?.invoiceNumber || lastCompletedSession?.invoiceNumber}</strong> (
                {formatVndCurrency(newlyPaidAlert?.totalAmount || lastCompletedSession?.amount)}) đã thanh toán thành công qua VietQR
                {(newlyPaidAlert?.paymentReference || lastCompletedSession?.paymentReference) && (
                  <> • Mã GD: <code className="font-mono font-bold text-emerald-950">{newlyPaidAlert?.paymentReference || lastCompletedSession?.paymentReference}</code></>
                )}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewlyPaidAlert(null);
              setLastCompletedSession(null);
            }}
            className="self-end rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 sm:self-center"
          >
            Đóng thông báo
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: Clean Pending Invoices List (No ugly UUIDs) */}
        <div className="space-y-3 lg:col-span-8">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-brand-highlight" aria-hidden="true" />
                <h3 className="text-sm font-bold text-ink">Hóa đơn chờ thanh toán tại quầy</h3>
              </div>
              <Badge variant="neutral">{invoices.length} hóa đơn</Badge>
            </div>

            {listError && (
              <div className="mb-4">
                <ErrorState
                  title="Không thể tải hóa đơn chờ"
                  description={listError}
                  onRetry={() => void loadPendingInvoices()}
                  loading={loadingList}
                  className="py-4"
                />
              </div>
            )}

            {loadingList && invoices.length === 0 ? (
              <SkeletonLoading variant="list" count={3} />
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={<Receipt className="size-6 text-brand-highlight" aria-hidden="true" />}
                title="Chưa có hóa đơn chờ thanh toán"
                description="Khi thu ngân chốt đơn tại POS, hóa đơn chưa thanh toán sẽ xuất hiện tại đây để tạo mã VietQR nhanh."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadPendingInvoices()}
                  >
                    Kiểm tra lại
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => {
                  const hasActiveQr = Boolean(inv.activeTransactionId && inv.activePaymentReference);
                  const isPaid = inv.paymentStatus === 'Paid';

                  // Human-friendly time formatting
                  const createdAtDate = new Date(inv.createdAt);
                  const formattedTime = !isNaN(createdAtDate.getTime())
                    ? createdAtDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={inv.saleInvoiceId}
                      className="group flex flex-col justify-between gap-3.5 rounded-2xl border border-border/70 bg-paper p-4 transition-all hover:border-brand-pink hover:shadow-xs sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Receipt className="size-4 text-brand-highlight" aria-hidden="true" />
                          <span className="text-base font-bold text-ink">{inv.invoiceNumber}</span>
                          {isPaid ? (
                            <Badge variant="success">Đã thanh toán</Badge>
                          ) : hasActiveQr ? (
                            <Badge variant="warning">
                              <Clock className="size-3" aria-hidden="true" />
                              Đang chờ quét QR
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Chưa thanh toán</Badge>
                          )}
                        </div>

                        {/* Professional POS metadata without raw 36-char UUID */}
                        <div className="flex items-center gap-3 text-xs text-muted">
                          {formattedTime && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3 text-muted" aria-hidden="true" />
                              Tạo lúc {formattedTime}
                            </span>
                          )}
                          <span className="text-muted/60">•</span>
                          <span
                            className="font-mono text-[11px] text-muted hover:text-ink cursor-help"
                            title={`ID đầy đủ: ${inv.saleInvoiceId}`}
                          >
                            Mã ID: #{inv.saleInvoiceId.slice(-8).toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-muted">Cần thanh toán</p>
                          <p className="text-lg font-black text-brand-ink">
                            {formatVndCurrency(inv.totalAmount)}
                          </p>
                        </div>

                        {!isPaid && (
                          <Button
                            variant={hasActiveQr ? 'secondary' : 'primary'}
                            size="md"
                            startIcon={<QrCode className="size-4" aria-hidden="true" />}
                            onClick={() => handleOpenVietQrForInvoice(inv)}
                          >
                            {hasActiveQr ? 'Xem mã QR' : 'Mở VietQR'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recently Completed Invoices */}
          {completedInvoices.length > 0 && (
            <Card className="border-emerald-200/80 bg-emerald-50/25 p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  <h3 className="text-sm font-bold text-emerald-950">
                    Vừa thanh toán thành công gần đây
                  </h3>
                </div>
                <Badge variant="success" className="text-xs">
                  {completedInvoices.length} hóa đơn
                </Badge>
              </div>

              <div className="space-y-2.5">
                {completedInvoices.map((item) => (
                  <div
                    key={item.saleInvoiceId}
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-emerald-200/80 bg-white p-3.5 transition-all sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <Receipt className="size-4" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{item.invoiceNumber}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Đã thanh toán
                          </span>
                        </div>
                        <p className="text-[11px] text-muted">
                          Thời gian: <strong className="text-ink">{item.paidAt}</strong>
                          {item.paymentReference ? (
                            <>
                              {' '}
                              • Mã GD:{' '}
                              <code className="font-mono text-ink">
                                {item.paymentReference}
                              </code>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-muted">Đã thanh toán</p>
                      <p className="text-base font-extrabold text-emerald-700">
                        {formatVndCurrency(item.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Quick Search by Invoice Number or UUID + Cashier Guidelines */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-brand-highlight" aria-hidden="true" />
              <h3 className="text-sm font-bold text-ink">Mở nhanh hóa đơn</h3>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Nhập mã hóa đơn (ví dụ: <code className="font-semibold text-ink">HD-POS-DEMO-001</code> hoặc <code className="font-semibold text-ink">001</code>) để mở ngay.
            </p>

            <form onSubmit={handleQuickSearchSubmit} className="mt-3.5 space-y-3">
              <Input
                placeholder="Nhập mã hóa đơn (hoặc UUID)..."
                value={searchQuery}
                error={searchError || undefined}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (searchError) setSearchError(null);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                endIcon={<ArrowRight className="size-4" aria-hidden="true" />}
              >
                Mở màn hình VietQR
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-highlight" aria-hidden="true" />
              <div className="space-y-1.5 text-xs text-muted">
                <h4 className="font-bold text-ink">Quy tắc thanh toán tại quầy</h4>
                <p className="leading-relaxed">
                  1. Thu ngân bấm vào mã QR trên màn hình để phóng to toàn màn hình cho khách đứng đối diện quét dễ dàng.
                </p>
                <p className="leading-relaxed">
                  2. Hệ thống tự động xác nhận chuyển khoản. Tuyệt đối không giao hàng khi chưa có thông báo thành công.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

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
      {/* Floating Toast Notification for Payment Confirmation (z-[3000]) */}
      {toastNotification && typeof document !== 'undefined' && createPortal(
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
              <strong className="font-bold text-emerald-700">{formatVndCurrency(toastNotification.totalAmount)}</strong> qua VietQR.
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
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-highlight"
            aria-label="Đóng thông báo"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default PosVietQrWorkspace;
