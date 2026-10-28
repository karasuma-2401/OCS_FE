import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Users, DollarSign, Calendar, TrendingUp, Layers, ArrowUpRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#18211D]">Bảng Điều Khiển Cửa Hàng OCS</h1>
          <p className="text-sm text-[#6B7C72] mt-1">
            Tổng quan hoạt động kinh doanh, tiếp nhận hàng ký gửi và bán lẻ tại quầy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EF9F45] text-[#18211D] font-bold text-xs hover:bg-[#F3AF62] transition-colors shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            Mở Web POS bán hàng
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#6B7C72] text-xs font-semibold uppercase">
            <span>Doanh số hôm nay</span>
            <DollarSign className="w-4 h-4 text-[#EF9F45]" />
          </div>
          <div className="text-2xl font-black text-[#18211D]">3.450.000 đ</div>
          <div className="text-[11px] text-green-700 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +18% so với hôm qua
          </div>
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#6B7C72] text-xs font-semibold uppercase">
            <span>Món hàng đang bán</span>
            <Package className="w-4 h-4 text-[#EF9F45]" />
          </div>
          <div className="text-2xl font-black text-[#18211D]">148 món</div>
          <div className="text-[11px] text-[#6B7C72]">Tất cả đều có tem barcode</div>
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#6B7C72] text-xs font-semibold uppercase">
            <span>Lịch hẹn tiếp nhận</span>
            <Calendar className="w-4 h-4 text-[#EF9F45]" />
          </div>
          <div className="text-2xl font-black text-[#18211D]">6 lịch hẹn</div>
          <div className="text-[11px] text-amber-700 font-bold">2 lịch đang chờ duyệt</div>
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] shadow-sm space-y-2">
          <div className="flex items-center justify-between text-[#6B7C72] text-xs font-semibold uppercase">
            <span>Hợp đồng ký gửi</span>
            <Users className="w-4 h-4 text-[#EF9F45]" />
          </div>
          <div className="text-2xl font-black text-[#18211D]">24 hợp đồng</div>
          <div className="text-[11px] text-blue-700 font-bold">5 hợp đồng sắp hết hạn đợt</div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/pos"
          className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] hover:border-[#EF9F45] shadow-sm transition-all group block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#18211D] text-[#EF9F45] flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[#6B7C72] group-hover:text-[#EF9F45] transition-colors" />
          </div>
          <h3 className="font-bold text-base text-[#18211D] mb-1">Web POS Thu Ngân</h3>
          <p className="text-xs text-[#6B7C72] leading-relaxed">
            Giao diện bán hàng trực tuyến: quét mã Barcode, thanh toán tiền mặt và quét mã VietQR.
          </p>
        </Link>

        <Link
          to="/admin/products"
          className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] hover:border-[#EF9F45] shadow-sm transition-all group block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#18211D] text-[#EF9F45] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[#6B7C72] group-hover:text-[#EF9F45] transition-colors" />
          </div>
          <h3 className="font-bold text-base text-[#18211D]">Quản lý Kho & Kiểm định</h3>
          <p className="text-xs text-[#6B7C72] leading-relaxed">
            Kiểm tra trạng thái sản phẩm, thẩm định chất lượng món đồ và phân hạng thương hiệu.
          </p>
        </Link>

        <Link
          to="/appointments"
          className="bg-[#FFFDF8] rounded-2xl p-6 border border-[#E2DBD0] hover:border-[#EF9F45] shadow-sm transition-all group block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#18211D] text-[#EF9F45] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[#6B7C72] group-hover:text-[#EF9F45] transition-colors" />
          </div>
          <h3 className="font-bold text-base text-[#18211D]">Quản lý Lịch Tiếp nhận</h3>
          <p className="text-xs text-[#6B7C72] leading-relaxed">
            Xem lịch hẹn ký gửi của khách hàng theo từng ngày, xác nhận và chuẩn bị tiếp nhận đồ.
          </p>
        </Link>
      </div>
    </div>
  );
};

