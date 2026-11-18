import React from 'react';
import {
  Banknote,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Receipt,
  ShoppingCart,
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
        <div className="flex items-center gap-2.5 text-brand-ink">
          <Banknote className="size-6 text-brand-highlight" aria-hidden="true" />
          <span className="font-extrabold text-ink">Xác nhận giao dịch tiền mặt</span>
        </div>
      }
      description="Kiểm tra tiền nhận, tiền thừa và xác nhận để máy chủ ghi nhận giao dịch & xuất hóa đơn."
      className="max-w-xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Quay lại / Sửa tiền
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
              className="bg-brand-highlight text-white hover:bg-brand-highlight/90 font-bold"
            >
              Thử lại thanh toán
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              loading={isSubmitting}
              loadingText="Đang ghi nhận vào hệ thống..."
              disabled={isSubmitting || cart.length === 0 || cashGiven < totalAmount}
              startIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
              onClick={onConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
            >
              Xác nhận thanh toán
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Error Notification Alert (Network / API Error) */}
        {error && (
          <div
            role="alert"
            className={`rounded-xl border p-3.5 text-xs transition-all ${
              isNetworkError
                ? 'border-red-300 bg-red-50 text-red-950 shadow-xs'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isNetworkError ? (
                <WifiOff className="size-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
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
                    🛡️ Giỏ hàng và tiền khách đưa vẫn được giữ nguyên vẹn. Không có hóa đơn giả nào được tạo.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Amount & Change Breakdown Box */}
        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <span className="text-xs font-semibold text-muted">Tổng tiền đơn hàng:</span>
            <span className="text-base font-black text-ink">{formatVndCurrency(totalAmount)}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Tiền khách đưa:</span>
              <span className="text-base font-black text-brand-ink">{formatVndCurrency(cashGiven)}</span>
            </div>
            <p className="text-[11px] text-muted text-right italic">
              Bằng chữ: <span className="font-semibold text-ink">{formatVndInWords(cashGiven)}</span>
            </p>
          </div>

          <div className="pt-2 border-t border-border/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Tiền thừa trả lại khách:</span>
              <span className="text-xl font-black text-emerald-700">
                {formatVndCurrency(changeAmount)}
              </span>
            </div>
            {changeAmount > 0 ? (
              <p className="text-[11px] text-emerald-700 text-right italic font-medium">
                Bằng chữ: <span className="font-bold">{formatVndInWords(changeAmount)}</span>
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 text-right font-medium">
                Khách đưa vừa đủ tiền, không cần trả lại tiền thừa.
              </p>
            )}
          </div>
        </div>

        {/* Cart Item Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted border-b border-border/70 pb-1">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="size-3.5 text-muted" aria-hidden="true" />
              Sản phẩm thanh toán ({cart.length} món độc bản)
            </span>
            <span>Đơn giá</span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-border/40 pr-1">
            {cart.map((item, index) => (
              <div key={item.id || index} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{item.name}</p>
                  <p className="font-mono text-[10px] text-muted">
                    Barcode: {item.barcode || 'N/A'} {item.size ? `• Size: ${item.size}` : ''}
                  </p>
                </div>
                <span className="font-bold text-ink shrink-0">
                  {formatVndCurrency(item.listedPrice)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Integrity Note */}
        <div className="rounded-lg bg-surface/80 border border-border/80 p-2.5 flex items-start gap-2 text-[11px] text-muted">
          <Receipt className="size-4 text-brand-highlight shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            Thu ngân xác nhận đã thu đủ số tiền mặt từ khách. Sau khi máy chủ API phản hồi thành công, hóa đơn chính thức sẽ được tạo và các sản phẩm trên sẽ chuyển trạng thái sang <strong>Đã bán</strong>.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default PosCashConfirmModal;
