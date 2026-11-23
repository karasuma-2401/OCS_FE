import React from 'react';
import {
  Banknote,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import { formatVndCurrency } from './VietQrPaymentModal';
import { formatVndInWords } from '@/utils/currencyWords';
import type { PosProductLookupDto } from '@/api/pos';

export interface PosCashConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  cart: PosProductLookupDto[];
  totalAmount: number;
  cashGiven: number;
  changeAmount: number;
  error: string | null;
  isNetworkError?: boolean;
  onRetry?: () => void;
}

export const PosCashConfirmModal: React.FC<PosCashConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  cart,
  totalAmount,
  cashGiven,
  changeAmount,
  error,
  isNetworkError = false,
  onRetry,
}) => {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      closeOnBackdrop={!isSubmitting}
      title={
        <div className="flex items-center gap-2 text-brand-ink">
          <Banknote className="size-5 text-brand-highlight" aria-hidden="true" />
          <span className="font-extrabold text-ink">Xác nhận thanh toán tiền mặt</span>
        </div>
      }
      description="Kiểm tra số tiền thu và tiền thối trước khi xuất hóa đơn."
      className="max-w-[440px]"
      contentClassName="!py-4"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Sửa tiền
          </Button>

          {error && isNetworkError && onRetry ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isSubmitting}
              loadingText="Đang kết nối lại..."
              startIcon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={onRetry}
              className="bg-brand-highlight text-white enabled:hover:bg-brand-highlight/90 font-bold shadow-xs"
            >
              Thử lại thanh toán
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isSubmitting}
              loadingText="Đang ghi nhận..."
              disabled={isSubmitting || cart.length === 0 || cashGiven < totalAmount}
              startIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
              onClick={onConfirm}
              className="bg-[#E84E7F] text-white enabled:hover:bg-[#D83A6D] enabled:active:bg-[#C22D5E] font-bold shadow-xs"
            >
              Xác nhận thanh toán
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Error Notification Alert (Network / API Error) */}
        {error && (
          <div
            role="alert"
            className={`rounded-xl border p-3 text-xs transition-all ${
              isNetworkError
                ? 'border-red-300 bg-red-50 text-red-950 shadow-2xs'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isNetworkError ? (
                <WifiOff className="size-4.5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-4.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="space-y-1 flex-1">
                <p className="font-bold text-xs uppercase tracking-wide">
                  {isNetworkError
                    ? 'Lỗi kết nối mạng (Giao dịch CHƯA hoàn tất)'
                    : 'Giao dịch chưa thể hoàn tất'}
                </p>
                <p className="leading-relaxed font-medium">{error}</p>
                {isNetworkError && (
                  <p className="text-[11px] text-red-800/90 font-medium">
                    Giỏ hàng và tiền khách đưa vẫn được giữ nguyên vẹn. Không có hóa đơn giả nào được tạo.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary: Two-tier hierarchy separating Totals from Change Due */}
        <div className="space-y-2">
          <div className="rounded-xl border border-border/80 bg-surface/65 px-3.5 py-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted">Tổng tiền hàng ({cart.length} món)</span>
              <span className="font-mono text-sm font-bold tabular-nums text-ink">
                {formatVndCurrency(totalAmount)}
              </span>
            </div>

            <div className="border-t border-border/60 pt-2 flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted pt-0.5">Tiền khách đưa</span>
              <div className="text-right">
                <span className="block font-mono text-base font-extrabold tabular-nums text-brand-ink leading-tight">
                  {formatVndCurrency(cashGiven)}
                </span>
                <span className="block text-[11px] text-muted/85 mt-0.5">
                  {formatVndInWords(cashGiven)}
                </span>
              </div>
            </div>
          </div>

          {/* Highlighted Change Callout */}
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/75 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-xs font-bold text-emerald-900">
                Tiền thừa trả khách
              </span>
              {changeAmount > 0 && (
                <span className="block text-[11px] font-medium text-emerald-700/90 truncate mt-0.5">
                  {formatVndInWords(changeAmount)}
                </span>
              )}
            </div>

            {changeAmount > 0 ? (
              <span className="font-mono text-xl font-black tabular-nums text-emerald-700 shrink-0 tracking-tight">
                {formatVndCurrency(changeAmount)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-100/90 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                Đưa vừa đủ
              </span>
            )}
          </div>
        </div>

        {/* Cart Item Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span>Sản phẩm ({cart.length})</span>
            <span>Đơn giá</span>
          </div>

          <div className="rounded-xl border border-border/75 bg-paper overflow-hidden">
            <div className="max-h-40 overflow-y-auto divide-y divide-border/50 [scrollbar-width:thin]">
              {cart.map((item, index) => (
                <div
                  key={item.id || index}
                  className="px-3 py-2 flex items-center justify-between gap-2.5 text-xs"
                >
                  <span className="font-mono text-[11px] font-semibold text-muted/70 w-4 shrink-0">
                    {index + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted">
                      <span className="font-mono">{item.barcode || 'N/A'}</span>
                      {item.size && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink/75 border border-border/60">
                          Size {item.size}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-ink shrink-0">
                    {formatVndCurrency(item.listedPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PosCashConfirmModal;
