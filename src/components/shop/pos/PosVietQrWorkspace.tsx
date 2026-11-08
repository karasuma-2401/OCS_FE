import React, { useCallback, useEffect, useState } from 'react';
import {
  QrCode,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input } from '@/components/shared';
import { posPaymentsApi } from '@/api/posPayments';
import { VietQrPaymentModal, formatVndCurrency } from './VietQrPaymentModal';
import type { PosPendingInvoiceSummary, VietQrPaymentSession } from '@/types';

const DEMO_FALLBACK_INVOICES: PosPendingInvoiceSummary[] = [
  {
    saleInvoiceId: '80000000-0000-0000-0000-000000000001',
    invoiceNumber: 'HD-POS-DEMO-001',
    totalAmount: '650000.00',
    paymentStatus: 'Unpaid',
    createdAt: new Date().toISOString(),
    activeTransactionId: null,
    activePaymentReference: null,
    activeExpiresAt: null,
  },
  {
    saleInvoiceId: '80000000-0000-0000-0000-000000000002',
    invoiceNumber: 'HD-POS-DEMO-002',
    totalAmount: '1230000.00',
    paymentStatus: 'Unpaid',
    createdAt: new Date().toISOString(),
    activeTransactionId: null,
    activePaymentReference: null,
    activeExpiresAt: null,
  },
];

