import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  BarChart3,
  Download,
  PackageCheck,
  TrendingUp,
  Wallet,
  Banknote,
  QrCode,
  Clock,
  Receipt,
} from 'lucide-react';
import {
  reportsApi,
  type BuyoutProfitDetail,
  type BuyoutProfitReport,
  type ConsignmentCommissionDetail,
  type ConsignmentCommissionReport,
  type ExportReportType,
  type OverviewSeriesPoint,
  type PosRevenueDetail,
  type PosRevenueReport,
  type ReportGroupBy,
  type ReportOverview,
} from '@/api/reports';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PageHeaderCard,
  Pagination,
  Select,
  Table,
  TableDetailButton,
  type TableColumn,
} from '@/components/shared';
import { ShopSummaryStrip, type ShopSummaryCard } from './ShopSummaryStrip';

type DatePreset = 'today' | '7days' | 'month' | 'custom';

function vnTodayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value ?? '2026';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const d = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function monthStartIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function money(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} ₫`;
}

function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

type DetailModalData =
  | { kind: 'pos'; row: PosRevenueDetail }
  | { kind: 'commission'; row: ConsignmentCommissionDetail }
  | { kind: 'buyout'; row: BuyoutProfitDetail }
  | null;

export const ReportsDashboard: React.FC = () => {
  const today = useMemo(() => vnTodayIso(), []);
  const [preset, setPreset] = useState<DatePreset>('today');
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(today);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('hour');
  const [activeReport, setActiveReport] = useState<ExportReportType>('pos');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [posReport, setPosReport] = useState<PosRevenueReport | null>(null);
  const [commissionReport, setCommissionReport] = useState<ConsignmentCommissionReport | null>(null);
  const [buyoutReport, setBuyoutReport] = useState<BuyoutProfitReport | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);
  const [detailModal, setDetailModal] = useState<DetailModalData>(null);

  const applyPreset = (next: DatePreset) => {
    setPreset(next);
    setPage(1);
    if (next === 'today') {
      setFrom(today);
      setTo(today);
      setGroupBy('hour');
    } else if (next === '7days') {
      setFrom(shiftIsoDate(today, -6));
      setTo(today);
      setGroupBy('day');
    } else if (next === 'month') {
      setFrom(monthStartIso(today));
      setTo(today);
      setGroupBy('day');
    }
  };

  const loadData = useCallback(async () => {
    if (from > to) {
      setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');
      return;
    }
    setLoading(true);
    setError('');
    const effectiveGroupBy: ReportGroupBy = groupBy === 'hour' && from !== to ? 'day' : groupBy;
    const baseParams = { from, to, groupBy: effectiveGroupBy };

    try {
      const ovPromise = reportsApi.overview(baseParams);
      if (activeReport === 'pos') {
        const [ov, pos] = await Promise.all([
          ovPromise,
          reportsApi.posRevenue({ ...baseParams, paymentMethod: paymentMethod || undefined, page, pageSize }),
        ]);
        setOverview(ov);
        setPosReport(pos);
      } else if (activeReport === 'commission') {
        const [ov, comm] = await Promise.all([
          ovPromise,
          reportsApi.consignmentCommissions({ ...baseParams, page, pageSize }),
        ]);
        setOverview(ov);
        setCommissionReport(comm);
      } else {
        const [ov, bo] = await Promise.all([
          ovPromise,
          reportsApi.buyoutProfit({ ...baseParams, page, pageSize }),
        ]);
        setOverview(ov);
        setBuyoutReport(bo);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError('Bạn không có quyền xem dữ liệu báo cáo tài chính.');
      } else if (isAxiosError(err)) {
        const status = err.response?.status;
        const detail = (err.response?.data as { title?: string; detail?: string; message?: string } | undefined)?.title
          || (err.response?.data as { detail?: string } | undefined)?.detail
          || err.message;
        setError(`Không thể tải dữ liệu báo cáo tài chính${status ? ` (HTTP ${status})` : ''}: ${detail}`);
      } else {
        setError('Không thể tải dữ liệu báo cáo tài chính. Vui lòng bấm Thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeReport, from, groupBy, page, paymentMethod, to]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const effectiveGroupBy: ReportGroupBy = groupBy === 'hour' && from !== to ? 'day' : groupBy;
      const blob = await reportsApi.exportCsv(activeReport, {
        from,
        to,
        groupBy: effectiveGroupBy,
        paymentMethod: activeReport === 'pos' && paymentMethod ? paymentMethod : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-${activeReport}-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Xuất file CSV thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const posColumns: TableColumn<PosRevenueDetail>[] = [
    { key: 'invoiceNumber', header: 'Mã hóa đơn', render: r => <span className="font-semibold text-ink">{r.invoiceNumber}</span> },
    { key: 'occurredAt', header: 'Thời gian', render: r => <span className="text-xs text-muted tabular-nums">{dateTime(r.occurredAt)}</span> },
    {
      key: 'paymentMethod',
      header: 'Phương thức',
      render: r => (
        <Badge variant={r.paymentMethod === 'VietQr' ? 'payment' : 'info'}>
          {r.paymentMethod === 'Cash' ? 'Tiền mặt' : r.paymentMethod === 'VietQr' ? 'VietQR' : r.paymentMethod}
        </Badge>
      ),
    },
    { key: 'itemCount', header: 'SL SP', render: r => <span className="tabular-nums">{r.itemCount}</span> },
    { key: 'amount', header: 'Số tiền', render: r => <span className="font-bold text-ink tabular-nums">{money(r.amount)}</span> },
    { key: 'cashierName', header: 'Thu ngân', render: r => <span className="text-xs text-muted">{r.cashierName || '—'}</span> },
    { key: 'actions', header: '', render: r => <TableDetailButton onClick={() => setDetailModal({ kind: 'pos', row: r })} /> },
  ];

  const commissionColumns: TableColumn<ConsignmentCommissionDetail>[] = [
    { key: 'payoutNumber', header: 'Mã lệnh chi', render: r => <span className="font-semibold text-ink">{r.payoutNumber}</span> },
    { key: 'contractNumber', header: 'Hợp đồng', render: r => <span className="text-xs font-medium text-ink">{r.contractNumber}</span> },
    { key: 'customerName', header: 'Khách ký gửi', render: r => <span className="text-xs text-muted">{r.customerName || '—'}</span> },
    { key: 'completedAt', header: 'Hoàn tất lúc', render: r => <span className="text-xs text-muted tabular-nums">{dateTime(r.completedAt)}</span> },
    { key: 'saleProceeds', header: 'Doanh số bán', render: r => <span className="tabular-nums">{money(r.saleProceedsAmount)}</span> },
    { key: 'commission', header: 'Hoa hồng', render: r => <span className="font-bold text-state-success-strong tabular-nums">{money(r.commissionAmount)}</span> },
    { key: 'actions', header: '', render: r => <TableDetailButton onClick={() => setDetailModal({ kind: 'commission', row: r })} /> },
  ];

  const buyoutColumns: TableColumn<BuyoutProfitDetail>[] = [
    { key: 'barcode', header: 'Barcode', render: r => <span className="font-mono text-xs font-semibold text-ink">{r.barcode}</span> },
    { key: 'productName', header: 'Sản phẩm', render: r => <span className="font-medium text-ink">{r.productName}</span> },
    { key: 'invoiceNumber', header: 'Hóa đơn bán', render: r => <span className="text-xs text-muted">{r.invoiceNumber}</span> },
    { key: 'purchasePrice', header: 'Giá thu mua', render: r => <span className="tabular-nums text-muted">{money(r.purchasePrice)}</span> },
    { key: 'salePrice', header: 'Giá bán lại', render: r => <span className="tabular-nums">{money(r.salePrice)}</span> },
    {
      key: 'profit',
      header: 'Lợi nhuận',
      render: r => (
        <span className={`font-bold tabular-nums ${r.profit >= 0 ? 'text-state-success-strong' : 'text-state-danger'}`}>
          {money(r.profit)}
        </span>
      ),
    },
    { key: 'actions', header: '', render: r => <TableDetailButton onClick={() => setDetailModal({ kind: 'buyout', row: r })} /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeaderCard
        icon={<BarChart3 size={24} aria-hidden="true" />}
        title="Báo Cáo & Thống Kê Tài Chính"
        description="Theo dõi doanh thu POS, hoa hồng ký gửi đã hoàn tất, chi phí mua đứt và lợi nhuận bán lại theo thời gian."
        actions={
          <Button
            variant="outline"
            onClick={() => void handleExportCsv()}
            loading={exporting}
            disabled={loading}
            startIcon={<Download size={16} />}
          >
            Xuất CSV
          </Button>
        }
      />

      {/* Filter Bar */}
      <Card className="!bg-white !p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['today', 'Hôm nay'],
                ['7days', '7 ngày qua'],
                ['month', 'Tháng này'],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={preset === id ? 'primary' : 'outline'}
                onClick={() => applyPreset(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Từ ngày
              <input
                type="date"
                value={from}
                max={to}
                onChange={e => {
                  setPreset('custom');
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-control border border-border bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-pink-focus focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Đến ngày
              <input
                type="date"
                value={to}
                min={from}
                onChange={e => {
                  setPreset('custom');
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-control border border-border bg-paper px-3 py-1.5 text-sm text-ink focus:border-brand-pink-focus focus:outline-none"
              />
            </label>
            <div className="w-36">
              <Select
                label="Chu kỳ"
                value={from !== to && groupBy === 'hour' ? 'day' : groupBy}
                onChange={e => {
                  setGroupBy(e.target.value as ReportGroupBy);
                  setPage(1);
                }}
              >
                {from === to && <option value="hour">Khung giờ</option>}
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {error && <ErrorState description={error} onRetry={() => void loadData()} />}

      <ShopSummaryStrip<'pos' | 'commission' | 'buyout' | 'onSale'>
        gridClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        loading={loading && !overview}
        activeQuickFilter={activeReport}
        onSelectQuickFilter={id => {
          if (id === 'onSale') return;
          setActiveReport(id);
          setPage(1);
        }}
        ariaLabel="Chỉ số báo cáo tài chính"
        loadingLabel="Đang tổng hợp dữ liệu báo cáo tài chính..."
        cards={
          [
            {
              id: 'pos',
              label: 'Tổng doanh thu POS',
              value: overview?.posRevenue,
              formatValue: money,
              hint: overview
                ? `${overview.posInvoiceCount} hóa đơn đã thu · ${overview.from} → ${overview.to}`
                : 'Đang tải...',
              icon: Receipt,
              tone: 'bg-brand-pink-light text-brand-highlight',
            },
            {
              id: 'commission',
              label: 'Hoa hồng ký gửi',
              value: overview?.completedCommission,
              formatValue: money,
              hint: overview
                ? `Từ ${overview.completedPayoutCount} lệnh chi đã hoàn tất`
                : 'Đang tải...',
              icon: Wallet,
              tone: 'bg-state-success-soft text-state-success',
            },
            {
              id: 'buyout',
              label: 'Lợi nhuận mua đứt',
              value: overview?.buyoutResaleProfit,
              formatValue: money,
              hint: overview
                ? `${overview.soldBuyoutProductCount} SP bán lại · Chi: ${money(overview.buyoutPurchaseCost)}`
                : 'Đang tải...',
              icon: TrendingUp,
              tone: 'bg-state-info-soft text-state-info',
            },
            {
              id: 'onSale',
              label: 'Hàng đang bán (hiện tại)',
              value: overview?.activeOnSaleCount,
              hint: overview
                ? overview.pendingPosTransactionCount > 0
                  ? `${overview.pendingPosTransactionCount} giao dịch POS chờ đồng bộ`
                  : 'Không có giao dịch POS chờ xử lý'
                : 'Đang tải...',
              icon: PackageCheck,
              tone: 'bg-brand-pink-light text-brand-highlight',
            },
          ] satisfies ShopSummaryCard<'pos' | 'commission' | 'buyout' | 'onSale'>[]
        }
      />

      {overview ? (
        <>

          {/* Report Switcher Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['pos', 'Doanh thu POS'],
                ['commission', 'Hoa hồng ký gửi'],
                ['buyout', 'Mua đứt & Lợi nhuận'],
              ] as const
            ).map(([tab, label]) => (
              <Button
                key={tab}
                variant={activeReport === tab ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveReport(tab);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Active Report Section */}
          {activeReport === 'pos' && posReport && (
            <PosReportSection
              report={posReport}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={val => {
                setPaymentMethod(val);
                setPage(1);
              }}
              columns={posColumns}
              page={page}
              onPageChange={setPage}
              loading={loading}
            />
          )}

          {activeReport === 'commission' && commissionReport && (
            <CommissionReportSection
              report={commissionReport}
              columns={commissionColumns}
              page={page}
              onPageChange={setPage}
              loading={loading}
            />
          )}

          {activeReport === 'buyout' && buyoutReport && (
            <BuyoutReportSection
              report={buyoutReport}
              columns={buyoutColumns}
              page={page}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </>
      ) : null}

      {/* Detail Modal */}
      <Modal
        open={detailModal !== null}
        onClose={() => setDetailModal(null)}
        title={
          detailModal?.kind === 'pos'
            ? `Chi tiết hóa đơn ${detailModal.row.invoiceNumber}`
            : detailModal?.kind === 'commission'
              ? `Chi tiết lệnh chi ${detailModal.row.payoutNumber}`
              : detailModal?.kind === 'buyout'
                ? `Chi tiết sản phẩm ${detailModal.row.barcode}`
                : ''
        }
      >
        {detailModal?.kind === 'pos' && (
          <div className="space-y-2 text-sm text-ink">
            <p>Mã hóa đơn: <strong>{detailModal.row.invoiceNumber}</strong></p>
            <p>Thời gian thu: {dateTime(detailModal.row.occurredAt)}</p>
            <p>Phương thức: {detailModal.row.paymentMethod}</p>
            <p>Số sản phẩm: {detailModal.row.itemCount}</p>
            <p>Thu ngân: {detailModal.row.cashierName || '—'}</p>
            <p>Số tiền: <strong className="text-brand-highlight">{money(detailModal.row.amount)}</strong></p>
          </div>
        )}
        {detailModal?.kind === 'commission' && (
          <div className="space-y-2 text-sm text-ink">
            <p>Mã lệnh chi: <strong>{detailModal.row.payoutNumber}</strong></p>
            <p>Hợp đồng: {detailModal.row.contractNumber}</p>
            <p>Khách hàng: {detailModal.row.customerName || '—'}</p>
            <p>Hoàn tất lúc: {dateTime(detailModal.row.completedAt)}</p>
            <p>Doanh số bán: {money(detailModal.row.saleProceedsAmount)}</p>
            <p>Hoa hồng cửa hàng: <strong className="text-state-success-strong">{money(detailModal.row.commissionAmount)}</strong></p>
            <p>Phí dịch vụ: {money(detailModal.row.serviceFeeAmount)}</p>
            <p>Thực chi khách: <strong>{money(detailModal.row.netPayoutAmount)}</strong></p>
          </div>
        )}
        {detailModal?.kind === 'buyout' && (
          <div className="space-y-2 text-sm text-ink">
            <p>Sản phẩm: <strong>{detailModal.row.productName}</strong> ({detailModal.row.barcode})</p>
            <p>Phiếu thu mua: {detailModal.row.buyoutNumber || '—'}</p>
            <p>Hóa đơn bán: {detailModal.row.invoiceNumber}</p>
            <p>Thời điểm bán: {dateTime(detailModal.row.soldAt)}</p>
            <p>Giá thu mua: {money(detailModal.row.purchasePrice)}</p>
            <p>Giá bán lại: {money(detailModal.row.salePrice)}</p>
            <p>Lợi nhuận ròng: <strong className="text-state-success-strong">{money(detailModal.row.profit)}</strong></p>
          </div>
        )}
      </Modal>
    </div>
  );
};

function PosReportSection({
  report,
  paymentMethod,
  onPaymentMethodChange,
  columns,
  page,
  onPageChange,
  loading,
}: {
  report: PosRevenueReport;
  paymentMethod: string;
  onPaymentMethodChange: (v: string) => void;
  columns: TableColumn<PosRevenueDetail>[];
  page: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  const cash = report.breakdown.find(b => b.method === 'Cash');
  const vietQr = report.breakdown.find(b => b.method === 'VietQr');
  const peak = report.series.reduce<OverviewSeriesPoint | null>(
    (best, cur) => (!best || cur.posTotalRevenue > best.posTotalRevenue ? cur : best),
    null,
  );
  const peakPct =
    peak && report.totalRevenue > 0
      ? ((peak.posTotalRevenue * 100) / report.totalRevenue).toFixed(1)
      : '0.0';

  const cashPct = cash?.percentage ?? 0;
  const qrPct = vietQr?.percentage ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="!bg-white !p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Banknote size={15} className="text-brand-blue" />
            <span>TIỀN MẶT</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(cash?.amount ?? 0)}</p>
          <p className="text-xs text-muted">{cash?.transactionCount ?? 0} giao dịch đã ghi nhận</p>
        </Card>
        <Card className="!bg-white !p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <QrCode size={15} className="text-brand-pink" />
            <span>VIETQR</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(vietQr?.amount ?? 0)}</p>
          <p className="text-xs text-muted">{vietQr?.transactionCount ?? 0} giao dịch đã xác nhận</p>
        </Card>
        <Card className="!bg-white !p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Clock size={15} className="text-state-warning-icon" />
            <span>CẦN XỬ LÝ / HOÀN TIỀN</span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">
            {report.pendingTransactionCount} giao dịch
          </p>
          <p className="text-xs text-muted">Hoàn tiền trong kỳ: {money(report.refundedAmount)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stacked Bar + Total Line Chart */}
        <Card
          className="lg:col-span-2 !bg-white !p-5"
          title="Doanh thu POS theo thời gian"
          actions={
            peak && peak.posTotalRevenue > 0 ? (
              <Badge variant="info">{`${peak.label}: ${peakPct}%`}</Badge>
            ) : undefined
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" /> Tiền mặt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-pink" /> VietQR
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-brand-ink" /> Tổng doanh thu
            </span>
          </div>
          <PosStackedChart series={report.series} />
        </Card>

        {/* Donut / Breakdown Card */}
        <Card className="!bg-white !p-5" title="Cơ cấu thu tiền">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{
                background:
                  report.totalRevenue > 0
                    ? `conic-gradient(var(--color-brand-blue) 0% ${cashPct}%, var(--color-brand-pink) ${cashPct}% ${cashPct + qrPct}%, var(--color-brand-lavender) ${cashPct + qrPct}% 100%)`
                    : 'var(--color-surface-subtle)',
              }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sm font-bold text-ink">
                {report.totalRevenue > 0 ? '100%' : '0%'}
              </div>
            </div>
            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-ink">Tiền mặt · {cashPct}%</span>
                <span className="tabular-nums text-muted">{money(cash?.amount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-ink">VietQR · {qrPct}%</span>
                <span className="tabular-nums text-muted">{money(vietQr?.amount ?? 0)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-ink">
                <span>Đối chiếu khớp</span>
                <span className="tabular-nums">{money(report.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Table */}
      <Card
        className="!bg-white !p-4"
        title="Giao dịch và hóa đơn"
        actions={
          <div className="w-44">
            <Select
              value={paymentMethod}
              onChange={e => onPaymentMethodChange(e.target.value)}
            >
              <option value="">Tất cả phương thức</option>
              <option value="Cash">Tiền mặt</option>
              <option value="VietQr">VietQR</option>
            </Select>
          </div>
        }
      >
        <Table
          columns={columns}
          data={report.details.items}
          rowKey="transactionId"
          loading={loading}
          emptyTitle="Chưa có giao dịch POS thành công trong kỳ"
        />
        <Pagination
          className="mt-4"
          page={page}
          totalPages={Math.ceil(report.details.totalCount / report.details.pageSize)}
          onPageChange={onPageChange}
        />
      </Card>
    </div>
  );
}

function buildMonotoneSpline(points: Array<{ x: number; y: number }>, baseY: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const ddx = points[i + 1].x - points[i].x || 1;
    const ddy = points[i + 1].y - points[i].y;
    dx.push(ddx);
    dy.push(ddy);
    slopes.push(ddy / ddx);
  }

  const tangents = new Array<number>(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    const cp1x = points[i].x + seg;
    const cp1y = Math.min(baseY, points[i].y + tangents[i] * seg);
    const cp2x = points[i + 1].x - seg;
    const cp2y = Math.min(baseY, points[i + 1].y - tangents[i + 1] * seg);
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${points[i + 1].x.toFixed(2)},${points[i + 1].y.toFixed(2)}`;
  }
  return d;
}

