import { useState, type FormEvent } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import { formatVnd } from '@/api/settlements';
import { formatVndInWords } from '@/utils/currencyWords';
import type { SettlementContract } from '@/types/settlement';

export interface SettlementApprovalModalProps {
  open: boolean;
  mode: 'approve' | 'reject';
  settlement: SettlementContract | null;
  onClose: () => void;
  onConfirmApprove: (managerNote: string) => Promise<void>;
  onConfirmReject: (rejectionReason: string) => Promise<void>;
  loading?: boolean;
}

export function SettlementApprovalModal({
  open,
  mode,
  settlement,
  onClose,
  onConfirmApprove,
  onConfirmReject,
  loading = false,
}: SettlementApprovalModalProps) {
  const [managerNote, setManagerNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  if (!settlement) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'reject') {
      if (!rejectionReason.trim()) {
        setError('Vui lòng nhập lý do từ chối duyệt chi.');
        return;
      }
      try {
        await onConfirmReject(rejectionReason.trim());
        setRejectionReason('');
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi từ chối.');
      }
    } else {
      try {
        await onConfirmApprove(managerNote.trim());
        setManagerNote('');
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi duyệt chi.');
      }
    }
  };

  const isApprove = mode === 'approve';

  return (
    <Modal
      open={open}
      onClose={onClose}
      disabled={loading}
      title={
        <div className="flex items-center gap-2">
          {isApprove ? (
            <CheckCircle2 className="text-emerald-600" size={22} aria-hidden="true" />
          ) : (
            <XCircle className="text-rose-600" size={22} aria-hidden="true" />
          )}
          <span>{isApprove ? 'Duyệt chi quyết toán' : 'Từ chối duyệt chi'}</span>
        </div>
      }
      description={
        <span>
          Phiếu quyết toán <strong className="text-brand-ink">{settlement.settlementNumber}</strong> · Hợp đồng{' '}
          <strong className="text-brand-ink">{settlement.contractNumber}</strong>
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="settlement-approval-form"
            variant={isApprove ? 'primary' : 'danger'}
            loading={loading}
          >
            {isApprove ? 'Xác nhận duyệt chi' : 'Xác nhận từ chối'}
          </Button>
        </div>
      }
    >
      <form id="settlement-approval-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Financial Recap Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-text-muted">Khách hàng</p>
              <p className="font-semibold text-brand-ink">{settlement.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Doanh thu</p>
              <p className="font-medium text-slate-800">{formatVnd(settlement.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Hoa hồng cửa hàng</p>
              <p className="font-medium text-slate-800">{formatVnd(settlement.commissionAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Phí khấu trừ</p>
              <p className="font-medium text-slate-800">{formatVnd(settlement.fees)}</p>
            </div>
          </div>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700">Số tiền cần chi trả:</span>
              <span className="text-lg font-bold text-emerald-600 sm:text-xl">
                {formatVnd(settlement.netPayout)}
              </span>
            </div>
            <p className="mt-0.5 text-right text-xs italic text-text-muted">
              ({formatVndInWords(settlement.netPayout)})
            </p>
          </div>
        </div>

        {isApprove ? (
          <div>
            <label htmlFor="manager-note" className="mb-1 block text-sm font-medium text-brand-ink">
              Ghi chú của quản lý (tùy chọn)
            </label>
            <textarea
              id="manager-note"
              rows={3}
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              placeholder="VD: Đã đối chiếu hóa đơn và hàng tồn thực tế, số liệu chính xác..."
              className="w-full rounded-control border border-border bg-white p-3 text-sm text-text-primary focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
            />
            <p className="mt-1 text-xs text-text-muted">
              Sau khi duyệt, phiếu sẽ chuyển sang trạng thái <strong>Đã duyệt chi</strong> và kế toán có thể tiến hành lập lệnh thanh toán.
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="rejection-reason" className="mb-1 block text-sm font-medium text-rose-700">
              Lý do từ chối duyệt chi <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={3}
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="VD: Sai lệch phí vận chuyển, cần kiểm tra lại đơn giá bán của sản phẩm OCS265001..."
              className="w-full rounded-control border border-rose-300 bg-white p-3 text-sm text-text-primary focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-700">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                Lý do từ chối sẽ được lưu lại trong lịch sử để nhân viên liên quan xem và chỉnh sửa số liệu.
              </span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
