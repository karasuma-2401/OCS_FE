import React from 'react';

export interface UnifiedContractProduct {
  id?: string;
  name: string;
  barcode?: string;
  size?: string;
  material?: string;
  conditionPercentage?: number;
  listedPrice: number;
  agreedCommissionRate?: number | null;
  customerPayout?: number;
  brandName?: string;
  categoryName?: string;
}

export interface UnifiedContractSheetProps {
  // Document metadata
  title?: string | null;
  organizationName?: string | null;
  headerText?: string | null;
  footerText?: string | null;
  contractNumber?: string | null;
  signedAt?: string | null;
  endsAt?: string | null;
  expiryHandling?: 'Return' | 'Donate' | string | null;

  // Bên A (Cửa hàng / Bên nhận ký gửi)
  storeAddress?: string | null;
  storeHotline?: string | null;
  storeWebsite?: string | null;
  employeeName?: string | null;
  employeeTitle?: string | null;
  employeePhone?: string | null;

  // Bên B (Khách hàng / Bên ký gửi)
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerIdentity?: string | null;
  customerAddress?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolderName?: string | null;

  // Products
  products?: UnifiedContractProduct[];

  // Terms & Notes
  terms?: string | null;
  batchNote?: string | null;

  // Signature
  signatureDataUrl?: string | null;
  signatureNode?: React.ReactNode; // Interactive signature canvas (e.g. ContractSignature)

  // Styling & Print target
  printableId?: string; // default "contract-printable-sheet"
  className?: string;
  isDraftPreview?: boolean;
}

export const formatVndPrice = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
};

export const formatContractDate = (isoString?: string | null): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const formatContractDateOnly = (isoString?: string | null): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const formatContractDateParts = (isoString?: string | null) => {
  const d = isoString ? new Date(isoString) : new Date();
  const valid = !Number.isNaN(d.getTime());
  const dateObj = valid ? d : new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  return {
    day,
    month,
    year,
    full: `ngày ${day} tháng ${month} năm ${year}`,
  };
};