function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}Tr`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return `${value}`;
}

function PosStackedChart({ series }: { series: OverviewSeriesPoint[] }) {
  if (series.length === 0) {
    return <EmptyState title="Chưa có dữ liệu biểu đồ trong khoảng thời gian này" />;
  }
  const maxVal = Math.max(...series.map(s => s.posTotalRevenue), 1);
  const w = 640;
  const h = 215;
  const padX = 34;
  const padY = 26;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const baseY = padY + chartH;
  const step = chartW / series.length;
  const barW = Math.min(26, step * 0.52);

  const curvePoints = series.map((s, idx) => ({
    x: padX + idx * step + step / 2,
    y: padY + chartH - (s.posTotalRevenue / maxVal) * chartH,
  }));
  const linePath = buildMonotoneSpline(curvePoints, baseY);
  const areaPath =
    curvePoints.length > 1
      ? `${linePath} L ${curvePoints[curvePoints.length - 1].x.toFixed(2)},${baseY.toFixed(2)} L ${curvePoints[0].x.toFixed(2)},${baseY.toFixed(2)} Z`
      : '';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full min-w-[460px]" role="img" aria-label="Biểu đồ doanh thu POS">
        <defs>
          <linearGradient id="posLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-brand-pink)" />
            <stop offset="50%" stopColor="var(--color-brand-lavender)" />
            <stop offset="100%" stopColor="var(--color-brand-blue)" />
          </linearGradient>
          <linearGradient id="posAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-brand-pink)" stopOpacity="0.22" />
            <stop offset="65%" stopColor="var(--color-brand-blue)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-brand-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map(ratio => {
          const y = padY + chartH * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--color-border)" strokeDasharray="3 3" />
              <text x={4} y={y + 4} fontSize="10" fill="var(--color-muted)">
                {Math.round(((maxVal * ratio) / 1_000_000) * 10) / 10}M
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill="url(#posAreaGrad)" />}

        {series.map((s, idx) => {
          const x = padX + idx * step + (step - barW) / 2;
          const cashH = (s.posCashRevenue / maxVal) * chartH;
          const qrH = (s.posVietQrRevenue / maxVal) * chartH;
          const yCash = baseY - cashH;
          const yQr = yCash - qrH;
          const topY = Math.min(yCash, yQr);
          return (
            <g key={s.bucketKey}>
              {cashH > 0 && (
                <rect x={x} y={yCash} width={barW} height={cashH} rx={4} fill="var(--color-brand-blue)" />
              )}
              {qrH > 0 && (
                <rect x={x} y={yQr} width={barW} height={qrH} rx={4} fill="var(--color-brand-pink)" />
              )}
              {s.posTotalRevenue > 0 && (
                <text
                  x={padX + idx * step + step / 2}
                  y={Math.max(12, topY - 6)}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="var(--color-brand-highlight)"
                >
                  {formatCompactMoney(s.posTotalRevenue)}
                </text>
              )}
              <text
                x={padX + idx * step + step / 2}
                y={h + 12}
                textAnchor="middle"
                fontSize={series.length > 15 ? '9' : '10'}
                fill="var(--color-muted)"
              >
                {series.length > 12 && /^\d{2}\/\d{2}$/.test(s.label)
                  ? s.label.slice(0, 2)
                  : s.label}
              </text>
            </g>
          );
        })}

        {series.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#posLineGrad)"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function CommissionReportSection({
  report,
  columns,
  page,
  onPageChange,
  loading,
}: {
  report: ConsignmentCommissionReport;
  columns: TableColumn<ConsignmentCommissionDetail>[];
  page: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  const maxVal = Math.max(...report.series.map(s => s.commissionAmount), 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">TỔNG HOA HỒNG ĐÃ HOÀN TẤT</p>
          <p className="mt-1.5 text-xl font-bold text-state-success-strong tabular-nums">{money(report.totalCommission)}</p>
        </Card>
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">DOANH SỐ KÝ GỬI LIÊN QUAN</p>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(report.totalSaleProceeds)}</p>
        </Card>
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">THỰC CHI CHO KHÁCH</p>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(report.totalNetPayout)}</p>
        </Card>
      </div>

      <Card className="!bg-white !p-5" title="Hoa hồng ký gửi theo kỳ">
        {report.series.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu hoa hồng hoàn tất trong kỳ" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {report.series.map(s => (
              <div key={s.bucketKey} className="rounded-xl border border-border bg-paper p-3 text-xs">
                <p className="font-semibold text-muted">{s.label}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className="h-full rounded-full bg-state-success-solid"
                    style={{ width: `${Math.round((s.commissionAmount / maxVal) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 font-bold text-ink tabular-nums">{money(s.commissionAmount)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="!bg-white !p-4" title="Chi tiết lệnh chi đã hoàn tất">
        <Table
          columns={columns}
          data={report.details.items}
          rowKey="payoutId"
          loading={loading}
          emptyTitle="Chưa có lệnh chi hoàn tất trong kỳ"
        />
        <Pagination
          className="mt-4"
          page={page}
          totalPages={Math.ceil(report.details.totalCount / report.details.pageSize)}
          onPageChange={onPageChange}
        />
      </Card>
    </div>
  );
}

