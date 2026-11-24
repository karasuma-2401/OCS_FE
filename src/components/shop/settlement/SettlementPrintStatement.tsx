import { Printer } from 'lucide-react';
import { Button, Modal } from '@/components/shared';
import { formatVnd } from '@/api/settlements';
import { formatVndInWords } from '@/utils/currencyWords';
import type { SettlementContract } from '@/types/settlement';

export interface SettlementPrintStatementProps {
  open: boolean;
  settlement: SettlementContract | null;
  onClose: () => void;
}

export function SettlementPrintStatement({
  open,
  settlement,
  onClose,
}: SettlementPrintStatementProps) {
  if (!settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodText = `${new Date(settlement.periodStart).toLocaleDateString('vi-VN')} - ${new Date(
    settlement.periodEnd
  ).toLocaleDateString('vi-VN')}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-4xl"
      title={
        <div className="flex items-center gap-2">
          <Printer className="text-brand-pink" size={20} />
          <span>Bảng kê quyết toán hợp đồng ký gửi</span>
        </div>
      }
      description={
        <span>
          Số phiếu: <strong>{settlement.settlementNumber}</strong> · Mã HĐ:{' '}
          <strong>{settlement.contractNumber}</strong>
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-text-muted">
            Trạng thái hiện tại: <strong>{settlement.status}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handlePrint}
              startIcon={<Printer size={16} />}
            >
              In bảng kê (A4)
            </Button>
          </div>
        </div>
      }
    >
      <div id="printable-settlement-statement" className="rounded-lg border border-slate-200 bg-white p-6 text-slate-800 shadow-xs print:m-0 print:border-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold uppercase text-brand-ink">
              HỆ THỐNG KÝ GỬI THỜI TRANG OCS
            </h3>
            <p className="text-xs text-slate-600">Địa chỉ: 123 Đường Thời Trang, TP. Hồ Chí Minh</p>
            <p className="text-xs text-slate-600">Hotline: 1900 8888 · Email: contact@ocs.vn</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold text-brand-pink">{settlement.settlementNumber}</p>
            <p className="text-xs text-slate-500">
              Ngày lập: {new Date(settlement.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="my-6 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wide text-brand-ink">
            BẢNG KÊ QUYẾT TOÁN HỢP ĐỒNG KÝ GỬI
          </h2>
          <p className="mt-1 text-xs italic text-slate-600">
            (Kèm theo Hợp đồng số: <strong>{settlement.contractNumber}</strong> · Kỳ quyết toán:{' '}
            {periodText})
          </p>
        </div>

        {/* Customer & Banking Info */}
        <div className="mb-6 rounded-lg bg-slate-50 p-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p>
              <strong className="text-slate-700">Khách hàng / Người gửi:</strong>{' '}
              {settlement.customerName}
            </p>
            <p>
              <strong className="text-slate-700">Số điện thoại:</strong> {settlement.customerPhone}
            </p>
            <p>
              <strong className="text-slate-700">CCCD/CMND:</strong>{' '}
              {settlement.customerIdentity || '—'}
            </p>
            <p>
              <strong className="text-slate-700">Email:</strong> {settlement.customerEmail || '—'}
            </p>
            <p>
              <strong className="text-slate-700">Ngân hàng thụ hưởng:</strong>{' '}
              {settlement.bankName} ({settlement.bankCode})
            </p>
            <p>
              <strong className="text-slate-700">Số tài khoản:</strong>{' '}
              <span className="font-mono font-bold text-brand-ink">{settlement.bankAccountNumber}</span>
            </p>
            <p className="sm:col-span-2">
              <strong className="text-slate-700">Tên chủ tài khoản:</strong>{' '}
              <span className="uppercase font-medium">{settlement.bankAccountHolderName}</span>
            </p>
          </div>
        </div>

        {/* Products breakdown table */}
        <div className="mb-6 overflow-x-auto">
          <h4 className="mb-2 text-xs font-bold uppercase text-slate-700">
            I. BẢNG KÊ CHI TIẾT SẢN PHẨM KÝ GỬI ĐÃ BÁN
          </h4>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-100 font-semibold text-slate-700">
                <th className="p-2 text-center w-10">STT</th>
                <th className="p-2">Mã vạch</th>
                <th className="p-2">Tên sản phẩm</th>
                <th className="p-2">Size</th>
                <th className="p-2 text-right">Giá niêm yết</th>
                <th className="p-2 text-right">Giá bán</th>
                <th className="p-2 text-center">% HH</th>
                <th className="p-2 text-right">Hoa hồng OCS</th>
                <th className="p-2 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {settlement.products.map((item, idx) => (
                <tr key={item.id} className={item.status === 'Sold' ? 'bg-white' : 'bg-slate-50 text-slate-500'}>
                  <td className="p-2 text-center">{idx + 1}</td>
                  <td className="p-2 font-mono">{item.barcode}</td>
                  <td className="p-2 font-medium">{item.name}</td>
                  <td className="p-2">{item.size}</td>
                  <td className="p-2 text-right">{formatVnd(item.listedPrice)}</td>
                  <td className="p-2 text-right font-semibold">
                    {item.status === 'Sold' ? formatVnd(item.soldPrice) : '—'}
                  </td>
                  <td className="p-2 text-center">{item.status === 'Sold' ? `${item.commissionRate}%` : '—'}</td>
                  <td className="p-2 text-right">{item.status === 'Sold' ? formatVnd(item.commissionAmount) : '—'}</td>
                  <td className="p-2 text-center">
                    {item.status === 'Sold'
                      ? 'Đã bán'
                      : item.status === 'Returned'
                      ? 'Đã trả'
                      : 'Đang gửi'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fee Deductions */}
        {settlement.feeDetails.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-bold uppercase text-slate-700">
              II. CÁC KHOẢN PHÍ KHẤU TRỪ DỊCH VỤ
            </h4>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100 font-semibold text-slate-700">
                  <th className="p-2 text-center w-10">STT</th>
                  <th className="p-2">Tên loại phí</th>
                  <th className="p-2">Ghi chú</th>
                  <th className="p-2 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {settlement.feeDetails.map((fee, idx) => (
                  <tr key={fee.id}>
                    <td className="p-2 text-center">{idx + 1}</td>
                    <td className="p-2 font-medium">{fee.name}</td>
                    <td className="p-2 text-slate-500">{fee.description || 'Theo thỏa thuận hợp đồng'}</td>
                    <td className="p-2 text-right font-semibold text-rose-600">
                      {formatVnd(fee.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm">
          <h4 className="mb-3 text-xs font-bold uppercase text-slate-700">
            III. TỔNG HỢP GIÁ TRỊ THANH TOÁN
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span>(1) Tổng doanh thu sản phẩm đã bán:</span>
              <span className="font-semibold">{formatVnd(settlement.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>(2) Tiền hoa hồng cửa hàng khấu trừ:</span>
              <span className="font-semibold">- {formatVnd(settlement.commissionAmount)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>(3) Tổng phí dịch vụ & lưu kho khấu trừ:</span>
              <span className="font-semibold">- {formatVnd(settlement.fees)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-300 pt-2 text-base font-bold text-brand-ink">
              <span>SỐ TIỀN THỰC CHI CHO KHÁCH (1 - 2 - 3):</span>
              <span className="text-lg text-emerald-600">{formatVnd(settlement.netPayout)}</span>
            </div>
            <p className="pt-1 text-right text-xs italic text-slate-600">
              (Bằng chữ: <strong>{formatVndInWords(settlement.netPayout)}</strong>)
            </p>
          </div>
        </div>

        {/* Payment execution proof (if paid) */}
        {settlement.payment.paidAt && (
          <div className="mb-8 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
            <p>
              <strong>Thông tin chi trả:</strong> Đã chuyển khoản qua {settlement.payment.bankName} (STK:{' '}
              {settlement.payment.bankAccountNumber}) · Mã tham chiếu:{' '}
              <strong>{settlement.payment.bankTransactionReference || 'N/A'}</strong> lúc{' '}
              {new Date(settlement.payment.paidAt).toLocaleString('vi-VN')} bởi{' '}
              {settlement.payment.paidByEmployeeName || 'Kế toán'}.
            </p>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <p className="font-bold uppercase text-slate-700">Người lập bảng</p>
            <p className="italic text-slate-500">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-medium text-slate-800">Nhân viên tiếp nhận</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-700">Kế toán / Thủ quỹ</p>
            <p className="italic text-slate-500">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-medium text-slate-800">
              {settlement.payment.paidByEmployeeName || 'Lê Quỳnh Mai'}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-700">Quản lý duyệt chi</p>
            <p className="italic text-slate-500">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-medium text-slate-800">
              {settlement.approval.approvedByEmployeeName || 'Trần Hữu Toàn'}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-700">Khách hàng nhận tiền</p>
            <p className="italic text-slate-500">(Ký, ghi rõ họ tên)</p>
            <div className="h-16" />
            <p className="font-medium text-slate-800">{settlement.customerName}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
