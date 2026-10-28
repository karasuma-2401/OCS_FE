import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#18211D] text-[#A5B6AC] border-t border-[#2F3E37] py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EF9F45] flex items-center justify-center font-bold text-[#18211D] text-base">
                OCS
              </div>
              <span className="text-[#FFFDF8] font-bold text-lg tracking-tight">OLD CLOTHES STORE</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Hệ thống quản lý ký gửi, kiểm định chất lượng và phân phối quần áo cũ độc bản.
              Ứng dụng công nghệ hiện đại giúp tối ưu hóa vòng đời sản phẩm thời trang và thúc đẩy tiêu dùng tuần hoàn.
            </p>
            <div className="text-xs text-[#6B7C72]">
              Website React + Tailwind CSS + Vite · Backend Web API (.NET 10 & PostgreSQL)
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EF9F45] mb-4">Dịch vụ & Tiện ích</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/catalog" className="hover:text-[#FFFDF8] transition-colors">Danh mục sản phẩm</Link></li>
              <li><Link to="/appointments" className="hover:text-[#FFFDF8] transition-colors">Đặt lịch hẹn ký gửi</Link></li>
              <li><Link to="/contracts" className="hover:text-[#FFFDF8] transition-colors">Theo dõi hợp đồng & tiền ví</Link></li>
              <li><Link to="/login" className="hover:text-[#FFFDF8] transition-colors">Cổng thông tin khách hàng</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EF9F45] mb-4">Cửa hàng</h3>
            <div className="space-y-2 text-sm">
              <p>📍 123 Đường Ký Gửi, TP. Hồ Chí Minh</p>
              <p>📞 Hotline: 1900 xxxx (8:00 - 21:00)</p>
              <p>✉️ Email: support@ocs-store.vn</p>
              <div className="pt-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#2F3E37] text-[#FFFDF8]">
                  🟢 Hệ thống Online 100%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#2F3E37] text-center text-xs text-[#6B7C72]">
          © {new Date().getFullYear()} OCS - Old Clothes Store. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

