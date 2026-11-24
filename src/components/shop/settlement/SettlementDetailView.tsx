import { useState, useRef, type ChangeEvent } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Printer,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
  XCircle,
} from 'lucide-react';
import { Badge, Button, type BadgeVariant } from '@/components/shared';
import { formatVnd } from '@/api/settlements';
import { formatVndInWords } from '@/utils/currencyWords';
import type { SettlementContract, SettlementDocument } from '@/types/settlement';
import { useAuth } from '@/context/AuthContext';

export interface SettlementDetailViewProps {
  settlement: SettlementContract;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onTransferClick: () => void;
  onCompleteClick: () => void;
  onPrintClick: () => void;
  onViewDocument: (doc: SettlementDocument) => void;
  onUploadDocument: (file: {
    fileName: string;
    fileType: 'image' | 'pdf';
    fileSize: number;
    dataUrl: string;
    documentType: 'TransferReceipt' | 'SettlementSheet' | 'Other';
  }) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  actionLoading?: boolean;
}

const statusBadgeConfig: Record<
  SettlementContract['status'],
  { label: string; variant: BadgeVariant }
> = {
  Pending: { label: 'Chờ xác nhận · Chờ duyệt chi', variant: 'warning' },
  Approved: { label: 'Đã duyệt chi · Chờ thanh toán', variant: 'info' },
  PaymentRecorded: { label: 'Đã ghi nhận CK · Chờ hoàn tất', variant: 'payment' },
  Completed: { label: 'Đã hoàn tất', variant: 'success' },
  Rejected: { label: 'Đã từ chối duyệt chi', variant: 'danger' },
};

