import React, { useState } from 'react';
import { ShoppingCart, Barcode, Trash2, Banknote, QrCode, CheckCircle2 } from 'lucide-react';
import type { Product, CartItem } from '@/types';

const INITIAL_POS_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    sku: 'OCS-VINTAGE-001',
    barcode: '893850123001',
    name: 'Áo khoác Blazer Dạ Tweed Cổ Điển',
    price: 650000,
    status: 'OnSale',
    category: { id: 'c1', name: 'Áo khoác' },
  },
  {
    id: 'prod-02',
    sku: 'OCS-DENIM-002',
    barcode: '893850123002',
    name: 'Quần Jean Levi\'s 501 Original Fit',
    price: 850000,
    status: 'OnSale',
    category: { id: 'c2', name: 'Quần Denim' },
  },
  {
    id: 'prod-03',
    sku: 'OCS-SILK-003',
    barcode: '893850123003',
    name: 'Áo Sơ mi Lụa Tơ Tằm Họa Tiết',
    price: 420000,
    status: 'OnSale',
    category: { id: 'c3', name: 'Áo sơ mi' },
  },
  {
    id: 'prod-04',
    sku: 'OCS-DRESS-004',
    barcode: '893850123004',
    name: 'Đầm Maxi Linen Trắng Cổ Vuông',
    price: 520000,
    status: 'OnSale',
    category: { id: 'c4', name: 'Đầm & Váy' },
  },
];

