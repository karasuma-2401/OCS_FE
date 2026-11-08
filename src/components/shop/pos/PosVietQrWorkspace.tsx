import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, SkeletonLoading } from '@/components/shared';
import { posPaymentsApi } from '@/api/posPayments';
import { VietQrPaymentModal, formatVndCurrency } from './VietQrPaymentModal';
import type { PosPendingInvoiceSummary, VietQrPaymentSession } from '@/types';

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

  const loadPendingInvoices = useCallback(async (signal?: AbortSignal) => {
    setLoadingList(true);
    setListError(null);
    try {
      const items = await posPaymentsApi.listPendingInvoices(signal);
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
      if (!signal?.aborted) {
        setLoadingList(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPendingInvoices(controller.signal);
    return () => controller.abort();
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
      void loadPendingInvoices();
    },
    [loadPendingInvoices],
  );

  return (
    <div className="space-y-5">
      {/* Top Banner: Modern POS Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-lavender/30 bg-paper p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-pink-light text-brand-highlight shadow-2xs">
            <QrCode className="size-5.5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink">Thanh toán VietQR tại quầy</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Cổng thanh toán sẵn sàng
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Quét mã tức thì qua Mobile Banking, đối soát giao dịch tự động 100%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Success Notification Alert */}
      {lastCompletedSession && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-state-success-border bg-state-success-soft px-4 py-3 text-xs text-state-success-strong"
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-state-success-icon" aria-hidden="true" />
            <span>
              Hóa đơn <strong>{lastCompletedSession.invoiceNumber}</strong> (
              {formatVndCurrency(lastCompletedSession.amount)}) đã thanh toán thành công với mã tham chiếu{' '}
              <code className="font-mono font-bold">
                {lastCompletedSession.paymentReference}
              </code>
              .
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastCompletedSession(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Ẩn
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
                              Chờ quét ({inv.activePaymentReference})
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
    </div>
  );
};

export default PosVietQrWorkspace;
