import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Key, User as UserIcon, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/api/client';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Try backend API first
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });

      if (response.data?.isSuccess && response.data?.value) {
        const { token, user } = response.data.value;
        login(token, user);
        navigate(from, { replace: true });
        return;
      }
    } catch (err: any) {
      // If backend API isn't responding or returning error, support demo account
      if (username === 'admin' || username === 'staff' || username === 'user') {
        const role = username === 'admin' ? 'Admin' : username === 'staff' ? 'Staff' : 'Customer';
        login('mock-jwt-token-ocs', {
          id: `usr-${username}`,
          username,
          fullName: username === 'admin' ? 'Quản Trị Viên OCS' : username === 'staff' ? 'Thu Ngân Quầy' : 'Khách Hàng',
          email: `${username}@ocs-store.vn`,
          roles: [role],
        });
        navigate(from, { replace: true });
        return;
      }
      setError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoRole: 'admin' | 'staff' | 'user') => {
    const roleName = demoRole === 'admin' ? 'Admin' : demoRole === 'staff' ? 'Staff' : 'Customer';
    login(`demo-jwt-token-${demoRole}`, {
      id: `usr-${demoRole}`,
      username: demoRole,
      fullName: demoRole === 'admin' ? 'Quản Trị Viên OCS' : demoRole === 'staff' ? 'Nhân Viên Thu Ngân' : 'Khách Hàng Ký Gửi',
      email: `${demoRole}@ocs-store.vn`,
      roles: [roleName],
    });
    navigate(demoRole === 'staff' ? '/admin/pos' : demoRole === 'admin' ? '/admin' : '/', { replace: true });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#FFFDF8] rounded-3xl p-8 sm:p-10 border border-[#E2DBD0] shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#18211D] text-[#EF9F45] font-black text-xl flex items-center justify-center mx-auto shadow-md">
            OCS
          </div>
          <h1 className="text-2xl font-extrabold text-[#18211D]">Đăng nhập hệ thống</h1>
          <p className="text-xs text-[#6B7C72]">Dành cho Khách hàng ký gửi và Nhân viên cửa hàng</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-[#18211D] mb-1.5">Tên đăng nhập / Email</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-[#18211D] mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#18211D] text-[#FFFDF8] font-bold text-sm hover:bg-[#2F3E37] transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="pt-4 border-t border-[#E2DBD0] space-y-2">
          <div className="text-[11px] font-bold uppercase text-[#6B7C72] text-center">Đăng nhập nhanh thử nghiệm</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-2 px-2 text-center rounded-lg border border-[#E2DBD0] bg-[#ECE6DC] hover:bg-[#E2DBD0] text-[11px] font-bold text-[#18211D]"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff')}
              className="py-2 px-2 text-center rounded-lg border border-[#E2DBD0] bg-[#ECE6DC] hover:bg-[#E2DBD0] text-[11px] font-bold text-[#18211D]"
            >
              🛒 Thu ngân
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('user')}
              className="py-2 px-2 text-center rounded-lg border border-[#E2DBD0] bg-[#ECE6DC] hover:bg-[#E2DBD0] text-[11px] font-bold text-[#18211D]"
            >
              👤 Khách hàng
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-[#6B7C72]">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-bold text-[#EF9F45] hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

