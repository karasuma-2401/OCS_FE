import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Calendar, FileText, LayoutDashboard, ShoppingCart, LogIn, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isStaffOrAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#18211D] text-[#FFFDF8] border-b border-[#2F3E37] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#EF9F45] flex items-center justify-center font-bold text-[#18211D] text-lg shadow-inner group-hover:bg-[#F3AF62] transition-colors">
              OCS
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-lg text-[#FFFDF8]">OLD CLOTHES STORE</div>
              <div className="text-[10px] uppercase tracking-wider text-[#EF9F45] font-semibold">Ký gửi & Thời trang bền vững</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/catalog"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#A5B6AC] hover:text-[#FFFDF8] hover:bg-[#2F3E37]/50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#EF9F45]" />
              Sản phẩm
            </Link>

            <Link
              to="/appointments"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#A5B6AC] hover:text-[#FFFDF8] hover:bg-[#2F3E37]/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#EF9F45]" />
              Đặt lịch ký gửi
            </Link>

            <Link
              to="/contracts"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#A5B6AC] hover:text-[#FFFDF8] hover:bg-[#2F3E37]/50 transition-colors"
            >
              <FileText className="w-4 h-4 text-[#EF9F45]" />
              Hợp đồng của tôi
            </Link>

            {isStaffOrAdmin && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[#2F3E37]">
                <Link
                  to="/admin/pos"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF9F45] text-[#18211D] font-bold hover:bg-[#F3AF62] transition-colors shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Web POS
                </Link>

                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[#A5B6AC] hover:text-[#FFFDF8] hover:bg-[#2F3E37]/50 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#EF9F45]" />
                  Quản lý
                </Link>
              </div>
            )}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-[#FFFDF8]">{user?.fullName || user?.username}</span>
                  <span className="text-[10px] text-[#EF9F45] font-medium">{user?.roles?.join(', ')}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-[#A5B6AC] hover:text-red-400 hover:bg-[#2F3E37]/50 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2F3E37] text-[#FFFDF8] hover:bg-[#3D4F46] transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#EF9F45]" />
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#EF9F45] text-[#18211D] hover:bg-[#F3AF62] transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