function BuyoutReportSection({
  report,
  columns,
  page,
  onPageChange,
  loading,
}: {
  report: BuyoutProfitReport;
  columns: TableColumn<BuyoutProfitDetail>[];
  page: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">CHI PHÍ THU MUA TRONG KỲ</p>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(report.totalPurchaseCost)}</p>
          <p className="text-xs text-muted">{report.paidBuyoutCount} phiếu đã chi</p>
        </Card>
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">DOANH THU BÁN LẠI</p>
          <p className="mt-1.5 text-xl font-bold text-ink tabular-nums">{money(report.resaleRevenue)}</p>
        </Card>
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">GIÁ VỐN HÀNG ĐÃ BÁN</p>
          <p className="mt-1.5 text-xl font-bold text-muted tabular-nums">{money(report.resaleCost)}</p>
        </Card>
        <Card className="!bg-white !p-4">
          <p className="text-xs font-semibold text-muted">LỢI NHUẬN BÁN LẠI</p>
          <p className="mt-1.5 text-xl font-bold text-state-success-strong tabular-nums">{money(report.resaleProfit)}</p>
        </Card>
      </div>

      <Card className="!bg-white !p-4" title="Chi tiết sản phẩm mua đứt đã bán">
        <Table
          columns={columns}
          data={report.details.items}
          rowKey="productId"
          loading={loading}
          emptyTitle="Chưa có sản phẩm mua đứt nào được bán và thanh toán trong kỳ"
        />
        <Pagination
          className="mt-4"
          page={page}
          totalPages={Math.ceil(report.details.totalCount / report.details.pageSize)}
          onPageChange={onPageChange}
        />
      </Card>
    </div>
  );
}
