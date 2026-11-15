import React, { useState } from 'react';
import type { ContractImage } from '@/api/contracts';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import type { ReceptionContractResult } from '@/types';
import type { ConsignmentItemRow } from './ConsignmentReceptionModal';

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
  address: '',
  hotline: '',
  website: '',
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
  customerDetails?: { email?: string | null; identity?: string | null; address?: string | null; bankCode?: string | null; bankAccount?: string | null; bankHolder?: string | null };
  title?: string;
  referenceNotice?: string;
  template?: { title?: string; organizationName?: string; headerText?: string; footerText?: string } | null;
}

export const ReceptionPrintModal: React.FC<ReceptionPrintModalProps> = ({
  open,
  onClose,
  contract,
  items = [],
  commissionShop = 20,
  signature,
  terms,
  note,
  storeInfo = DEFAULT_STORE_CONTACT,
  customerDetails,
  title = 'Hợp đồng tiếp nhận',
  referenceNotice,
  template,
}) => {
  const [printError, setPrintError] = useState('');
  const [printing, setPrinting] = useState(false);
  if (!open || !contract) return null;

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN').format(num) + 'đ';

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const handlePrint = async () => {
    setPrintError(''); setPrinting(true);
    try {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('#reception-printable-sheet img'));
      await Promise.all(images.map(image => image.decode()));
      await document.fonts.ready;
      window.print();
    } catch { setPrintError('Không thể tải ảnh hoặc chữ ký để in. Kiểm tra kết nối và mở lại hợp đồng.'); }
    finally { setPrinting(false); }
  };

  const printRows =
    contract.createdProducts && contract.createdProducts.length > 0
      ? contract.createdProducts.map((p, idx) => {
          const itemMeta = items.find((it) => it.id === p.id) || items[idx];
          return {
            id: p.id || `cp-${idx}`,
            name: p.name,
            barcode: p.barcode,
            size: itemMeta?.size || '',
            brand: itemMeta?.brand || '',
            material: itemMeta?.material || '',
            description: itemMeta?.description || '',
            category: itemMeta?.category || '—',
            condition: itemMeta?.condition || '—',
            listedPrice: p.listedPrice,
            commissionRate: p.commissionRate,
            customerPayout: p.customerPayout,
            images: itemMeta?.images || [],
          };
        })
      : items.map((it) => ({
          id: it.id,
          name: it.name,
          barcode: '',
          size: it.size,
          brand: it.brand || '',
          material: it.material || '',
          description: it.description || '',
          category: it.category,
          condition: it.condition,
          listedPrice: it.listedPrice,
          commissionRate: it.commissionRate ?? commissionShop,
          customerPayout: it.customerPayout,
          images: it.images || [],
        }));

  return (
    <div className="reception-print-overlay fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:m-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            background: white !important;
            overflow: visible !important;
          }
          .reception-print-overlay, .reception-print-container { position: static !important; display: block !important; max-height: none !important; overflow: visible !important; }
          #reception-printable-sheet tr, #reception-printable-sheet figure { break-inside: avoid; }
          body * {
            visibility: hidden !important;
          }
          #reception-printable-sheet, #reception-printable-sheet * {
            visibility: visible !important;
          }
          #reception-printable-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="reception-print-container relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden text-gray-900 font-sans print:p-0 print:border-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <CheckCircle className="text-emerald-600" size={18} />
            <span>{title}</span>
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

        {printError && <p role="alert" className="px-6 py-2 text-sm text-state-danger print:hidden">{printError}</p>}
        <div
          id="reception-printable-sheet"
          className="p-8 sm:p-10 overflow-y-auto print:overflow-visible print:p-6 text-xs space-y-6 bg-white select-text"
        >
          {referenceNotice && <p role="note" className="border border-amber-600 p-3 font-bold text-amber-900">BẢN THAM KHẢO: {referenceNotice}</p>}
          <div className="flex justify-between items-start border-b border-gray-300 pb-5">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 uppercase">
                {template?.organizationName || storeInfo.name}
              </h1>
              <p className="text-[11px] text-gray-600 mt-1">
                {storeInfo.slogan}
              </p>
              {storeInfo.address && <p className="text-[11px] text-gray-600">
                Địa chỉ: {storeInfo.address}
              </p>}
              {(storeInfo.hotline || storeInfo.website) && <p className="text-[11px] text-gray-600">{storeInfo.hotline} {storeInfo.website}</p>}
            </div>

            <div className="text-right">
              <span className="inline-block rounded-md bg-gray-100 border border-gray-300 px-3 py-1 font-mono text-xs font-bold text-gray-800">
                MÃ: {contract.contractNumber}
              </span>
              <p className="text-[11px] text-gray-500 mt-1">
                Ngày lập: {formatDate(contract.signedAt)}
              </p>
            </div>
          </div>

          {customerDetails && <div className="grid grid-cols-2 gap-2 text-[11px]">{([['Email', customerDetails.email], ['CCCD', customerDetails.identity], ['Địa chỉ', customerDetails.address], ['Ngân hàng', customerDetails.bankCode], ['Số tài khoản', customerDetails.bankAccount], ['Chủ tài khoản', customerDetails.bankHolder]] as const).map(([label, value]) => value ? <p key={label}><strong>{label}:</strong> {value}</p> : null)}</div>}

          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-wide">
              {contract.intakeType === 'Buyout'
                ? 'Biên Bản Thu Mua Đứt Hàng Hóa'
                : template?.title || 'Biên Bản Tiếp Nhận & Hợp Đồng Ký Gửi'}
            </h2>
            <p className="text-[11px] text-gray-500 italic">
              (Bản lưu đối chiếu giữa Cửa hàng và Khách hàng)
            </p>
          </div>
          {template?.headerText && <p className="whitespace-pre-wrap">{template.headerText}</p>}
          {note && <p className="whitespace-pre-wrap"><strong>Ghi chú đợt:</strong> {note}</p>}

          {printRows.some(row => row.images.length > 0) && <section className="print:hidden space-y-3"><h3 className="font-extrabold uppercase">Ảnh sản phẩm tiếp nhận</h3>{printRows.filter(row => row.images.length > 0).map(row => <figure key={row.id} className="space-y-2"><figcaption className="font-bold">{row.name}</figcaption><div className="flex flex-wrap gap-2">{row.images.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${row.name} - ảnh ${index + 1}`} className="h-28 w-28 rounded object-cover" />)}</div></figure>)}</section>}

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4 bg-gray-50/70">
            <div className="space-y-1.5">
              <div>
                <span className="font-bold text-gray-600">Khách hàng:</span>{' '}
                <span className="font-extrabold text-gray-900">
                  {contract.customerName}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-600">Số điện thoại:</span>{' '}
                <span className="font-mono text-gray-900 font-semibold">
                  {contract.customerPhone}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-600">Hình thức:</span>{' '}
                <span className="font-bold text-gray-900">
                  {contract.intakeType === 'Buyout'
                    ? 'Thu mua đứt (Vốn shop)'
                    : 'Hàng ký gửi hoa hồng'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="font-bold text-gray-600">Thời hạn đợt:</span>{' '}
                <span className="font-bold text-gray-900">
                  Đến ngày {formatDate(contract.endsAt)}
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-600">Quy tắc hoa hồng:</span>{' '}
                <span className="font-bold text-gray-900">
                  Theo phân hạng thương hiệu & tỷ lệ chốt
                </span>
              </div>
              <div>
                <span className="font-bold text-gray-600">Xử lý hết hạn:</span>{' '}
                <span className="font-bold text-gray-900">
                  {contract.expiryHandling === 'Donate' ? 'Quyên góp từ thiện' : 'Trả lại khách'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">
              Danh mục sản phẩm tiếp nhận ({contract.totalApprovedItems} món)
            </h3>

            <div className="rounded-xl border border-gray-300 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700 text-[11px]">
                    <th className="py-2.5 pl-3 w-8">#</th>
                    <th className="py-2.5 px-3">TÊN SẢN PHẨM & MÔ TẢ</th>
                    <th className="py-2.5 px-3">PHÂN LOẠI</th>
                    <th className="py-2.5 px-3">ĐỘ MỚI</th>
                    <th className="py-2.5 px-3 text-right">HOA HỒNG</th>
                    <th className="py-2.5 px-3 text-right">GIÁ NIÊM YẾT</th>
                    <th className="py-2.5 pr-3 text-right">KHÁCH NHẬN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {printRows.map((item, idx) => (
                    <tr key={item.id} className="text-gray-800">
                      <td className="py-2 pl-3 font-semibold text-gray-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900">
                        <div>
                          {item.name} {item.size ? `(${item.size})` : ''}
                        </div>
                        {(item.brand || item.material) && <div className="text-[10px] font-normal text-gray-600">{[item.brand, item.material].filter(Boolean).join(' · ')}</div>}
                        {item.description && <div className="whitespace-pre-wrap text-[10px] font-normal text-gray-600">{item.description}</div>}
                        {item.barcode && (
                          <div className="font-mono text-[10px] text-gray-500 font-normal">
                            Mã vạch: {item.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-700">{item.category}</td>
                      <td className="py-2 px-3 text-gray-700">{item.condition}</td>
                      <td className="py-2 px-3 text-right">{contract.intakeType === 'Buyout' ? '—' : `${item.commissionRate}%`}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        {formatVND(item.listedPrice)}
                      </td>
                      <td className="py-2 pr-3 text-right font-bold text-emerald-700">
                        {formatVND(item.customerPayout)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-extrabold text-gray-900 border-t border-gray-300 text-xs">
                    <td colSpan={5} className="py-2.5 pl-3 uppercase">
                      Tổng Cộng ({contract.totalApprovedItems} món đạt chuẩn)
                    </td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {formatVND(contract.totalEstimatedValue)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-black text-emerald-700">
                      {formatVND(contract.totalCustomerPayout)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-1 text-[11px] text-gray-600 leading-relaxed">
            <div className="flex items-center gap-1 font-bold text-gray-800 text-[11px]">
              <ShieldCheck size={14} className="text-pink-600" />
              <span>Quy định & Cam kết ký gửi:</span>
            </div>
            <p className="whitespace-pre-wrap">{contract.intakeType === 'Buyout' ? BUYOUT_RECEPTION_TERMS : terms || 'Chưa có điều khoản bổ sung.'}</p>
          </div>

          {template?.footerText && <p className="whitespace-pre-wrap">{template.footerText}</p>}
          <div className="grid grid-cols-2 gap-8 pt-6 pb-4 text-center text-xs">
            <div className="space-y-16">
              <div>
                <p className="font-extrabold text-gray-900 uppercase">
                  Đại Diện Cửa Hàng
                </p>
                <p className="text-[11px] text-gray-500 italic">
                  (Ký và ghi rõ họ tên)
                </p>
              </div>
              <div className="font-bold text-gray-700">
                Nhân viên tiếp nhận
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="font-extrabold text-gray-900 uppercase">
                  Chủ Hàng Ký Gửi
                </p>
                <p className="text-[11px] text-gray-500 italic">
                  (Ký và ghi rõ họ tên)
                </p>
              </div>
              {signature && <img src={`data:${signature.contentType};base64,${signature.data}`} alt="Chữ ký khách hàng" className="mx-auto h-16 max-w-full object-contain" />}
              <div className="font-bold text-gray-900">
                {contract.customerName}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-gray-50 print:hidden shrink-0">
          <p className="text-xs text-gray-500">
            {referenceNotice ? 'Không đủ dữ liệu gốc để in hợp đồng đã ký.' : <>Mẹo: Bạn có thể nhấn <b>Ctrl + P</b> để in hoặc lưu thành file PDF.</>}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
