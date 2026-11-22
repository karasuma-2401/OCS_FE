import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Printer, PlusCircle, Receipt, Download } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import {
  posApi,
  type PosCashPaymentResponse,
  type PosProductLookupDto,
} from '@/api/pos';
import {
  PosThermalReceipt,
  type PosThermalReceiptCartItem,
} from './PosThermalReceipt';
import { PosPrinterDevice } from './PosPrinterDevice';
import { posAudio } from './posAudio';

export interface PosInvoiceSuccessModalProps {
  open: boolean;
  invoice?: PosCashPaymentResponse | null;
  cartItems?: PosThermalReceiptCartItem[] | PosProductLookupDto[];
  cashGiven?: number;
  paymentMethod?: 'cash' | 'vietqr';
  cashierName?: string;
  onClose: () => void;
  onNewOrder?: () => void;
}

export const PosInvoiceSuccessModal: React.FC<PosInvoiceSuccessModalProps> = ({
  open,
  invoice,
  cartItems = [],
  cashGiven = 0,
  paymentMethod = 'cash',
  cashierName = 'Nhân viên OCS',
  onClose,
  onNewOrder,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [printStage, setPrintStage] = useState<'printing' | 'settling' | 'settled'>('printing');
  const [printKey, setPrintKey] = useState(0);
  const chamberRef = useRef<HTMLDivElement>(null);

  // Print sequence: Prints out gradually until full bill is visible, then smoothly tucks into a scrollable frame
  const startPrintSequence = useCallback(() => {
    setPrintStage('printing');
    setPrintKey((k) => k + 1);

    // Phát âm thanh máy in nhiệt rè rè nhẹ nhàng đồng bộ 2.0s với hiệu ứng cuộn bill, kết thúc bằng tiếng tách cắt giấy
    posAudio.playPrintingBuzz(2.0);

    const timeouts: number[] = [];

    // Phase 1: Print out all lines until the bottom of the bill is out (2.0s feed)
    // Phase 2: After user sees the full bill, smoothly tuck down into scrollable height (at 2800ms)
    const settleId = window.setTimeout(() => {
      setPrintStage('settling');
      chamberRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2800);
    timeouts.push(settleId);

    // Phase 3: Transition finishes, activate scrollable state (at 3650ms)
    const doneId = window.setTimeout(() => {
      setPrintStage('settled');
    }, 3650);
    timeouts.push(doneId);

    return timeouts;
  }, []);

  useEffect(() => {
    if (open) {
      const timeouts = startPrintSequence();
      return () => {
        timeouts.forEach((id) => window.clearTimeout(id));
        posAudio.stopPrintingBuzz();
      };
    }
  }, [open, startPrintSequence]);

  const handleReplayPrint = () => {
    startPrintSequence();
  };

  // If modal is not open, do not render
  if (!open) {
    return null;
  }

  const isCompleted = Boolean(invoice);
  const pdfUrl = invoice ? posApi.getInvoicePdfUrl(invoice.invoiceNumber) : null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (invoice) {
      try {
        setIsDownloadingPdf(true);
        const blob = await posApi.downloadInvoicePdf(invoice.invoiceNumber);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hoa-don-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Lỗi tải file PDF hóa đơn từ máy chủ:', err);
        if (pdfUrl) {
          window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.print();
        }
      } finally {
        setIsDownloadingPdf(false);
      }
    } else {
      // In cart preview mode: trigger print dialog (which lets user Save as PDF or print)
      window.print();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isCompleted ? (
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="size-6 text-emerald-600 animate-pulse" aria-hidden="true" />
            <span className="font-extrabold text-ink">Thanh toán hoàn tất</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-brand-highlight">
            <Receipt className="size-6 text-brand-highlight" aria-hidden="true" />
            <span className="font-extrabold text-ink">Xuất hóa đơn bán lẻ</span>
          </div>
        )
      }
      description={
        isCompleted
          ? `Hóa đơn bán lẻ #${invoice!.invoiceNumber} đã được ghi nhận thành công.`
          : cartItems.length > 0
            ? `Bản in hóa đơn thanh toán cho ${cartItems.length} sản phẩm.`
            : 'Xem trước mẫu hóa đơn in nhiệt tại quầy POS.'
      }
      className="max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[calc(100dvh-7rem)] my-auto mb-10 sm:mb-14"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 w-full no-print">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              startIcon={<Printer className="size-4" aria-hidden="true" />}
              onClick={handleBrowserPrint}
              title="In trực tiếp ra máy in nhiệt 80mm hoặc máy in thông thường"
            >
              In bill (80mm)
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isDownloadingPdf}
              loadingText="Đang tải PDF..."
              startIcon={<Download className="size-4" aria-hidden="true" />}
              onClick={handleDownloadPdf}
              title="Xuất và tải file PDF hóa đơn về máy"
              className="bg-brand-highlight text-white hover:bg-brand-highlight/90 shadow-2xs"
            >
              Xuất file PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Đóng
              </Button>
            )}
            {isCompleted && onNewOrder && (
              <Button
                variant="outline"
                size="sm"
                startIcon={<PlusCircle className="size-4" aria-hidden="true" />}
                onClick={onNewOrder}
              >
                Tạo đơn mới
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* The Thermal Printer Station with Depth & Feed Effect (Transparent, Card-free) */}
        <div className="pos-printer-station bg-transparent border-0 shadow-none">
          {/* Paper Chamber: Unconstrained during print to show full bill, then tucks into scrollable */}
          <div
            ref={chamberRef}
            className={`w-full px-2 sm:px-4 pt-2 pb-1 flex justify-center scroll-smooth ${printStage === 'printing'
                ? 'pos-chamber-printing'
                : printStage === 'settling'
                  ? 'pos-chamber-settling'
                  : 'pos-chamber-settled'
              }`}
          >
            <div className="w-full max-w-[340px] relative">
              <div
                key={printKey}
                className={printStage === 'printing' ? 'pos-paper-feeding' : ''}
              >
                <PosThermalReceipt
                  variant={isCompleted ? 'invoice' : 'cart'}
                  invoice={invoice}
                  cartItems={cartItems}
                  cashGiven={cashGiven}
                  paymentMethod={paymentMethod}
                  cashierName={cashierName}
                  isPaid={isCompleted}
                  showFooter={true}
                  isPrintable={true}
                  disableItemsScroll={true}
                  className="is-torn-bottom"
                />
              </div>
            </div>
          </div>

          {/* Minimalist Printer Chassis matching thermal paper width */}
          <div className="w-full max-w-[340px] mx-auto shrink-0 z-20 mt-2 mb-2">
            <PosPrinterDevice
              isPrinting={printStage === 'printing'}
              onFeed={handleReplayPrint}
            />
          </div>
        </div>

        {/* Quick Help Note */}

      </div>
    </Modal>
  );
};