export function SettlementDetailView({
  settlement,
  onApproveClick,
  onRejectClick,
  onTransferClick,
  onCompleteClick,
  onPrintClick,
  onViewDocument,
  onUploadDocument,
  onDeleteDocument,
  actionLoading = false,
}: SettlementDetailViewProps) {
  const { hasRole, hasPermission } = useAuth();
  const isManagerOrAdmin = hasRole('Admin') || hasRole('Manager') || hasPermission('products.approve');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'fees' | 'history' | 'documents'>('products');
  const [uploading, setUploading] = useState(false);

  const statusConfig = statusBadgeConfig[settlement.status] || {
    label: settlement.status,
    variant: 'neutral' as BadgeVariant,
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';
    const reader = new FileReader();
    setUploading(true);
    reader.onload = async () => {
      try {
        await onUploadDocument({
          fileName: file.name,
          fileType,
          fileSize: file.size,
          dataUrl: reader.result as string,
          documentType: 'Other',
        });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5 p-4 sm:p-5">
      {/* Top Banner Status & Payout */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-brand-ink">
                {settlement.settlementNumber}
              </span>
              <span className="text-xs text-text-muted">· HĐ:</span>
              <span className="font-mono text-sm font-semibold text-slate-700">
                {settlement.contractNumber}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Kỳ quyết toán:{' '}
              {new Date(settlement.periodStart).toLocaleDateString('vi-VN')} -{' '}
              {new Date(settlement.periodEnd).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <Badge variant={statusConfig.variant} className="text-xs font-semibold">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Big Payout Amount Display */}
        <div className="mt-3 rounded-lg bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Số tiền cần chi trả cho khách:
              </span>
              <div className="text-2xl font-black text-emerald-700 sm:text-3xl">
                {formatVnd(settlement.netPayout)}
              </div>
              <p className="text-xs italic text-emerald-900/80">
                ({formatVndInWords(settlement.netPayout)})
              </p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <span>Đã bán: </span>
              <strong className="text-brand-ink">{settlement.soldItemCount}</strong> /{' '}
              {settlement.totalItemCount} sản phẩm
            </div>
          </div>

          {/* 3 Metric Breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-emerald-100 pt-3 text-xs">
            <div className="rounded bg-white/80 p-2 shadow-2xs">
              <p className="text-text-muted">Tổng doanh thu</p>
              <p className="font-bold text-slate-800">{formatVnd(settlement.totalRevenue)}</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="rounded bg-white/80 p-2 text-left shadow-2xs transition-colors hover:bg-rose-50/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-pink"
              title="Bấm để xem bảng kê hoa hồng chi tiết"
            >
              <p className="text-text-muted">Hoa hồng OCS ({settlement.commissionRate}%)</p>
              <p className="font-bold text-rose-700">- {formatVnd(settlement.commissionAmount)}</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fees')}
              className="rounded bg-white/80 p-2 text-left shadow-2xs transition-colors hover:bg-rose-50/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-pink"
              title="Bấm để xem bảng kê phí dịch vụ chi tiết"
            >
              <p className="text-text-muted">Phí khấu trừ ({settlement.feeDetails.length})</p>
              <p className="font-bold text-rose-700">- {formatVnd(settlement.fees)}</p>
            </button>
          </div>

          {/* Combined Deductions Total */}
          <div className="mt-2 flex items-center justify-between rounded bg-white/70 px-2.5 py-1.5 text-[11px] text-slate-600">
            <span>Tổng khấu trừ (Hoa hồng + Phí dịch vụ):</span>
            <span className="font-bold text-rose-700">
              - {formatVnd(settlement.commissionAmount + settlement.fees)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer & Banking Info Box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
          <User size={15} className="text-brand-pink" />
          <span>Thông tin người thụ hưởng & tài khoản nhận</span>
        </h4>
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div>
            <span className="text-text-muted">Họ và tên:</span>{' '}
            <strong className="text-slate-800">{settlement.customerName}</strong>
          </div>
          <div>
            <span className="text-text-muted">Số điện thoại:</span>{' '}
            <strong className="text-slate-800">{settlement.customerPhone}</strong>
          </div>
          <div>
            <span className="text-text-muted">Ngân hàng:</span>{' '}
            <strong className="text-slate-800">
              {settlement.bankName} ({settlement.bankCode})
            </strong>
          </div>
          <div>
            <span className="text-text-muted">Số tài khoản:</span>{' '}
            <span className="font-mono font-bold text-brand-highlight">
              {settlement.bankAccountNumber}
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-text-muted">Tên chủ tài khoản:</span>{' '}
            <strong className="uppercase text-slate-800">
              {settlement.bankAccountHolderName}
            </strong>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Manager/Admin Approval Controls */}
        {settlement.status === 'Pending' && (
          <>
            {isManagerOrAdmin ? (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  startIcon={<CheckCircle2 size={16} />}
                  onClick={onApproveClick}
                  disabled={actionLoading}
                >
                  Duyệt chi
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  startIcon={<XCircle size={16} />}
                  onClick={onRejectClick}
                  disabled={actionLoading}
                >
                  Từ chối
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <Clock size={15} />
                <span>Đang chờ Quản lý duyệt chi để thực hiện thanh toán.</span>
              </div>
            )}
          </>
        )}

        {/* Transfer Recording */}
        {settlement.status === 'Approved' && (
          <Button
            size="sm"
            variant="primary"
            startIcon={<Banknote size={16} />}
            onClick={onTransferClick}
            disabled={actionLoading}
            className="bg-brand-pink hover:bg-brand-highlight"
          >
            Ghi nhận chuyển khoản
          </Button>
        )}

        {/* Complete Final Settlement */}
        {settlement.status === 'PaymentRecorded' && (
          <Button
            size="sm"
            variant="primary"
            startIcon={<CheckCircle2 size={16} />}
            onClick={onCompleteClick}
            disabled={actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Xác nhận hoàn tất quyết toán
          </Button>
        )}

        {/* Printable Statement Sheet Button */}
        <Button
          size="sm"
          variant="outline"
          startIcon={<Printer size={16} />}
          onClick={onPrintClick}
          className="ml-auto"
        >
          In bảng kê (A4)
        </Button>
      </div>

      {/* Section Navigation Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`border-b-2 py-2 px-1 text-xs font-semibold ${
              activeTab === 'products'
                ? 'border-brand-pink text-brand-pink'
                : 'border-transparent text-text-muted hover:text-brand-ink'
            }`}
          >
            Sản phẩm ({settlement.products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`border-b-2 py-2 px-1 text-xs font-semibold ${
              activeTab === 'fees'
                ? 'border-brand-pink text-brand-pink'
                : 'border-transparent text-text-muted hover:text-brand-ink'
            }`}
          >
            Phí dịch vụ ({settlement.feeDetails.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`border-b-2 py-2 px-1 text-xs font-semibold ${
              activeTab === 'history'
                ? 'border-brand-pink text-brand-pink'
                : 'border-transparent text-text-muted hover:text-brand-ink'
            }`}
          >
            Lịch sử duyệt & chi trả
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`border-b-2 py-2 px-1 text-xs font-semibold ${
              activeTab === 'documents'
                ? 'border-brand-pink text-brand-pink'
                : 'border-transparent text-text-muted hover:text-brand-ink'
            }`}
          >
            Chứng từ ({settlement.documents.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Products Table */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-border">
                <tr>
                  <th className="p-2.5">Sản phẩm</th>
                  <th className="p-2.5">Mã vạch</th>
                  <th className="p-2.5 text-right">Giá bán</th>
                  <th className="p-2.5 text-center">% HH</th>
                  <th className="p-2.5 text-right">Hoa hồng</th>
                  <th className="p-2.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settlement.products.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="p-2.5">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-text-muted">
                        {item.brandName} · Size {item.size}
                      </p>
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{item.barcode}</td>
                    <td className="p-2.5 text-right font-semibold text-slate-800">
                      {item.status === 'Sold' ? formatVnd(item.soldPrice) : '—'}
                    </td>
                    <td className="p-2.5 text-center">
                      {item.status === 'Sold' ? `${item.commissionRate}%` : '—'}
                    </td>
                    <td className="p-2.5 text-right text-rose-700">
                      {item.status === 'Sold' ? formatVnd(item.commissionAmount) : '—'}
                    </td>
                    <td className="p-2.5 text-center">
                      {item.status === 'Sold' ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Đã bán
                        </span>
                      ) : item.status === 'Returned' ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Đã hoàn trả
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Đang gửi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Fees Table */}
      {activeTab === 'fees' && (
        <div className="space-y-3">
          {settlement.feeDetails.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-border">
                  <tr>
                    <th className="p-2.5">Tên khoản phí</th>
                    <th className="p-2.5">Mô tả chi tiết</th>
                    <th className="p-2.5 text-right">Số tiền khấu trừ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {settlement.feeDetails.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-800">{fee.name}</td>
                      <td className="p-2.5 text-text-muted">{fee.description || 'Thỏa thuận hợp đồng'}</td>
                      <td className="p-2.5 text-right font-semibold text-rose-700">
                        - {formatVnd(fee.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="p-2.5 text-slate-800">
                      Tổng các khoản phí khấu trừ:
                    </td>
                    <td className="p-2.5 text-right text-rose-700">
                      - {formatVnd(settlement.fees)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-muted">
              Không có khoản phí khấu trừ nào trong hợp đồng này.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Approval and Payment Logs */}
      {activeTab === 'history' && (
        <div className="space-y-4 text-xs">
          {/* Approval Section */}
          <div className="rounded-lg border border-border bg-white p-3.5">
            <h5 className="font-semibold text-brand-ink flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <ShieldCheck size={16} className="text-brand-pink" />
              <span>Tiến trình phê duyệt của Quản lý</span>
            </h5>
            <div className="mt-2.5 space-y-1.5">
              {settlement.approval.approvedAt ? (
                <div className="text-emerald-800 bg-emerald-50 rounded p-2.5">
                  <p>
                    <strong>Đã duyệt chi:</strong>{' '}
                    {new Date(settlement.approval.approvedAt).toLocaleString('vi-VN')}
                  </p>
                  <p>
                    <strong>Người duyệt:</strong>{' '}
                    {settlement.approval.approvedByEmployeeName || 'Quản lý cửa hàng'}
                  </p>
                  {settlement.approval.managerNote && (
                    <p className="mt-1 text-slate-700 italic">
                      "Ghi chú: {settlement.approval.managerNote}"
                    </p>
                  )}
                </div>
              ) : settlement.approval.rejectedAt ? (
                <div className="text-rose-800 bg-rose-50 rounded p-2.5">
                  <p>
                    <strong>Đã từ chối duyệt:</strong>{' '}
                    {new Date(settlement.approval.rejectedAt).toLocaleString('vi-VN')}
                  </p>
                  <p>
                    <strong>Người từ chối:</strong>{' '}
                    {settlement.approval.rejectedByEmployeeName || 'Quản lý cửa hàng'}
                  </p>
                  <p className="mt-1 font-medium text-rose-900">
                    Lý do: {settlement.approval.rejectionReason}
                  </p>
                </div>
              ) : (
                <p className="text-text-muted italic">
                  Chưa duyệt chi. Đang chờ Quản lý kiểm tra và duyệt chi trả.
                </p>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div className="rounded-lg border border-border bg-white p-3.5">
            <h5 className="font-semibold text-brand-ink flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Banknote size={16} className="text-brand-pink" />
              <span>Thông tin chuyển khoản & chi tiền</span>
            </h5>
            <div className="mt-2.5 space-y-1.5">
              {settlement.payment.paidAt ? (
                <div className="text-slate-800 bg-slate-50 rounded p-2.5 space-y-1">
                  <p>
                    <strong>Hình thức:</strong>{' '}
                    {settlement.payment.paymentMethod === 'BankTransfer'
                      ? 'Chuyển khoản ngân hàng'
                      : 'Tiền mặt tại quầy'}
                  </p>
                  <p>
                    <strong>Thời gian chi trả:</strong>{' '}
                    {new Date(settlement.payment.paidAt).toLocaleString('vi-VN')}
                  </p>
                  <p>
                    <strong>Người thực hiện:</strong>{' '}
                    {settlement.payment.paidByEmployeeName || 'Kế toán cửa hàng'}
                  </p>
                  {settlement.payment.bankTransactionReference && (
                    <p>
                      <strong>Mã giao dịch / FT code:</strong>{' '}
                      <span className="font-mono font-bold text-brand-highlight">
                        {settlement.payment.bankTransactionReference}
                      </span>
                    </p>
                  )}
                  {settlement.payment.transferNote && (
                    <p className="text-text-muted">
                      <strong>Ghi chú:</strong> {settlement.payment.transferNote}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-text-muted italic">
                  Chưa thực hiện chuyển khoản / chi trả tiền cho người ký gửi.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Documents and Proof */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Upload Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
              Chứng từ đính kèm (Ủy nhiệm chi, biên lai, xác nhận khách ký)
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              startIcon={<UploadCloud size={14} />}
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              Tải lên chứng từ
            </Button>
          </div>

          {settlement.documents.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {settlement.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-white p-3 shadow-2xs hover:border-brand-pink"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="shrink-0 text-brand-pink" size={24} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-xs text-brand-ink">
                        {doc.fileName}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {(doc.fileSize / 1024).toFixed(1)} KB ·{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onViewDocument(doc)}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-brand-pink"
                      title="Xem trước"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = doc.dataUrl;
                        a.download = doc.fileName;
                        a.click();
                      }}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-brand-pink"
                      title="Tải về"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      title="Xóa chứng từ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-muted">
              Chưa có chứng từ nào được đính kèm. Bấm nút <strong>Tải lên chứng từ</strong> để thêm ủy nhiệm chi hoặc hóa đơn.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