export const UnifiedContractSheet: React.FC<UnifiedContractSheetProps> = ({
  title,
  organizationName,
  headerText,
  footerText,
  contractNumber,
  signedAt,
  endsAt,
  expiryHandling = 'Return',
  storeAddress = '123 Đường Thời Trang, Quận 1, TP. Hồ Chí Minh',
  storeHotline = '1900 6868',
  storeWebsite = 'ocs.fashion.vn',
  employeeName,
  employeeTitle,
  employeePhone,
  customerName,
  customerPhone,
  customerEmail,
  customerIdentity,
  customerAddress,
  bankCode,
  bankAccountNumber,
  bankAccountHolderName,
  products = [],
  terms,
  batchNote,
  signatureDataUrl,
  signatureNode,
  printableId = 'contract-printable-sheet',
  className = '',
  isDraftPreview = false,
}) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const totalQuantity = safeProducts.length;
  const totalListedPrice = safeProducts.reduce((sum, p) => sum + (p.listedPrice || 0), 0);
  const totalPayoutEst = safeProducts.reduce((sum, p) => {
    if (typeof p.customerPayout === 'number') return sum + p.customerPayout;
    const rate = p.agreedCommissionRate ?? 20;
    return sum + ((p.listedPrice || 0) * (1 - rate / 100));
  }, 0);

  const expiryText = expiryHandling === 'Donate'
    ? 'Quyên góp từ thiện theo chính sách cửa hàng'
    : 'Trả lại khách hàng khi hết hạn';

  const dateInfo = formatContractDateParts(signedAt);

  return (
    <div className={`unified-contract-sheet-wrapper ${className}`}>
      {/* CSS @media print chuyên dụng cho văn bản hợp đồng chuẩn A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: "Be Vietnam Pro", system-ui, -apple-system, sans-serif !important;
          }
          body:not([data-print-mode="barcode"]) * {
            visibility: hidden !important;
          }
          body:not([data-print-mode="barcode"]) #${printableId},
          body:not([data-print-mode="barcode"]) #${printableId} * {
            visibility: visible !important;
          }
          body:not([data-print-mode="barcode"]) #${printableId} {
            position: relative !important;
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
          body[data-print-mode="barcode"] #${printableId},
          body[data-print-mode="barcode"] #${printableId} *,
          body[data-print-mode="barcode"] .unified-contract-sheet-wrapper,
          body[data-print-mode="barcode"] .unified-contract-sheet-wrapper * {
            display: none !important;
            visibility: hidden !important;
            position: absolute !important;
            left: -99999px !important;
            top: -99999px !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          #${printableId} tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          #${printableId} .signature-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div
        id={printableId}
        className="rounded-2xl border border-gray-300 bg-white p-6 sm:p-10 text-gray-900 shadow-md print:border-none print:p-0 print:shadow-none select-text text-xs leading-normal font-sans"
      >
        {/* Header Hành chính chuẩn Việt Nam (Nghị định 30/2020/NĐ-CP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b-2 border-gray-800 pb-4">
          {/* Cột trái: Đơn vị ban hành & Số hiệu văn bản */}
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-gray-900">
              {organizationName || 'CỬA HÀNG OLD CLOTHES STORE (OCS)'}
            </h1>
            {headerText ? (
              <p className="text-[10.5px] text-gray-600 whitespace-pre-line">
                {headerText}
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-gray-700">
                Chuỗi Ký Gửi & Thời Trang Tuyển Chọn
              </p>
            )}
            <p className="text-xs font-bold text-gray-900 mt-1">
              Số: <span className="font-mono text-rose-950 font-black">{contractNumber || (isDraftPreview ? '[TẠO MỚI KHI LƯU]' : 'HĐ-KÝ-GỬI')}</span>
            </p>
            {storeAddress && (
              <p className="text-[10.5px] text-gray-600">
                Địa chỉ: {storeAddress}
              </p>
            )}
            {storeHotline && (
              <p className="text-[10.5px] text-gray-600">
                Hotline: {storeHotline} {storeWebsite ? `· Web: ${storeWebsite}` : ''}
              </p>
            )}
          </div>

          {/* Cột phải: Quốc hiệu, Tiêu ngữ và Địa danh ngày tháng (Trên cùng) */}
          <div className="text-center sm:text-right space-y-0.5">
            <p className="font-extrabold uppercase text-gray-950 tracking-wider text-xs sm:text-sm">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="text-xs sm:text-sm font-bold text-gray-900">
              Độc lập - Tự do - Hạnh phúc
            </p>
            <div className="mx-auto sm:ml-auto sm:mr-4 my-1 h-[1.5px] w-32 bg-gray-800" />
            <p className="text-[11px] text-gray-600 italic pt-1">
              TP. Hồ Chí Minh, {dateInfo.full}
            </p>
            <p className="text-[11px] text-gray-500">
              Thời hạn đến: {formatContractDateOnly(endsAt || new Date(Date.now() + 60 * 86400000).toISOString())}
            </p>
          </div>
        </div>

        {/* Tiêu đề chính của Hợp đồng */}
        <div className="my-5 text-center space-y-1">
          <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-gray-950">
            {title || 'HỢP ĐỒNG DỊCH VỤ KÝ GỬI THỜI TRANG'}
          </h2>
          <p className="text-xs text-gray-600 italic">
            (Căn cứ theo Bộ luật Dân sự số 91/2015/QH13 và sự thỏa thuận tự nguyện giữa hai bên)
          </p>
        </div>

        {/* Lời mở đầu thể thức hành chính */}
        <p className="text-xs text-gray-800 leading-relaxed mb-3">
          Hôm nay, {dateInfo.full}, tại Cửa hàng Old Clothes Store ({storeAddress || 'Chi nhánh tiếp nhận'}), chúng tôi gồm các bên dưới đây cùng thống nhất ký kết Hợp đồng dịch vụ ký gửi hàng hóa với các nội dung sau:
        </p>

        {/* Thông tin Bên A & Bên B */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-gray-300 bg-gray-50/70 p-4 text-xs">
          {/* Bên A: Cửa hàng */}
          <div className="space-y-1.5">
            <p className="font-extrabold uppercase text-gray-900 border-b border-gray-300 pb-1 flex items-center justify-between">
              <span>BÊN A (BÊN NHẬN KÝ GỬI):</span>
              <span className="text-[10px] font-normal text-gray-500 lowercase">(Cửa hàng)</span>
            </p>
            <div>
              <span className="font-bold text-gray-700">Đơn vị:</span> {organizationName || 'Cửa hàng Old Clothes Store (OCS)'}
            </div>
            <div>
              <span className="font-bold text-gray-700">Đại diện tiếp nhận:</span> {employeeName || 'Nhân viên cửa hàng'}
            </div>
            {employeeTitle && (
              <div>
                <span className="font-bold text-gray-700">Chức vụ:</span> {employeeTitle}
              </div>
            )}
            {employeePhone && (
              <div>
                <span className="font-bold text-gray-700">Điện thoại liên hệ:</span> <span className="font-mono">{employeePhone}</span>
              </div>
            )}
            {storeAddress && (
              <div>
                <span className="font-bold text-gray-700">Địa điểm tiếp nhận:</span> {storeAddress}
              </div>
            )}
          </div>

          {/* Bên B: Khách hàng */}
          <div className="space-y-1.5">
            <p className="font-extrabold uppercase text-gray-900 border-b border-gray-300 pb-1 flex items-center justify-between">
              <span>BÊN B (BÊN KÝ GỬI):</span>
              <span className="text-[10px] font-normal text-gray-500 lowercase">(Khách hàng)</span>
            </p>
            <div>
              <span className="font-bold text-gray-700">Họ và tên:</span>{' '}
              <span className="font-extrabold text-gray-900">{customerName || 'Khách hàng'}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">Số điện thoại:</span>{' '}
              <span className="font-mono font-semibold">{customerPhone || '—'}</span>
            </div>
            {customerEmail && (
              <div>
                <span className="font-bold text-gray-700">Email:</span> {customerEmail}
              </div>
            )}
            {customerIdentity && (
              <div>
                <span className="font-bold text-gray-700">Số CCCD / Định danh:</span>{' '}
                <span className="font-mono">{customerIdentity}</span>
              </div>
            )}
            {customerAddress && (
              <div>
                <span className="font-bold text-gray-700">Địa chỉ:</span> {customerAddress}
              </div>
            )}
            {bankAccountNumber && (
              <div>
                <span className="font-bold text-gray-700">Tài khoản nhận tiền:</span>{' '}
                <span className="font-mono font-semibold">{bankAccountNumber}</span> ({bankCode || 'Ngân hàng'}) - Chủ TK: {bankAccountHolderName || customerName}
              </div>
            )}
          </div>
        </div>

        {/* Thông tin thỏa thuận chung */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-xs flex flex-wrap justify-between items-center gap-2">
          <div>
            <span className="font-bold text-gray-700">Thời hạn hợp đồng:</span>{' '}
            Từ {formatContractDateOnly(signedAt || new Date().toISOString())} đến {formatContractDateOnly(endsAt || new Date(Date.now() + 60 * 86400000).toISOString())}
          </div>
          <div>
            <span className="font-bold text-gray-700">Phương thức hoàn trả:</span>{' '}
            <span className="font-bold text-gray-900">{expiryText}</span>
          </div>
          {batchNote && (
            <div className="w-full pt-1 border-t border-gray-100 text-gray-600 italic">
              <span className="font-bold text-gray-700 not-italic">Ghi chú đợt:</span> {batchNote}
            </div>
          )}
        </div>

        {/* Bảng danh sách sản phẩm ký gửi - In đúng, đủ, KHÔNG CÓ ẢNH */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-900">
              DANH MỤC HÀNG HÓA KÝ GỬI ({totalQuantity} MÓN):
            </h3>
            <span className="text-[11px] text-gray-500 italic">
              (Bản in tiêu chuẩn không kèm ảnh chụp sản phẩm)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-400 text-left text-xs">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="border border-gray-400 px-2 py-2 text-center w-8">STT</th>
                  <th className="border border-gray-400 px-2.5 py-2">Tên sản phẩm</th>
                  <th className="border border-gray-400 px-2 py-2 text-center w-28">Mã vạch</th>
                  <th className="border border-gray-400 px-2 py-2">Phân loại & Hiệu</th>
                  <th className="border border-gray-400 px-1.5 py-2 text-center w-14">Size / Vải</th>
                  <th className="border border-gray-400 px-1.5 py-2 text-center w-14">Độ mới</th>
                  <th className="border border-gray-400 px-2 py-2 text-right w-24">Giá niêm yết</th>
                  <th className="border border-gray-400 px-1.5 py-2 text-center w-16">Hoa hồng</th>
                  <th className="border border-gray-400 px-2 py-2 text-right w-28">Dự kiến nhận</th>
                </tr>
              </thead>
              <tbody>
                {safeProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-gray-400 py-4 text-center text-gray-500 italic">
                      Chưa có sản phẩm nào trong danh mục hợp đồng.
                    </td>
                  </tr>
                ) : (
                  safeProducts.map((item, idx) => {
                    const commRate = item.agreedCommissionRate ?? 20;
                    const payout = typeof item.customerPayout === 'number'
                      ? item.customerPayout
                      : (item.listedPrice || 0) * (1 - commRate / 100);
                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50">
                        <td className="border border-gray-400 px-2 py-2 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-400 px-2.5 py-2 font-bold text-gray-900">
                          {item.name}
                        </td>
                        <td className="border border-gray-400 px-2 py-2 font-mono text-center text-xs">
                          {item.barcode || 'Chưa cấp'}
                        </td>
                        <td className="border border-gray-400 px-2 py-2">
                          {item.categoryName || 'Khác'} {item.brandName ? `· ${item.brandName}` : ''}
                        </td>
                        <td className="border border-gray-400 px-1.5 py-2 text-center font-medium">
                          {item.size || '—'}{item.material ? ` · ${item.material}` : ''}
                        </td>
                        <td className="border border-gray-400 px-1.5 py-2 text-center">
                          {item.conditionPercentage ? `${item.conditionPercentage}%` : '—'}
                        </td>
                        <td className="border border-gray-400 px-2 py-2 text-right font-semibold">
                          {formatVndPrice(item.listedPrice)}
                        </td>
                        <td className="border border-gray-400 px-1.5 py-2 text-center text-gray-700">
                          {commRate}%
                        </td>
                        <td className="border border-gray-400 px-2 py-2 text-right font-bold text-gray-900">
                          {formatVndPrice(payout)}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Dòng tổng kết */}
                <tr className="bg-gray-100 font-extrabold text-gray-900">
                  <td colSpan={6} className="border border-gray-400 px-2.5 py-2 text-right uppercase">
                    Tổng cộng ({totalQuantity} sản phẩm):
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-black">
                    {formatVndPrice(totalListedPrice)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-2 text-center text-gray-500">—</td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-black text-rose-800">
                    {formatVndPrice(totalPayoutEst)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Điều khoản hợp đồng */}
        {terms && (
          <div className="mt-6">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-900 mb-2">
              ĐIỀU KHOẢN VÀ THỎA THUẬN KÝ GỬI:
            </h3>
            <div className="rounded-xl border border-gray-300 bg-gray-50/50 p-4 text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
              {terms}
            </div>
          </div>
        )}

        {/* Lưu ý kết thúc */}
        <p className="mt-4 text-[11px] text-gray-600 italic whitespace-pre-line">
          {footerText || '* Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản làm căn cứ đối soát và nhận tiền thanh toán khi sản phẩm được bán.'}
        </p>

        {/* Chữ ký xác nhận */}
        <div className="signature-block mt-8 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <p className="font-extrabold uppercase text-gray-900">ĐẠI DIỆN BÊN A (OCS)</p>
            <p className="text-[11px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
            <div className="h-28 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/40 p-2">
              <span className="font-serif italic text-emerald-700 font-semibold text-xs">[Đã xác nhận điện tử]</span>
              <span className="text-[10px] text-gray-500 mt-1">{organizationName || 'Hệ thống OCS'}</span>
            </div>
            <p className="font-bold text-gray-900 mt-1">{employeeName || 'Nhân viên tiếp nhận'}</p>
            {employeeTitle && <p className="text-[11px] text-gray-600">{employeeTitle}</p>}
          </div>

          <div className="space-y-1">
            <p className="font-extrabold uppercase text-gray-900">ĐẠI DIỆN BÊN B (KHÁCH HÀNG)</p>
            <p className="text-[11px] text-gray-500 italic">(Ký, ghi rõ họ tên)</p>
            <div className="h-28 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/40 p-2 overflow-hidden">
              {signatureNode ? (
                <div className="w-full h-full flex items-center justify-center">
                  {signatureNode}
                </div>
              ) : signatureDataUrl ? (
                <img
                  src={signatureDataUrl}
                  alt="Chữ ký khách hàng"
                  className="max-h-24 max-w-[85%] object-contain"
                />
              ) : (
                <span className="font-serif italic text-gray-400 text-xs">[Chữ ký khách hàng]</span>
              )}
            </div>
            <p className="font-bold text-gray-900 mt-1">{customerName || 'Khách hàng'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
