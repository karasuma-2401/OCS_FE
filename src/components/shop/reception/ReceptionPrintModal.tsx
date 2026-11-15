import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import type { ReceptionContractResult } from '@/types';
import type { ConsignmentItemRow } from './ConsignmentReceptionModal';

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
  taxCode: '0312345678',
};

interface ReceptionPrintModalProps {
  open: boolean;
  onClose: () => void;
  contract: ReceptionContractResult | null;
  items?: ConsignmentItemRow[];
  commissionShop?: number;
  customerDetails?: {
    email?: string;
    identity?: string;
    address?: string;
    bankCode?: string;
    bankAccount?: string;
    bankHolder?: string;
  };
  storeInfo?: StoreContactInfo;
}

export const ReceptionPrintModal: React.FC<ReceptionPrintModalProps> = ({
  open,
  onClose,
  contract,
  items = [],
  commissionShop = 20,
  customerDetails,
  storeInfo = DEFAULT_STORE_CONTACT,
}) => {
  if (!open || !contract) return null;

  const isBuyout = contract.intakeType === 'Buyout';

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

  const handlePrint = () => {
    window.print();
  };

  const printRows =
    contract.createdProducts && contract.createdProducts.length > 0
      ? contract.createdProducts.map((p, idx) => {
          const itemMeta = items[idx] || items.find((it) => it.name === p.name);
          return {
            id: p.id || `cp-${idx}`,
            name: p.name,
            barcode: p.barcode,
            size: itemMeta?.size || '',
            category: itemMeta?.category || 'Sản phẩm',
            condition: itemMeta?.condition || '95% Like New',
            listedPrice: p.listedPrice,
            commissionRate: p.commissionRate,
            customerPayout: p.customerPayout,
          };
        })
      : items.map((it) => ({
          id: it.id,
          name: it.name,
          barcode: '',
          size: it.size,
          category: it.category,
          condition: it.condition,
          listedPrice: it.listedPrice,
          commissionRate: it.commissionRate ?? commissionShop,
          customerPayout: it.customerPayout,
        }));

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:m-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
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
          #reception-printable-sheet tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #reception-printable-sheet .signature-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden text-gray-900 font-sans print:p-0 print:border-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <CheckCircle className="text-emerald-600" size={18} />
            <span>{isBuyout ? 'Đã tạo phiếu thu mua đứt thành công' : 'Đã tạo phiếu tiếp nhận ký gửi thành công'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              style={{ color: '#FFFFFF' }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 !text-white font-bold text-xs shadow-sm transition active:scale-95"
            >
              <Printer size={15} /> {isBuyout ? 'In Phiếu Thu Mua (Khổ A4)' : 'In Phiếu Tiếp Nhận (Khổ A4)'}
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

        <div
          id="reception-printable-sheet"
          className="p-8 sm:p-10 overflow-y-auto print:overflow-visible print:p-6 text-xs space-y-6 bg-white select-text"
        >
          <div className="flex justify-between items-start border-b border-gray-300 pb-5">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 uppercase">
                {storeInfo.name}
              </h1>
              <p className="text-[11px] text-gray-600 mt-1">
                {storeInfo.slogan}
              </p>
              <p className="text-[11px] text-gray-600">
                Địa chỉ: {storeInfo.address}
              </p>
              <p className="text-[11px] text-gray-600">
                Hotline: {storeInfo.hotline} • Website: {storeInfo.website}
              </p>
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

          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-wide">
              {isBuyout
                ? 'Phiếu Tiếp Nhận Thu Mua Đứt'
                : 'Phiếu Tiếp Nhận Ký Gửi Thời Trang'}
            </h2>
            <p className="text-[11px] font-semibold text-gray-600">
              {isBuyout
                ? 'BIÊN BẢN THU MUA ĐỨT HÀNG HÓA'
                : 'BIÊN BẢN TIẾP NHẬN & HỢP ĐỒNG KÝ GỬI'}
            </p>
            <p className="text-[11px] text-gray-500 italic">
              (Bản lưu đối chiếu giữa Cửa hàng và Khách hàng)
            </p>
          </div>

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
                  {isBuyout
                    ? 'Thu mua đứt (Vốn shop)'
                    : 'Hàng ký gửi hoa hồng'}
                </span>
              </div>
              {customerDetails?.identity && (
                <div>
                  <span className="font-bold text-gray-600">CCCD/Giấy tờ:</span>{' '}
                  <span className="text-gray-900">{customerDetails.identity}</span>
                </div>
              )}
              {customerDetails?.email && (
                <div>
                  <span className="font-bold text-gray-600">Email:</span>{' '}
                  <span className="text-gray-900">{customerDetails.email}</span>
                </div>
              )}
              {customerDetails?.address && (
                <div>
                  <span className="font-bold text-gray-600">Địa chỉ:</span>{' '}
                  <span className="text-gray-900">{customerDetails.address}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {isBuyout ? (
                <>
                  <div>
                    <span className="font-bold text-gray-600">Phương thức:</span>{' '}
                    <span className="font-bold text-gray-900">
                      Thanh toán dứt điểm khi nhận hàng
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-600">Tình trạng kiểm định:</span>{' '}
                    <span className="font-bold text-gray-900">
                      Đã kiểm định & chốt giá thu mua
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-600">Tổng số lượng:</span>{' '}
                    <span className="font-bold text-gray-900">
                      {contract.totalApprovedItems} sản phẩm
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
              {customerDetails?.bankAccount && (
                <div>
                  <span className="font-bold text-gray-600">Tài khoản nhận tiền:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {customerDetails.bankCode ? `${customerDetails.bankCode} - ` : ''}{customerDetails.bankAccount}
                    {customerDetails.bankHolder ? ` (${customerDetails.bankHolder})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">
              {isBuyout
                ? `Danh mục sản phẩm thu mua đứt (${contract.totalApprovedItems} món)`
                : `Danh mục sản phẩm tiếp nhận ký gửi (${contract.totalApprovedItems} món)`}
            </h3>

            <div className="rounded-xl border border-gray-300 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700 text-[11px]">
                    <th className="py-2.5 pl-3 w-8">#</th>
                    <th className="py-2.5 px-3">TÊN SẢN PHẨM & MÔ TẢ</th>
                    <th className="py-2.5 px-3">PHÂN LOẠI</th>
                    <th className="py-2.5 px-3">ĐỘ MỚI</th>
                    {!isBuyout && <th className="py-2.5 px-3 text-right">HOA HỒNG</th>}
                    <th className="py-2.5 px-3 text-right">{isBuyout ? 'GIÁ BÁN DỰ KIẾN' : 'GIÁ NIÊM YẾT'}</th>
                    <th className="py-2.5 pr-3 text-right">{isBuyout ? 'GIÁ THU MUA' : 'KHÁCH NHẬN'}</th>
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
                        {item.barcode && (
                          <div className="font-mono text-[10px] text-gray-500 font-normal">
                            Mã vạch: {item.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-700">{item.category}</td>
                      <td className="py-2 px-3 text-gray-700">{item.condition}</td>
                      {!isBuyout && (
                        <td className="py-2 px-3 text-right font-semibold text-gray-700">
                          {item.commissionRate}%
                        </td>
                      )}
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
                    <td colSpan={isBuyout ? 4 : 5} className="py-2.5 pl-3 uppercase">
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
              <span>{isBuyout ? 'Quy định & Cam kết thu mua đứt:' : 'Quy định & Cam kết ký gửi:'}</span>
            </div>
            {isBuyout ? (
              <>
                <p>
                  1. Khách hàng cam kết toàn bộ sản phẩm bán đứt thuộc quyền sở hữu hợp pháp của mình, là hàng chính hãng và đúng tình trạng đã kiểm định tại quầy.
                </p>
                <p>
                  2. Cửa hàng thanh toán dứt điểm số tiền thu mua cho khách hàng. Sản phẩm sau khi thu mua thuộc toàn quyền sở hữu và định đoạt của cửa hàng.
                </p>
                <p>
                  3. Giao dịch thu mua đứt là dứt điểm, hai bên đã kiểm tra và đồng ý với mức giá thu mua, không áp dụng đổi trả hay khiếu nại sau khi ký nhận.
                </p>
              </>
            ) : (
              <>
                <p>
                  1. Khách hàng cam kết toàn bộ sản phẩm ký gửi có nguồn gốc xuất xứ rõ ràng, chính hãng và đúng như tiếp nhận tại quầy.
                </p>
                <p>
                  2. Tiền bán hàng sẽ được tất toán cho chủ hàng định kỳ hoặc ngay sau khi món đồ được bán thành công theo thông tin tài khoản đã đăng ký.
                </p>
                <p>
                  3. Khi hết hạn đợt nếu không có gia hạn, sản phẩm sẽ được xử lý theo phương án đã thỏa thuận ({contract.expiryHandling === 'Donate' ? 'Quyên góp từ thiện' : 'Trả lại khách'}).
                </p>
              </>
            )}
          </div>

          <div className="signature-block grid grid-cols-2 gap-8 pt-6 pb-4 text-center text-xs">
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
                  {isBuyout ? 'Khách Hàng / Người Bán' : 'Chủ Hàng Ký Gửi'}
                </p>
                <p className="text-[11px] text-gray-500 italic">
                  (Ký và ghi rõ họ tên)
                </p>
              </div>
              <div className="font-bold text-gray-900">
                {contract.customerName}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-8 py-4 border-t border-gray-200 bg-gray-50 print:hidden shrink-0">
          <p className="text-xs text-gray-500">
            Mẹo: Bạn có thể nhấn <b>Ctrl + P</b> để in hoặc lưu thành file PDF.
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
