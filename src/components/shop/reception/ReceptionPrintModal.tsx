import React, { useState } from 'react';
import type { ContractImage } from '@/api/contracts';
import { X, Printer, CheckCircle } from 'lucide-react';
import type { ReceptionContractResult } from '@/types';
import type { ConsignmentItemRow } from './ConsignmentReceptionModal';
import { UnifiedContractSheet, type UnifiedContractProduct } from '@/components/shop/UnifiedContractSheet';

export const BUYOUT_RECEPTION_TERMS = 'Khách hàng xác nhận thông tin sản phẩm và mức giá thu mua được ghi trên phiếu.';
export interface StoreContactInfo {
  name: string;
  slogan: string;
  address: string;
  hotline: string;
  website: string;
  taxCode?: string;
}

export const DEFAULT_STORE_CONTACT: StoreContactInfo = {
  name: 'Old Clothes Store (OCS)',
  slogan: 'Chuỗi Cửa Hàng & Ký Gửi Thời Trang Tuyển Chọn',
  address: '123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh',
  hotline: '1900 6868',
  website: 'ocs.fashion.vn',
};

interface ReceptionPrintModalProps {
  open: boolean;
  onClose: () => void;
  contract: ReceptionContractResult | null;
  items?: ConsignmentItemRow[];
  commissionShop?: number;
  signature?: ContractImage | null;
  terms?: string;
  note?: string | null;
  storeInfo?: StoreContactInfo;
  customerDetails?: {
    email?: string | null;
    identity?: string | null;
    address?: string | null;
    bankCode?: string | null;
    bankAccount?: string | null;
    bankHolder?: string | null;
  };
  title?: string;
  referenceNotice?: string;
  template?: {
    title?: string;
    organizationName?: string;
    headerText?: string;
    footerText?: string;
    defaultTerms?: string;
  } | null;
}

export const ReceptionPrintModal: React.FC<ReceptionPrintModalProps> = ({
  open,
  onClose,
  contract,
  items = [],
  signature,
  terms,
  note,
  storeInfo = DEFAULT_STORE_CONTACT,
  customerDetails,
  title = 'Phiếu tiếp nhận & Hợp đồng',
  referenceNotice,
  template,
}) => {
  const [printError, setPrintError] = useState('');
  const [printing, setPrinting] = useState(false);

  if (!open || !contract) return null;

  const handlePrint = async () => {
    setPrintError('');
    setPrinting(true);
    try {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('#reception-printable-sheet img'));
      await Promise.all(images.map(image => image.decode().catch(() => {})));
      await document.fonts.ready;
      window.print();
    } catch {
      setPrintError('Không thể chuẩn bị bản in. Vui lòng thử lại.');
    } finally {
      setPrinting(false);
    }
  };

  const sheetProducts: UnifiedContractProduct[] =
    contract.createdProducts && contract.createdProducts.length > 0
      ? contract.createdProducts.map((p, idx) => {
          const itemMeta = items.find(it => it.id === p.id) || items[idx];
          return {
            id: p.id || `cp-${idx}`,
            name: p.name,
            barcode: p.barcode,
            size: itemMeta?.size || '',
            brandName: itemMeta?.brand || '',
            material: itemMeta?.material || '',
            categoryName: itemMeta?.category || 'Khác',
            conditionPercentage: Number(itemMeta?.condition?.replace(/[^0-9]/g, '')) || 95,
            listedPrice: p.listedPrice,
            agreedCommissionRate: p.commissionRate,
            customerPayout: p.customerPayout,
          };
        })
      : items.map(it => ({
          id: it.id,
          name: it.name,
          barcode: (it as any).barcode || '—',
          size: it.size || '',
          brandName: it.brand || '',
          material: it.material || '',
          categoryName: it.category || 'Khác',
          conditionPercentage: Number(it.condition.replace(/[^0-9]/g, '')) || 95,
          listedPrice: it.listedPrice,
          agreedCommissionRate: it.commissionRate,
          customerPayout: it.customerPayout,
        }));

  const signatureDataUrl = signature
    ? `data:${signature.contentType};base64,${signature.data}`
    : null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="reception-print-container relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden text-gray-900 font-sans print:p-0 print:border-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <CheckCircle className="text-emerald-600" size={18} />
            <span>{title}</span>
            <span className="font-mono text-xs font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-md ml-1">
              #{contract.contractNumber}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={printing || Boolean(referenceNotice)}
              style={{ color: '#FFFFFF' }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 !text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Printer size={15} /> {printing ? 'Đang chuẩn bị...' : 'In / lưu PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {printError && (
          <p role="alert" className="px-6 py-2 text-sm text-state-danger print:hidden">
            {printError}
          </p>
        )}

        {/* Unified Contract Sheet - exact match across view, print, intake, and management */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible bg-white">
          {referenceNotice && (
            <p role="note" className="mb-4 rounded-xl border border-amber-600 bg-amber-50 p-3 font-bold text-amber-900 text-xs print:hidden">
              BẢN THAM KHẢO: {referenceNotice}
            </p>
          )}

          <UnifiedContractSheet
            title={
              contract.intakeType === 'Buyout'
                ? 'BIÊN BẢN THU MUA ĐỨT HÀNG HÓA'
                : template?.title || 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG'
            }
            organizationName={template?.organizationName || storeInfo.name}
            headerText={template?.headerText}
            footerText={template?.footerText}
            contractNumber={contract.contractNumber}
            signedAt={contract.signedAt}
            endsAt={contract.endsAt}
            expiryHandling={contract.expiryHandling || 'Return'}
            storeAddress={storeInfo.address}
            storeHotline={storeInfo.hotline}
            storeWebsite={storeInfo.website}
            employeeName={(contract as any).employeeName || 'Nhân viên tiếp nhận'}
            customerName={contract.customerName}
            customerPhone={contract.customerPhone}
            customerEmail={customerDetails?.email || null}
            customerIdentity={customerDetails?.identity || null}
            customerAddress={customerDetails?.address || null}
            bankCode={customerDetails?.bankCode || null}
            bankAccountNumber={customerDetails?.bankAccount || null}
            bankAccountHolderName={customerDetails?.bankHolder || null}
            products={sheetProducts}
            terms={terms || template?.defaultTerms || (contract.intakeType === 'Buyout' ? BUYOUT_RECEPTION_TERMS : undefined)}
            batchNote={note || null}
            signatureDataUrl={signatureDataUrl}
            printableId="reception-printable-sheet"
          />

          {items.some(it => it.images && it.images.length > 0) && (
            <section className="print:hidden mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <h3 className="font-extrabold uppercase text-xs text-gray-700">Ảnh sản phẩm tiếp nhận (Xem trên màn hình)</h3>
              {items.filter(it => it.images && it.images.length > 0).map(it => (
                <figure key={it.id} className="space-y-1">
                  <figcaption className="font-bold text-xs text-gray-800">{it.name}</figcaption>
                  <div className="flex flex-wrap gap-2">
                    {it.images?.map((url, index) => (
                      <img key={`${url}-${index}`} src={url} alt={`${it.name} - ảnh ${index + 1}`} className="h-24 w-24 rounded object-cover border border-gray-300" />
                    ))}
                  </div>
                </figure>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
