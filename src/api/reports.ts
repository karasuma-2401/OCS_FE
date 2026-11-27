import { apiClient } from './client';

export type ReportGroupBy = 'hour' | 'day' | 'week' | 'month';
export type ExportReportType = 'pos' | 'commission' | 'buyout';

export interface ReportFilterParams {
  from?: string;
  to?: string;
  groupBy?: ReportGroupBy;
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedReportItems<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface OverviewSeriesPoint {
  bucketKey: string;
  label: string;
  posCashRevenue: number;
  posVietQrRevenue: number;
  posOtherRevenue: number;
  posTotalRevenue: number;
  commissionAmount: number;
  buyoutPurchaseCost: number;
  buyoutResaleProfit: number;
}

export interface ReportOverview {
  from: string;
  to: string;
  groupBy: string;
  activeOnSaleCount: number;
  posRevenue: number;
  posInvoiceCount: number;
  pendingPosTransactionCount: number;
  refundedPosAmount: number;
  completedCommission: number;
  completedPayoutCount: number;
  buyoutPurchaseCost: number;
  paidBuyoutCount: number;
  buyoutResaleRevenue: number;
  buyoutResaleCost: number;
  buyoutResaleProfit: number;
  soldBuyoutProductCount: number;
  series: OverviewSeriesPoint[];
}

export interface PosMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface PosRevenueDetail {
  transactionId: string;
  saleInvoiceId: string;
  invoiceNumber: string;
  occurredAt: string;
  paymentMethod: string;
  amount: number;
  itemCount: number;
  cashierName: string | null;
}

export interface PosRevenueReport {
  from: string;
  to: string;
  groupBy: string;
  totalRevenue: number;
  invoiceCount: number;
  pendingTransactionCount: number;
  refundedAmount: number;
  breakdown: PosMethodBreakdown[];
  series: OverviewSeriesPoint[];
  details: PagedReportItems<PosRevenueDetail>;
}

export interface ConsignmentCommissionDetail {
  payoutId: string;
  payoutNumber: string;
  contractNumber: string;
  customerName: string | null;
  completedAt: string;
  saleProceedsAmount: number;
  commissionAmount: number;
  serviceFeeAmount: number;
  netPayoutAmount: number;
}

export interface ConsignmentCommissionSeries {
  bucketKey: string;
  label: string;
  commissionAmount: number;
  saleProceedsAmount: number;
  payoutCount: number;
}

export interface ConsignmentCommissionReport {
  from: string;
  to: string;
  groupBy: string;
  totalCommission: number;
  totalSaleProceeds: number;
  totalNetPayout: number;
  completedPayoutCount: number;
  series: ConsignmentCommissionSeries[];
  details: PagedReportItems<ConsignmentCommissionDetail>;
}

export interface BuyoutProfitDetail {
  productId: string;
  barcode: string;
  productName: string;
  buyoutNumber: string | null;
  invoiceNumber: string;
  soldAt: string;
  purchasePrice: number;
  salePrice: number;
  profit: number;
}

export interface BuyoutProfitSeries {
  bucketKey: string;
  label: string;
  purchaseCost: number;
  resaleRevenue: number;
  resaleProfit: number;
}

export interface BuyoutProfitReport {
  from: string;
  to: string;
  groupBy: string;
  totalPurchaseCost: number;
  paidBuyoutCount: number;
  resaleRevenue: number;
  resaleCost: number;
  resaleProfit: number;
  soldProductCount: number;
  series: BuyoutProfitSeries[];
  details: PagedReportItems<BuyoutProfitDetail>;
}

function buildQuery(params: ReportFilterParams) {
  const query: Record<string, string | number> = {};
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;
  if (params.groupBy) query.groupBy = params.groupBy;
  if (params.paymentMethod) query.paymentMethod = params.paymentMethod;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;
  return query;
}

export const reportsApi = {
  async overview(params: ReportFilterParams): Promise<ReportOverview> {
    return (await apiClient.get<ReportOverview>('/reports/overview', { params: buildQuery(params) })).data;
  },
  async posRevenue(params: ReportFilterParams): Promise<PosRevenueReport> {
    return (await apiClient.get<PosRevenueReport>('/reports/pos-revenue', { params: buildQuery(params) })).data;
  },
  async consignmentCommissions(params: ReportFilterParams): Promise<ConsignmentCommissionReport> {
    return (await apiClient.get<ConsignmentCommissionReport>('/reports/consignment-commissions', { params: buildQuery(params) })).data;
  },
  async buyoutProfit(params: ReportFilterParams): Promise<BuyoutProfitReport> {
    return (await apiClient.get<BuyoutProfitReport>('/reports/buyout-profit', { params: buildQuery(params) })).data;
  },
  async exportCsv(reportType: ExportReportType, params: ReportFilterParams): Promise<Blob> {
    return (
      await apiClient.get<Blob>('/reports/export', {
        params: { reportType, ...buildQuery(params) },
        responseType: 'blob',
      })
    ).data;
  },
};
