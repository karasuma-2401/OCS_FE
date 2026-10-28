import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingBag } from 'lucide-react';
import { apiClient } from '@/api/client';
import type { Product } from '@/types';

// Mock initial items when backend database is fresh
const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    sku: 'OCS-VINTAGE-001',
    barcode: '893850123001',
    name: 'Áo khoác Blazer Dạ Tweed Cổ Điển',
    description: 'Chất dạ tweed dày dặn, lót lụa cao cấp, form vintage thập niên 90.',
    price: 650000,
    expectedPrice: 650000,
    status: 'OnSale',
    category: { id: 'c1', name: 'Áo khoác & Blazer' },
    brand: { id: 'b1', name: 'Zara Vintage', tier: 'High-Street' },
  },
  {
    id: 'prod-02',
    sku: 'OCS-DENIM-002',
    barcode: '893850123002',
    name: 'Quần Jean Levi\'s 501 Original Fit',
    description: 'Denim 100% cotton washed xanh nhạt, sản xuất tại Mỹ, khuy cài nguyên bản.',
    price: 850000,
    expectedPrice: 900000,
    status: 'OnSale',
    category: { id: 'c2', name: 'Quần Denim' },
    brand: { id: 'b2', name: 'Levi\'s', tier: 'Mid-Range' },
  },
  {
    id: 'prod-03',
    sku: 'OCS-SILK-003',
    barcode: '893850123003',
    name: 'Áo Sơ mi Lụa Tơ Tằm Họa Tiết',
    description: 'Chất lụa tơ tằm dệt tay mềm mượt, họa tiết hoa lá cổ điển sang trọng.',
    price: 420000,
    expectedPrice: 450000,
    status: 'OnSale',
    category: { id: 'c3', name: 'Áo sơ mi' },
    brand: { id: 'b3', name: 'Local Heritage', tier: 'Boutique' },
  },
  {
    id: 'prod-04',
    sku: 'OCS-DRESS-004',
    barcode: '893850123004',
    name: 'Đầm Maxi Linen Trắng Cổ Vuông',
    description: 'Chất vải sợi lanh tự nhiên mát mẻ, đầm xòe nhẹ dáng midi.',
    price: 520000,
    expectedPrice: 550000,
    status: 'OnSale',
    category: { id: 'c4', name: 'Đầm & Váy' },
    brand: { id: 'b4', name: 'Massimo Dutti', tier: 'Premium' },
  },
];

export const CatalogPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/products');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setProducts(res.data.data);
        }
      } catch {
        // Fallback to sample items for demonstration
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat =
      selectedCategory === 'all' || p.category?.name === selectedCategory;
    return matchSearch && matchCat;
  });

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category?.name).filter(Boolean)))];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#18211D]">Sản phẩm Ký gửi Độc bản</h1>
          <p className="text-sm text-[#6B7C72] mt-1">
            Mỗi sản phẩm đều qua kiểm định chất lượng nghiêm ngặt và chỉ có duy nhất 1 món.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#18211D] text-[#FFFDF8]">
            {loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm có sẵn`}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2DBD0] bg-[#FFFDF8] text-sm focus:outline-none focus:ring-2 focus:ring-[#EF9F45]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0">
          <Filter className="w-4 h-4 text-[#6B7C72] shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as string)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#18211D] text-[#FFFDF8]'
                  : 'bg-[#FFFDF8] border border-[#E2DBD0] text-[#6B7C72] hover:bg-[#ECE6DC]'
              }`}
            >
              {cat === 'all' ? 'Tất cả danh mục' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-[#FFFDF8] rounded-2xl border border-[#E2DBD0] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
          >
            {/* Image Placeholder with Badge */}
            <div className="h-56 bg-[#ECE6DC] relative flex items-center justify-center overflow-hidden">
              <ShoppingBag className="w-16 h-16 text-[#A5B6AC]/40 group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#18211D] text-[#FFFDF8] uppercase">
                  {product.brand?.tier || 'Checked'}
                </span>
              </div>
              <div className="absolute bottom-3 right-3">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#FFFDF8]/90 text-[#18211D] shadow-sm">
                  {product.sku}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#EF9F45] uppercase tracking-wider">
                  {product.category?.name || 'Ký gửi'}
                </div>
                <h3 className="font-bold text-base text-[#18211D] line-clamp-1 group-hover:text-[#EF9F45] transition-colors">
                  {product.name}
                </h3>
                <p className="text-xs text-[#6B7C72] line-clamp-2 leading-relaxed">
                  {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2DBD0]/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#6B7C72] uppercase font-semibold">Giá niêm yết</div>
                  <div className="text-lg font-black text-[#18211D]">
                    {formatCurrency(product.price)}
                  </div>
                </div>

                <button
                  onClick={() => alert(`Xem chi tiết món đồ: ${product.name} (SKU: ${product.sku})`)}
                  className="px-3.5 py-2 rounded-lg bg-[#18211D] text-[#FFFDF8] text-xs font-bold hover:bg-[#EF9F45] hover:text-[#18211D] transition-colors"
                >
                  Xem món
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

