import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import type { ConsignmentContract } from '@/types';

const SAMPLE_CONTRACTS: ConsignmentContract[] = [
  {
    id: 'cnt-001',
    contractNumber: 'HD-202610-0089',
    consignorName: 'Lê Minh',
    consignorPhone: '0912345678',
    commissionRate: 0.2, // 20% commission
    startDate: '2026-10-01',
    endDate: '2026-11-01',
    status: 'Active',
    itemCount: 6,
    totalSoldAmount: 1850000,
    totalPayoutAmount: 1480000,
  },
  {
    id: 'cnt-002',
    contractNumber: 'HD-202609-0042',
    consignorName: 'Lê Minh',
    consignorPhone: '0912345678',
    commissionRate: 0.25,
    startDate: '2026-09-01',
    endDate: '2026-10-01',
    status: 'Settled',
    itemCount: 4,
    totalSoldAmount: 1200000,
    totalPayoutAmount: 900000,
  },
];

export const ContractsPage: React.FC = () => {
  const [contracts] = useState<ConsignmentContract[]>(SAMPLE_CONTRACTS);
  const [searchPhone, setSearchPhone] = useState('0912345678');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#18211D]">Hợp Đồng Ký Gửi & Quyết Toán</h1>
          <p className="text-sm text-[#6B7C72] mt-1">
            Tra cứu hợp đồng ký gửi, theo dõi doanh thu bán hàng và số dư ví nhận tiền giải ngân.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
            <input
              type="text"
              placeholder="Nhập số điện thoại tra cứu..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-[#E2DBD0] bg-[#FFFDF8] text-xs focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="bg-[#FFFDF8] rounded-2xl border border-[#E2DBD0] p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18211D] flex items-center justify-center text-[#EF9F45]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#EF9F45]">{contract.contractNumber}</div>
                  <div className="text-lg font-extrabold text-[#18211D]">Người ký gửi: {contract.consignorName}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    contract.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : contract.status === 'Settled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {contract.status === 'Active' ? '🟢 Đang mở bán' : contract.status === 'Settled' ? '✅ Đã quyết toán' : 'Đã kết thúc'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-xs text-[#6B7C72] mb-1">Thời gian đợt ký gửi</div>
                <div className="font-semibold text-[#18211D]">{contract.startDate} → {contract.endDate}</div>
              </div>

              <div>
                <div className="text-xs text-[#6B7C72] mb-1">Tỷ lệ phí hoa hồng OCS</div>
                <div className="font-semibold text-[#18211D]">{contract.commissionRate * 100}%</div>
              </div>

              <div>
                <div className="text-xs text-[#6B7C72] mb-1">Doanh số đã bán</div>
                <div className="font-bold text-[#18211D]">{formatCurrency(contract.totalSoldAmount)}</div>
              </div>

              <div>
                <div className="text-xs text-[#6B7C72] mb-1">Thực nhận về ví</div>
                <div className="text-lg font-black text-green-700">{formatCurrency(contract.totalPayoutAmount)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-[#6B7C72]">
                Quy định: Hết hạn đợt nếu còn hàng tồn, bạn có thể chọn nhận lại hàng hoặc để OCS quyên góp từ thiện.
              </div>
              <button
                onClick={() => alert(`Xem chi tiết các món đồ trong hợp đồng ${contract.contractNumber}`)}
                className="text-xs font-bold text-[#EF9F45] hover:text-[#D48427] hover:underline"
              >
                Xem chi tiết món hàng →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

