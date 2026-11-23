import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, Printer, PlusCircle, Receipt, Download } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import {
  posApi,
  type PosCashPaymentResponse,
  type PosInvoiceDetailDto,
  type PosProductLookupDto,
} from '@/api/pos';
import {
  PosThermalReceipt,
  type PosThermalReceiptCartItem,
} from './PosThermalReceipt';
import { PosPrinterDevice } from './PosPrinterDevice';
import { posAudio } from './posAudio';
import { printThermalReceiptElement } from './printReceipt';

export interface PosInvoiceSuccessModalProps {
  open: boolean;
  invoice?: PosCashPaymentResponse | PosInvoiceDetailDto | null;
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
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [printStage, setPrintStage] = useState<'printing' | 'settling' | 'settled'>('printing');
  const [printKey, setPrintKey] = useState(0);
  const chamberRef = useRef<HTMLDivElement>(null);
  const receiptContainerRef = useRef<HTMLDivElement>(null);

  // Print sequence: Paper feeds smoothly out of the slot (2.0s), then settles cleanly at full height
  const startPrintSequence = useCallback(() => {
    setPrintStage('printing');
    setPrintKey((k) => k + 1);
    setPdfError(null);

    posAudio.playPrintingBuzz(2.0);

    const timeouts: number[] = [];

    const settleId = window.setTimeout(() => {
      setPrintStage('settling');
    }, 2050);
    timeouts.push(settleId);

    const doneId = window.setTimeout(() => {
      setPrintStage('settled');
    }, 2350);
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

  useEffect(() => {
    if (!open) return;
    const scrollHost = chamberRef.current?.closest<HTMLElement>('.pos-receipt-chamber');
    if (scrollHost) scrollHost.scrollTop = 0;
  }, [open, printKey]);

  const handleReplayPrint = () => {
    startPrintSequence();
  };

  if (!open) {
    return null;
  }

  const isCompleted = Boolean(invoice);

  const handleBrowserPrint = () => {
    const title = invoice ? `Hoa-don-${invoice.invoiceNumber}` : 'Bill-tam-tinh-OCS';
    printThermalReceiptElement(receiptContainerRef.current, title);
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setPdfError(null);
    try {
      setIsDownloadingPdf(true);
      const blob = await posApi.downloadInvoicePdf(invoice.invoiceNumber);

      if (blob.type && blob.type.includes('json')) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text) as { detail?: string; title?: string };
          throw new Error(parsed.detail || parsed.title || 'Không thể xuất file PDF hóa đơn.');
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message) throw parseErr;
          throw new Error('Không thể xuất file PDF hóa đơn.');
        }
      }

      if (blob.size === 0) {
        throw new Error('File PDF trả về từ máy chủ bị rỗng.');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hoa-don-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải file PDF hóa đơn từ máy chủ. Bạn vẫn có thể dùng nút "In bill (80mm)".';
      setPdfError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      error={pdfError}
      title={
        isCompleted ? (
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="size-5 text-emerald-600 animate-pulse" aria-hidden="true" />
            <span className="font-extrabold text-ink">Thanh toán hoàn tất</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-brand-highlight">
            <Receipt className="size-5 text-brand-highlight" aria-hidden="true" />
            <span className="font-extrabold text-ink">Xem trước Bill nháp</span>
          </div>
        )
      }
      description={
        isCompleted
          ? `Hóa đơn bán lẻ #${invoice!.invoiceNumber} đã được ghi nhận thành công.`
          : undefined
      }
      className="max-w-md"
      bodyClassName={
        printStage === 'settled'
          ? 'overflow-y-auto overflow-x-hidden [scrollbar-width:thin] pos-receipt-chamber'
          : 'overflow-hidden select-none pos-receipt-chamber'
      }
      contentClassName="!p-0"
      footerClassName="!border-t-0 !pt-1"
      footer={
        <div className="flex flex-col gap-3 w-full no-print">
          {/* Minimalist Printer Chassis pinned cleanly below paper exit mouth */}
          <div className="w-full max-w-[340px] mx-auto shrink-0">
            <PosPrinterDevice
              isPrinting={printStage === 'printing'}
              onFeed={handleReplayPrint}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full pt-2.5 border-t border-border/70">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                startIcon={<Printer className="size-4" aria-hidden="true" />}
                onClick={handleBrowserPrint}
                title="In trực tiếp ra máy in nhiệt 80mm hoặc lưu PDF từ hộp thoại in"
              >
                {isCompleted ? 'In bill (80mm)' : 'In bill nháp (80mm)'}
              </Button>
              {isCompleted && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isDownloadingPdf}
                  loadingText="Đang tải PDF..."
                  startIcon={<Download className="size-4" aria-hidden="true" />}
                  onClick={() => void handleDownloadPdf()}
                  title="Tải file PDF hóa đơn chính thức từ máy chủ"
                  className="bg-brand-highlight text-white enabled:hover:bg-brand-highlight/90 shadow-2xs"
                >
                  Xuất file PDF
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
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
                  variant="primary"
                  size="sm"
                  startIcon={<PlusCircle className="size-4" aria-hidden="true" />}
                  onClick={onNewOrder}
                >
                  Tạo đơn mới
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {/* Thermal paper exit chamber: full width flex centering with generous top/bottom teeth clearance */}
      <div
        ref={chamberRef}
        className="w-full px-3 sm:px-5 pt-3 pb-3 flex justify-center"
      >
        <div ref={receiptContainerRef} className="w-full max-w-[340px] relative">
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
              disableItemsScroll={false}
              className="is-torn-bottom"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
