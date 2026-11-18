import React, { useState } from 'react';
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
      className="max-w-md"
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
      <div className="space-y-4">
        {/* The Thermal Paper Receipt (Full with Footer, Totals, Barcode & Store Disclaimer) */}
        <div className="rounded-2xl bg-gradient-to-b from-[#FFFDFB] via-[#FAF3EC] to-[#FDF5F7] border border-[#F2DFDE] p-4 sm:p-5 shadow-sm flex justify-center overflow-x-auto">
          <div className="w-full max-w-[340px]">
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
              className="is-torn-bottom"
            />
          </div>
        </div>

        {/* Quick Help Note */}
        <p className="text-center text-[11px] text-muted no-print">
          Nhấn <strong>"In bill (80mm)"</strong> để in trực tiếp từ trình duyệt ra máy in nhiệt hóa đơn
          {pdfUrl ? ' hoặc "File PDF" để xem bản lưu trữ.' : '.'}
        </p>
      </div>
    </Modal>
  );
};
