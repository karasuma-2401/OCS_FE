import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Calendar, ShieldCheck, ArrowRight, Zap, RefreshCw, Layers } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#18211D] rounded-3xl p-8 sm:p-14 lg:p-16 text-[#FFFDF8] relative overflow-hidden shadow-xl border border-[#2F3E37]">
            {/* Background accent blur */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#EF9F45]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-3xl space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF9F45]/20 border border-[#EF9F45]/30 text-[#EF9F45] text-xs font-bold tracking-wider uppercase">
                <Zap className="w-3.5 h-3.5" />
                Nền tảng Ký gửi Quần áo Thông minh
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Một nền tảng cho <span className="text-[#EF9F45]">ký gửi</span>, vận hành và bán hàng.
              </h1>

              <p className="text-lg text-[#A5B6AC] leading-relaxed max-w-2xl">
                OCS số hóa toàn bộ quy trình ký gửi thời trang: từ đặt lịch tiếp nhận, thẩm định chất lượng,
                gắn mã độc bản Barcode/QR, quản lý quầy bán lẻ Web POS trực tuyến đến tự động quyết toán giải ngân.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#EF9F45] text-[#18211D] font-bold text-sm hover:bg-[#F3AF62] transition-colors shadow-lg shadow-[#EF9F45]/20"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Khám phá Sản phẩm
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2F3E37] text-[#FFFDF8] font-semibold text-sm hover:bg-[#3D4F46] transition-colors border border-[#3D4F46]"
                >
                  <Calendar className="w-4 h-4 text-[#EF9F45]" />
                  Đặt lịch Ký gửi
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-12 pt-8 border-t border-[#2F3E37] grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-2xl font-black text-[#EF9F45]">100%</div>
                <div className="text-xs text-[#A5B6AC] font-medium">Trực tuyến Web API</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#FFFDF8]">Mỗi món</div>
                <div className="text-xs text-[#A5B6AC] font-medium">Mã Barcode độc bản</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#EF9F45]">VietQR</div>
                <div className="text-xs text-[#A5B6AC] font-medium">Thanh toán tức thì</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#FFFDF8]">Tự động</div>
                <div className="text-xs text-[#A5B6AC] font-medium">Đối soát & Quyết toán</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-10">
          <div className="text-xs font-extrabold uppercase tracking-widest text-[#EF9F45]">Quy trình chuẩn hóa</div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#18211D]">
            Giải pháp toàn diện cho vòng đời sản phẩm ký gửi
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFFDF8] rounded-2xl p-7 border border-[#E2DBD0] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EF9F45]/15 flex items-center justify-center text-[#EF9F45]">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#18211D]">1. Đặt lịch & Tiếp nhận</h3>
            <p className="text-sm text-[#6B7C72] leading-relaxed">
              Người ký gửi chọn khung giờ linh hoạt trên web. Nhân viên quét mã tiếp nhận, chụp ảnh và lập biên bản thẩm định nhanh chóng.
            </p>
          </div>

          <div className="bg-[#FFFDF8] rounded-2xl p-7 border border-[#E2DBD0] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EF9F45]/15 flex items-center justify-center text-[#EF9F45]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#18211D]">2. Thẩm định & Định giá</h3>
            <p className="text-sm text-[#6B7C72] leading-relaxed">
              Phân loại thương hiệu theo bảng tiêu chuẩn (Luxury, High-End, Mid-Range, Fast Fashion). Tạo hợp đồng với tỷ lệ hoa hồng minh bạch.
            </p>
          </div>

          <div className="bg-[#FFFDF8] rounded-2xl p-7 border border-[#E2DBD0] shadow-sm hover:shadow-md transition-shadow space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EF9F45]/15 flex items-center justify-center text-[#EF9F45]">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#18211D]">3. Bán hàng Web POS</h3>
            <p className="text-sm text-[#6B7C72] leading-relaxed">
              Màn hình Web POS hiện đại cho thu ngân: quét mã Barcode, tạo hóa đơn bán lẻ, thanh toán tiền mặt hoặc quét VietQR động trực tuyến.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Transparency */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#ECE6DC] rounded-3xl p-8 sm:p-12 border border-[#E2DBD0] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-2xl font-extrabold text-[#18211D]">Theo dõi hợp đồng & Tiền ví trực tuyến</h3>
            <p className="text-sm text-[#6B7C72] leading-relaxed">
              Người ký gửi có thể tra cứu từng sản phẩm đã bán, số tiền thu về và lịch sử giải ngân ngân hàng trong thời gian thực bất cứ lúc nào.
            </p>
          </div>

          <Link
            to="/contracts"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#18211D] text-[#FFFDF8] font-bold text-sm hover:bg-[#2F3E37] transition-colors whitespace-nowrap shadow-md"
          >
            <RefreshCw className="w-4 h-4 text-[#EF9F45]" />
            Tra cứu Hợp đồng
          </Link>
        </div>
      </section>
    </div>
  );
};