export const PosVietQrWorkspace: React.FC = () => {
  const [invoices, setInvoices] = useState<PosPendingInvoiceSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [manualInvoiceId, setManualInvoiceId] = useState('');
  const [manualInputError, setManualInputError] = useState<string | null>(null);

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
      // Preserve usability in local dev while surfacing error message
      setInvoices((prev) => (prev.length > 0 ? prev : DEMO_FALLBACK_INVOICES));
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        typeof (err as { response?: { data?: { title?: string } } }).response?.data?.title === 'string'
          ? (err as { response: { data: { title: string } } }).response.data.title
          : 'Không thể tải danh sách hóa đơn chờ từ máy chủ. Bạn vẫn có thể chọn hóa đơn mẫu hoặc nhập mã UUID hóa đơn bên dưới.';
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
    setManualInputError(null);
    setSelectedInvoice({
      saleInvoiceId: invoice.saleInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
    });
  };

  const handleOpenManualInvoice = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = manualInvoiceId.trim();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trimmed)) {
      setManualInputError('Vui lòng nhập đúng định dạng UUID/GUID của hóa đơn bán lẻ.');
      return;
    }
    setManualInputError(null);
    const matched = invoices.find(
      (item) => item.saleInvoiceId.toLowerCase() === trimmed.toLowerCase(),
    );
    setSelectedInvoice({
      saleInvoiceId: trimmed,
      invoiceNumber: matched?.invoiceNumber,
      totalAmount: matched?.totalAmount,
    });
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
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-pink-light px-3 py-1 text-xs font-bold text-brand-highlight">
              <QrCode className="size-3.5" aria-hidden="true" />
              <span>Thanh toán VietQR Động — Web POS</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-ink">
              Khởi tạo & Theo dõi Thanh toán Chuyển khoản VietQR
            </h2>
            <p className="mt-1 text-sm text-muted">
              Hiển thị mã VietQR tương ứng với hóa đơn, số tiền và nội dung chuyển khoản duy nhất. Hệ thống tự động theo dõi trạng thái chờ và đối soát kết quả.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              loading={loadingList}
              loadingText="Đang tải..."
              startIcon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={() => void loadPendingInvoices()}
            >
              Làm mới danh sách
            </Button>
          </div>
        </div>

        {lastCompletedSession && (
          <div
            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
            role="status"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>
                Hóa đơn <strong>{lastCompletedSession.invoiceNumber}</strong> (
                {formatVndCurrency(lastCompletedSession.amount)}) đã nhận xác nhận chuyển khoản thành công với mã tham chiếu{' '}
                <code className="font-mono font-bold">
                  {lastCompletedSession.paymentReference}
                </code>
                .
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Pending Invoices Table/List */}
        <Card className="p-6 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink">
                Hóa đơn chờ thanh toán tại quầy
              </h3>
              <p className="text-xs text-muted">
                Chọn hóa đơn chưa thanh toán để hiển thị mã VietQR cho khách quét hoặc kiểm tra lại trạng thái giao dịch.
              </p>
            </div>
            <Badge variant="neutral">{invoices.length} hóa đơn</Badge>
          </div>

          {listError && (
            <div className="mb-4">
              <ErrorState
                title="Không thể đồng bộ danh sách hóa đơn chờ"
                description={listError}
                onRetry={() => void loadPendingInvoices()}
                loading={loadingList}
                className="py-5"
              />
            </div>
          )}

          {invoices.length === 0 && !loadingList ? (
            <EmptyState
              title="Chưa có hóa đơn chờ thanh toán"
              description="Khi thu ngân tạo hóa đơn bán lẻ ở trạng thái Unpaid tại POS, hóa đơn sẽ xuất hiện tại đây để khởi tạo mã VietQR."
            />
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const hasActiveQr = Boolean(inv.activeTransactionId && inv.activePaymentReference);
                const isPaid = inv.paymentStatus === 'Paid';

                return (
                  <div
                    key={inv.saleInvoiceId}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-brand-lavender sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="size-4 text-brand-highlight" aria-hidden="true" />
                        <span className="font-bold text-ink">{inv.invoiceNumber}</span>
                        {isPaid ? (
                          <Badge variant="success">Đã thanh toán</Badge>
                        ) : hasActiveQr ? (
                          <Badge variant="warning">
                            <Clock className="size-3" aria-hidden="true" />
                            Đang chờ quét QR ({inv.activePaymentReference})
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Chưa thanh toán (Unpaid)</Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted">
                        ID: {inv.saleInvoiceId}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-muted">Tổng thanh toán</p>
                        <p className="text-base font-extrabold text-brand-ink">
                          {formatVndCurrency(inv.totalAmount)}
                        </p>
                      </div>

                      {!isPaid && (
                        <Button
                          variant={hasActiveQr ? 'secondary' : 'primary'}
                          size="sm"
                          startIcon={<QrCode className="size-4" aria-hidden="true" />}
                          onClick={() => handleOpenVietQrForInvoice(inv)}
                        >
                          {hasActiveQr ? 'Mở & Kiểm tra QR' : 'Hiển thị mã VietQR'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Quick Launch by Invoice UUID + Cashier Policy Card */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="p-6">
            <h3 className="text-base font-bold text-ink">
              Mở VietQR theo Mã định danh Hóa đơn
            </h3>
            <p className="mt-1 text-xs text-muted">
              Nhập hoặc dán mã UUID của hóa đơn vừa tạo từ giỏ hàng POS để mở màn hình quét VietQR ngay lập tức.
            </p>

            <form onSubmit={handleOpenManualInvoice} className="mt-4 space-y-3">
              <Input
                label="Mã UUID Hóa đơn (SaleInvoiceId)"
                placeholder="80000000-0000-0000-0000-000000000001"
                value={manualInvoiceId}
                error={manualInputError || undefined}
                onChange={(e) => {
                  setManualInvoiceId(e.target.value);
                  if (manualInputError) setManualInputError(null);
                }}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                endIcon={<ArrowUpRight className="size-4" aria-hidden="true" />}
              >
                Khởi tạo / Mở màn hình VietQR
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-highlight" aria-hidden="true" />
              <div className="space-y-1.5 text-xs text-muted">
                <h4 className="text-sm font-bold text-ink">
                  Nguyên tắc đối soát VietQR tại POS
                </h4>
                <p>
                  1. Mỗi lần khởi tạo sinh một giao dịch <code className="font-mono font-semibold text-ink">Pending</code> với mã tham chiếu chuyển khoản duy nhất và thời hạn hiệu lực.
                </p>
                <p>
                  2. Việc sinh mã QR <strong>chưa được xem là đã nhận tiền</strong>; hóa đơn giữ trạng thái <code className="font-mono font-semibold text-ink">Unpaid</code> cho đến khi có xác nhận hợp lệ.
                </p>
                <p>
                  3. Thu ngân <strong>không tự bấm xác nhận đã nhận chuyển khoản</strong>; chỉ theo dõi trạng thái chờ hoặc bấm kiểm tra lại kết quả.
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
