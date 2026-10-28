import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import type { Product } from '@/types';

const INITIAL_INVENTORY: Product[] = [
  {
    id: 'prod-01',
    sku: 'OCS-VINTAGE-001',
    barcode: '893850123001',
    name: 'Áo khoác Blazer Dạ Tweed Cổ Điển',
    price: 650000,
    status: 'OnSale',
    category: { id: 'c1', name: 'Áo khoác' },
    brand: { id: 'b1', name: 'Zara Vintage', tier: 'High-Street' },
  },
  {
    id: 'prod-02',
    sku: 'OCS-DENIM-002',
    barcode: '893850123002',
    name: 'Quần Jean Levi\'s 501 Original Fit',
    price: 850000,
    status: 'OnSale',
    category: { id: 'c2', name: 'Quần Denim' },
    brand: { id: 'b2', name: 'Levi\'s', tier: 'Mid-Range' },
  },
  {
    id: 'prod-03',
    sku: 'OCS-SILK-003',
    barcode: '893850123003',
    name: 'Áo Sơ mi Lụa Tơ Tằm Họa Tiết',
    price: 420000,
    status: 'Sold',
    category: { id: 'c3', name: 'Áo sơ mi' },
    brand: { id: 'b3', name: 'Local Heritage', tier: 'Boutique' },
  },
  {
    id: 'prod-04',
    sku: 'OCS-DRESS-004',
    barcode: '893850123004',
    name: 'Đầm Maxi Linen Trắng Cổ Vuông',
    price: 520000,
    status: 'Approved',
    category: { id: 'c4', name: 'Đầm & Váy' },
    brand: { id: 'b4', name: 'Massimo Dutti', tier: 'Premium' },
  },
];

export const ProductManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(INITIAL_INVENTORY);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    categoryName: 'Áo sơ mi',
    brandName: '',
    price: 300000,
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const count = products.length + 1;
    const item: Product = {
      id: `prod-${Date.now()}`,
      sku: `OCS-ITEM-00${count}`,
      barcode: `89385012300${count}`,
      name: newProduct.name,
      price: Number(newProduct.price),
      status: 'OnSale',
      category: { id: `c-${Date.now()}`, name: newProduct.categoryName },
      brand: { id: `b-${Date.now()}`, name: newProduct.brandName || 'Vintage', tier: 'Mid-Range' },
    };
    setProducts([item, ...products]);
    setShowAddModal(false);
    setNewProduct({ name: '', categoryName: 'Áo sơ mi', brandName: '', price: 300000 });
  };

  const filtered = products.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    return matchStatus && matchSearch;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#18211D]">Quản Lý Kho & Kiểm Định Sản Phẩm</h1>
          <p className="text-sm text-[#6B7C72] mt-1">
            Theo dõi trạng thái từng món đồ ký gửi, mã barcode độc bản và lịch sử bán hàng.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18211D] text-[#FFFDF8] font-bold text-xs hover:bg-[#2F3E37] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#EF9F45]" />
          Tiếp nhận món mới
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
          <input
            type="text"
            placeholder="Tìm theo tên, SKU hoặc Barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2DBD0] bg-[#FFFDF8] text-xs focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'Approved', 'OnSale', 'Sold', 'Returned'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-[#18211D] text-[#FFFDF8]'
                  : 'bg-[#FFFDF8] border border-[#E2DBD0] text-[#6B7C72] hover:bg-[#ECE6DC]'
              }`}
            >
              {st === 'all'
                ? 'Tất cả'
                : st === 'OnSale'
                ? 'Đang bán'
                : st === 'Sold'
                ? 'Đã bán'
                : st === 'Approved'
                ? 'Đã duyệt'
                : 'Đã hoàn trả'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FFFDF8] rounded-2xl border border-[#E2DBD0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#ECE6DC] text-[#18211D] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2DBD0]">
              <tr>
                <th className="py-3 px-4">Mã SKU / Barcode</th>
                <th className="py-3 px-4">Tên sản phẩm</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Thương hiệu</th>
                <th className="py-3 px-4">Giá niêm yết</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DBD0]">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F3F0E9]/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#18211D]">
                    <div>{item.sku}</div>
                    <div className="text-[10px] text-[#6B7C72]">{item.barcode}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#18211D]">{item.name}</td>
                  <td className="py-3 px-4 text-[#6B7C72]">{item.category?.name}</td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-[#18211D]">{item.brand?.name}</span>
                    <span className="text-[10px] text-[#EF9F45] block font-bold">{item.brand?.tier}</span>
                  </td>
                  <td className="py-3 px-4 font-black text-[#18211D]">{formatCurrency(item.price)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'OnSale'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'Sold'
                          ? 'bg-blue-100 text-blue-800'
                          : item.status === 'Approved'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status === 'OnSale'
                        ? '🟢 OnSale'
                        : item.status === 'Sold'
                        ? '🔵 Sold'
                        : item.status === 'Approved'
                        ? '🟡 Approved'
                        : 'Returned'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF8] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E2DBD0] shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-[#18211D]">Tiếp nhận món đồ ký gửi mới</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#18211D] mb-1">Tên món đồ</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Ví dụ: Áo len cổ lọ dệt kim..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#18211D] mb-1">Danh mục</label>
                <select
                  value={newProduct.categoryName}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                >
                  <option value="Áo khoác & Blazer">Áo khoác & Blazer</option>
                  <option value="Áo sơ mi">Áo sơ mi</option>
                  <option value="Quần Denim">Quần Denim</option>
                  <option value="Đầm & Váy">Đầm & Váy</option>
                  <option value="Phụ kiện">Phụ kiện</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#18211D] mb-1">Thương hiệu</label>
                <input
                  type="text"
                  value={newProduct.brandName}
                  onChange={(e) => setNewProduct({ ...newProduct, brandName: e.target.value })}
                  placeholder="Zara, Uniqlo, Mango..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#18211D] mb-1">Giá bán niêm yết (VNĐ)</label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7C72] hover:bg-[#ECE6DC]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#EF9F45] text-[#18211D] font-bold text-xs hover:bg-[#F3AF62]"
                >
                  Lưu & Cấp mã Barcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
