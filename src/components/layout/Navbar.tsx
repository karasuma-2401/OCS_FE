import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Calendar, LayoutDashboard, ShoppingCart, LogIn, LogOut, Package, User as UserIcon } from 'lucide-react';
import mascotLogo from '@/assets/images/mascot-logo.png';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isStaffOrAdmin, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const canManage = hasRole('Admin') || hasRole('Manager');

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/');
    } catch {
      // Handled in auth context, redirect to home
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-ink text-paper border-b border-border-dark shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src={mascotLogo} alt="" className="w-10 h-10 object-contain" />
            <div>
              <div className="font-extrabold tracking-tight text-lg text-paper">OLD CLOTHES STORE</div>
              <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">Ký gửi & Thời trang bền vững</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/catalog"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-on-dark hover:text-paper hover:bg-border-dark/50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-accent" />
              Sản phẩm
            </Link>

            <Link
              to="/consign"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-on-dark hover:text-paper hover:bg-border-dark/50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-accent" />
              Cách ký gửi
            </Link>

            <Link
              to="/ui-components"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-on-dark hover:text-paper hover:bg-border-dark/50 transition-colors"
            >
              UI Kit
            </Link>

            {isStaffOrAdmin && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border-dark">
                <Link
                  to="/admin/pos"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-ink font-bold hover:bg-accent-hover transition-colors shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Web POS
                </Link>

                <Link
                  to="/admin/products"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-on-dark hover:text-paper hover:bg-border-dark/50 transition-colors"
                >
                  <Package className="w-4 h-4 text-accent" />
                  Kho hàng
                </Link>
                {canManage && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-on-dark hover:text-paper hover:bg-border-dark/50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-accent" />
                    Quản lý
                  </Link>
                )}
              </div>
            )}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-paper">{user?.fullName || user?.email}</span>
                  <span className="text-[10px] text-accent font-medium">{user?.roles?.join(', ')}</span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg text-muted-on-dark hover:text-danger-hover hover:bg-border-dark/50 transition-colors disabled:opacity-50"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{isLoggingOut ? 'Đang thoát...' : 'Thoát'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-border-dark text-paper hover:bg-border-dark-hover transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-accent" />
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-accent text-ink hover:bg-accent-hover transition-colors"
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
