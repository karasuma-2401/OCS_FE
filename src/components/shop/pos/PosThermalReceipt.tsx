import React, { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { formatVndCurrency } from './VietQrPaymentModal';
import type {
  PosProductLookupDto,
  PosCashPaymentResponse,
  PosInvoiceDetailDto,
} from '@/api/pos';
import { posAudio } from './posAudio';
import './posReceipt.css';

export interface PosThermalReceiptCartItem {
  id: string;
  barcode: string;
  name: string;
  size?: string;
  brandName?: string | null;
  listedPrice: number;
}

export interface PosThermalReceiptProps {
  variant?: 'cart' | 'invoice';
  /**
   * For 'cart' variant: active items in the cart
   */
  cartItems?: PosThermalReceiptCartItem[] | PosProductLookupDto[];
  onRemoveItem?: (id: string) => void;
  cashGiven?: number;
  paymentMethod?: 'cash' | 'vietqr';
  /**
   * For 'invoice' variant: completed payment response or invoice detail
   */
  invoice?: PosCashPaymentResponse | PosInvoiceDetailDto | null;
  /**
   * Cashier display name
   */
  cashierName?: string;
  /**
   * Whether to show the iconic stamped "ĐÃ THANH TOÁN"
   */
  isPaid?: boolean;
  /**
   * Whether to show the bottom totals, barcode & store policy section.
   * Defaults to false in 'cart' variant, and true in 'invoice' variant.
   */
  showFooter?: boolean;
  /**
   * Whether this receipt instance should be printed on @media print
   */
  isPrintable?: boolean;
  /**
   * Trigger tear-off rip animation
   */
  isTearing?: boolean;
  /**
   * Disable inner items scroll (e.g. when printing or viewing the full invoice)
   */
  disableItemsScroll?: boolean;
  className?: string;
}

export const PosThermalReceipt: React.FC<PosThermalReceiptProps> = ({
  variant = 'cart',
  cartItems = [],
  onRemoveItem,
  cashGiven = 0,
  paymentMethod = 'cash',
  invoice,
  cashierName = 'Nhân viên OCS',
  isPaid = false,
  showFooter,
  isPrintable = true,
  isTearing = false,
  disableItemsScroll = false,
  className = '',
}) => {
  const prevItemsCountRef = useRef<number>(cartItems.length);

  // Play subtle mechanical feed tick sound when a new item is added to cart
  useEffect(() => {
    if (variant === 'cart' && cartItems.length > prevItemsCountRef.current) {
      posAudio.playLineTick();
    }
    prevItemsCountRef.current = cartItems.length;
  }, [variant, cartItems.length]);

  // Play rubber stamp impact thud when marked paid
  useEffect(() => {
    if (isPaid) {
      const timer = window.setTimeout(() => {
        posAudio.playStampThud();
      }, 200);
      return () => window.clearTimeout(timer);
    }
  }, [isPaid]);

  // Compute values based on variant
  const isInvoice = variant === 'invoice' || Boolean(invoice);

  const invoiceNumber = invoice?.invoiceNumber || 'HÓA ĐƠN TẠM TÍNH';

  const rawDate = invoice?.createdAt ? new Date(invoice.createdAt) : new Date();
  const formattedDate = rawDate.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resolvedCashier =
    (invoice && 'cashierName' in invoice && invoice.cashierName) || cashierName;

  // Resolved line items
  const items = isInvoice && invoice
    ? invoice.items.map((it) => ({
        id: it.productId,
        barcode: it.barcode,
        name: it.name,
        size: 'size' in it ? it.size : undefined,
        brandName: 'brandName' in it ? (it.brandName as string | undefined) : undefined,
        price: 'price' in it ? it.price : 0,
      }))
    : cartItems.map((c) => ({
        id: c.id,
        barcode: c.barcode,
        name: c.name,
        size: c.size,
        brandName: c.brandName,
        price: c.listedPrice,
      }));

  const totalAmount = isInvoice && invoice
    ? invoice.totalAmount
    : items.reduce((sum, item) => sum + item.price, 0);

  const effectiveCashGiven = isInvoice && invoice
    ? ('cashGiven' in invoice && typeof invoice.cashGiven === 'number'
        ? invoice.cashGiven
        : totalAmount)
    : cashGiven;

  const effectiveChange = isInvoice && invoice
    ? ('changeAmount' in invoice && typeof invoice.changeAmount === 'number'
        ? invoice.changeAmount
        : Math.max(0, effectiveCashGiven - totalAmount))
    : Math.max(0, cashGiven - totalAmount);

  const resolvedPaymentMethod =
    isInvoice && invoice && 'paymentMethod' in invoice && invoice.paymentMethod
      ? invoice.paymentMethod
      : paymentMethod === 'cash'
      ? 'Tiền mặt'
      : 'VietQR Chuyển khoản';

  const showPaidStamp = isPaid || (isInvoice && invoice);

  // Whether to show the bottom totals, barcode & disclaimer
  const shouldShowFooter =
    showFooter !== undefined
      ? showFooter
      : variant === 'invoice' || Boolean(invoice);

  return (
    <article
      className={`pos-thermal-paper ${isPrintable ? 'pos-printable-receipt' : ''} ${
        isTearing ? 'pos-paper-tearing' : ''
      } ${className}`}
      data-testid="pos-thermal-receipt"
    >
      {/* 1. Header Cửa Hàng OCS */}
      <header className="pos-paper-header">
        <h3 className="uppercase">CỬA HÀNG THỜI TRANG KÝ GỬI OCS</h3>
        <span>Hàng hiệu ký gửi tuyển chọn</span>
        <span>Hotline: 098.765.4321 • Website: ocs.vn</span>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>Quầy 01</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] font-semibold text-ink">
          <span>Thu ngân: {resolvedCashier}</span>
        </div>
        <div className="mt-0.5 font-mono text-[11.5px] font-bold text-ink">
          Số HĐ: {invoiceNumber}
        </div>
      </header>

      {/* 2. Danh Sách Sản Phẩm */}
      <div className="my-2 space-y-1">
        {/* Table column header */}
        <div className="grid grid-cols-[28px_1fr_auto] gap-1.5 pb-1 text-[11px] font-bold text-muted border-b border-dashed border-[#B9B7AE]">
          <span>SL</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">TÊN SẢN PHẨM</span>
            {!disableItemsScroll && !isInvoice && items.length > 4 && (
              <span className="no-print text-[9.5px] font-normal text-muted/70 italic truncate">
                ({items.length} món · cuộn để xem)
              </span>
            )}
          </div>
          <span className="text-right">ĐƠN GIÁ</span>
        </div>

        {items.length === 0 ? (
          <div className="py-7 text-center font-mono text-xs text-muted/80 italic">
            Scan mã vạch hoặc chọn sản phẩm để bắt đầu.
          </div>
        ) : (
          <div
            className={`space-y-1 ${
              !disableItemsScroll && !isInvoice && items.length > 4
                ? 'pos-receipt-items-scroll max-h-48 sm:max-h-56 overflow-y-auto pr-1 overscroll-contain'
                : ''
            }`}
          >
            {items.map((item, index) => (
              <div
                key={item.id || item.barcode || index}
                className="pos-receipt-line group relative pos-line-feed-in"
              >
                {/* Quantity column */}
                <span className="font-mono text-xs font-semibold text-muted">
                  x1
                </span>

                {/* Name & details column */}
                <div className="min-w-0 pr-1">
                  <p className="font-medium text-xs text-ink truncate leading-snug">
                    {item.name}
                  </p>
                  <p className="font-mono text-[10px] text-muted leading-tight">
                    Mã: {item.barcode}
                    {item.size ? ` • Size ${item.size}` : ''}
                    {item.brandName ? ` • ${item.brandName}` : ''}
                  </p>
                </div>

                {/* Price & Action column */}
                <div className="flex items-center gap-1 text-right">
                  <span className="font-mono text-xs font-bold text-ink shrink-0">
                    {formatVndCurrency(item.price)}
                  </span>

                  {!isInvoice && onRemoveItem && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="no-print opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-red-500 hover:bg-red-50 ml-1"
                      title="Xóa món này khỏi hóa đơn"
                      aria-label={`Xóa ${item.name}`}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tổng Tiền & Chi Tiết Thanh Toán, 4. Barcode, 5. Footer & Policy Notes */}
      {shouldShowFooter && (
        <>
          {/* 3. Tổng Tiền & Chi Tiết Thanh Toán */}
          <div className="pos-paper-sum">
            <div>
              <span className="text-muted">Tổng tiền hàng ({items.length} món):</span>
              <span className="font-mono font-semibold text-ink">
                {formatVndCurrency(totalAmount)}
              </span>
            </div>

            <div>
              <span className="text-muted">Thuế VAT (0%):</span>
              <span className="font-mono text-ink">0 đ</span>
            </div>

            {/* Highlighted Total */}
            <div className="pos-paper-sum-total">
              <span className="text-sm font-extrabold uppercase">TỔNG CỘNG:</span>
              <span className="font-mono text-base font-black">
                {formatVndCurrency(totalAmount)}
              </span>
            </div>

            <div>
              <span className="text-muted">Phương thức thanh toán:</span>
              <span className="font-semibold text-ink">{resolvedPaymentMethod}</span>
            </div>

            {/* Cash Details if payment is cash or was cash */}
            {(paymentMethod === 'cash' || resolvedPaymentMethod.includes('Tiền mặt')) && (
              <>
                <div>
                  <span className="text-muted">Tiền khách đưa:</span>
                  <span className="font-mono font-bold text-ink">
                    {effectiveCashGiven > 0 ? formatVndCurrency(effectiveCashGiven) : '---'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Tiền thừa trả khách:</span>
                  <span className="font-mono font-black text-emerald-800">
                    {effectiveCashGiven >= totalAmount
                      ? formatVndCurrency(effectiveChange)
                      : '0 đ'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* 4. Barcode graphic */}
          <i className="pos-barcode-graphic" aria-hidden="true" />
          <div className="text-center font-mono text-[9.5px] text-muted tracking-widest mt-0.5">
            *{invoiceNumber}*
          </div>

          {/* 5. Footer & Policy Notes */}
          <footer className="mt-3.5 space-y-1 text-center font-mono text-[10px] text-muted leading-tight border-t border-dashed border-[#B9B7AE] pt-2.5">
            <p className="font-semibold text-ink">
              * HÀNG KÝ GỬI ĐÃ QUA SỬ DỤNG - KHÔNG ĐỔI TRẢ *
            </p>
            <p>Quý khách vui lòng kiểm tra kỹ sản phẩm trước khi rời quầy.</p>
            <p className="font-bold text-ink pt-0.5">
              Xin cảm ơn & Hẹn gặp lại Quý khách!
            </p>
          </footer>

          {/* 6. Iconic Red Rubber Stamp "ĐÃ THANH TOÁN" */}
          {showPaidStamp && (
            <span className="pos-paid-stamp" aria-label="Đã thanh toán">
              ĐÃ THANH TOÁN
            </span>
          )}
        </>
      )}
    </article>
  );
};