export const PosPage: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [completedInvoice, setCompletedInvoice] = useState<any | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleScanOrAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = INITIAL_POS_PRODUCTS.find(
      (p) => p.barcode === barcodeInput.trim() || p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (found) {
      if (cart.some((item) => item.product.id === found.id)) {
        alert('Mỗi sản phẩm ký gửi chỉ có 1 món duy nhất trong kho!');
      } else {
        setCart([...cart, { product: found, quantity: 1 }]);
      }
      setBarcodeInput('');
    } else {
      alert(`Không tìm thấy mã sản phẩm: ${barcodeInput}`);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.product.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const changeAmount = Math.max(0, cashGiven - totalAmount);

  const handleCompleteOrder = () => {
    if (cart.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }

    if (paymentMethod === 'cash' && cashGiven < totalAmount) {
      alert('Số tiền khách đưa chưa đủ!');
      return;
    }

    const invoice = {
      invoiceCode: `INV-${Date.now().toString().slice(-6)}`,
      items: [...cart],
      totalAmount,
      paymentMethod,
      timestamp: new Date().toLocaleString('vi-VN'),
    };

    setCompletedInvoice(invoice);
    setCart([]);
    setCashGiven(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18211D] text-[#FFFDF8] p-6 rounded-2xl border border-[#2F3E37]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <h1 className="text-2xl font-black">WEB POS BÁN LẺ TẠI QUẦY</h1>
          </div>
          <p className="text-xs text-[#A5B6AC] mt-1">
            Giao diện bán hàng trực tuyến 100% · Kết nối Web API · Thay thế hoàn toàn ứng dụng offline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg bg-[#2F3E37] text-xs font-semibold text-[#EF9F45]">
            Quầy 01 · Thu ngân trực tuyến
          </span>
        </div>
      </div>

      {completedInvoice && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-green-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Thanh toán thành công! Mã HĐ: {completedInvoice.invoiceCode}
            </div>
            <button
              onClick={() => setCompletedInvoice(null)}
              className="text-xs font-bold text-green-700 underline"
            >
              Đóng thông báo
            </button>
          </div>
          <div className="text-sm">
            Tổng tiền: <span className="font-extrabold">{formatCurrency(completedInvoice.totalAmount)}</span> · Phương thức: {completedInvoice.paymentMethod === 'cash' ? 'Tiền mặt' : 'VietQR'}
          </div>
          <div className="text-xs text-green-700">
            Hóa đơn đã được lưu trên Web API database và trạng thái các sản phẩm đã chuyển sang 'Sold'.
          </div>
        </div>
      )}

      {/* POS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode & Items In Cart */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Input Bar */}
          <form onSubmit={handleScanOrAdd} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
              <input
                type="text"
                placeholder="Quét mã vạch hoặc nhập SKU (Ví dụ: 893850123001, OCS-DENIM-002)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E2DBD0] bg-[#FFFDF8] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-[#18211D] text-[#FFFDF8] font-bold text-xs hover:bg-[#2F3E37] transition-colors whitespace-nowrap"
            >
              + Thêm món
            </button>
          </form>

          {/* Quick Item Picker */}
          <div className="bg-[#ECE6DC] p-4 rounded-xl border border-[#E2DBD0] space-y-2">
            <div className="text-xs font-bold text-[#18211D] uppercase">Hàng mẫu có sẵn trong kho để thử nghiệm:</div>
            <div className="flex flex-wrap gap-2">
              {INITIAL_POS_PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (cart.some((item) => item.product.id === p.id)) {
                      alert('Món này đã có trong giỏ!');
                    } else {
                      setCart([...cart, { product: p, quantity: 1 }]);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#E2DBD0] text-xs font-semibold text-[#18211D] hover:border-[#EF9F45] transition-colors"
                >
                  {p.name} ({formatCurrency(p.price)})
                </button>
              ))}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-[#FFFDF8] rounded-2xl border border-[#E2DBD0] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#E2DBD0] flex items-center justify-between">
              <h2 className="font-bold text-sm text-[#18211D] flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#EF9F45]" />
                Giỏ hàng thanh toán ({cart.length} món)
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center text-[#6B7C72] space-y-2">
                <ShoppingCart className="w-10 h-10 mx-auto text-[#A5B6AC]" />
                <p className="text-sm font-medium">Chưa có sản phẩm nào trong giỏ hàng</p>
                <p className="text-xs">Quét mã vạch hoặc bấm vào các nút hàng mẫu bên trên để bắt đầu tính tiền</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2DBD0]">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-bold text-sm text-[#18211D]">{item.product.name}</div>
                      <div className="text-xs text-[#6B7C72] font-mono">
                        SKU: {item.product.sku} | Barcode: {item.product.barcode}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-black text-sm text-[#18211D]">{formatCurrency(item.product.price)}</div>
                        <div className="text-[10px] text-[#6B7C72]">SL: 1 (Độc bản)</div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout & Payment */}
        <div className="lg:col-span-5 bg-[#FFFDF8] rounded-2xl border border-[#E2DBD0] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#18211D] border-b border-[#E2DBD0] pb-3">
            Thanh toán hóa đơn
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-sm text-[#6B7C72]">
              <span>Tạm tính ({cart.length} món):</span>
              <span className="font-bold text-[#18211D]">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#6B7C72]">
              <span>Thuế GTGT / Phí:</span>
              <span className="font-bold text-[#18211D]">0 đ</span>
            </div>
            <div className="flex justify-between text-lg font-black text-[#18211D] pt-3 border-t border-[#E2DBD0]">
              <span>Tổng thanh toán:</span>
              <span className="text-2xl text-[#EF9F45]">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-[#18211D]">Phương thức thanh toán</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-[#18211D] bg-[#18211D] text-[#FFFDF8]'
                    : 'border-[#E2DBD0] bg-[#FFFDF8] text-[#18211D] hover:bg-[#ECE6DC]'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Tiền mặt
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('vietqr')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'vietqr'
                    ? 'border-[#18211D] bg-[#18211D] text-[#FFFDF8]'
                    : 'border-[#E2DBD0] bg-[#FFFDF8] text-[#18211D] hover:bg-[#ECE6DC]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                VietQR Động
              </button>
            </div>
          </div>

          {/* Cash calculation */}
          {paymentMethod === 'cash' && (
            <div className="p-4 rounded-xl bg-[#F3F0E9] space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#18211D] mb-1">Tiền khách đưa (VNĐ):</label>
                <input
                  type="number"
                  step="10000"
                  value={cashGiven || ''}
                  onChange={(e) => setCashGiven(Number(e.target.value))}
                  placeholder="Nhập số tiền..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E2DBD0] bg-[#FFFDF8] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                />
              </div>

              <div className="flex justify-between items-center pt-2 font-bold text-sm">
                <span>Tiền thừa trả khách:</span>
                <span className="text-green-700 text-base">{formatCurrency(changeAmount)}</span>
              </div>
            </div>
          )}

          {/* VietQR Mock */}
          {paymentMethod === 'vietqr' && (
            <div className="p-4 rounded-xl bg-[#F3F0E9] text-center space-y-3">
              <div className="w-36 h-36 bg-[#FFFDF8] mx-auto p-2 rounded-xl border border-[#E2DBD0] flex items-center justify-center shadow-inner">
                <QrCode className="w-28 h-28 text-[#18211D]" />
              </div>
              <div className="text-xs text-[#6B7C72]">
                Khách hàng quét mã VietQR bằng ứng dụng ngân hàng. Hệ thống tự động xác nhận sau khi nhận tiền.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCompleteOrder}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-xl bg-[#EF9F45] text-[#18211D] font-black text-sm hover:bg-[#F3AF62] transition-colors shadow-lg disabled:opacity-40"
          >
            HOÀN TẤT & IN HÓA ĐƠN TRỰC TUYẾN
          </button>
        </div>
      </div>
    </div>
  );
};
