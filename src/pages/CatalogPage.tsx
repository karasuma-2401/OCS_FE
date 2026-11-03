import React from 'react';
import { Card, Badge } from '@/components/shared';
import { ShoppingBag } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-accent-dark" size={24} />
          <h1 className="text-3xl font-extrabold text-ink">Danh mục sản phẩm</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Khám phá những món đồ thời trang độc đáo đã được kiểm định chất lượng và khử khuẩn kỹ càng.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <Card className="p-4">
          <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center text-muted mb-4 font-medium">
            Ảnh sản phẩm
          </div>
          <div className="flex justify-between items-start">
            <h2 className="font-bold text-ink">Áo khoác denim vintage</h2>
            <Badge variant="success">Đang bán</Badge>
          </div>
          <p className="text-sm text-muted mt-1">Size L · Tình trạng 95%</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-black text-lg text-ink">250.000 đ</span>
            <span className="text-xs text-muted">Mã: OCS-001</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center text-muted mb-4 font-medium">
            Ảnh sản phẩm
          </div>
          <div className="flex justify-between items-start">
            <h2 className="font-bold text-ink">Áo thun retro graphic</h2>
            <Badge variant="success">Đang bán</Badge>
          </div>
          <p className="text-sm text-muted mt-1">Size M · Tình trạng 90%</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-black text-lg text-ink">120.000 đ</span>
            <span className="text-xs text-muted">Mã: OCS-002</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center text-muted mb-4 font-medium">
            Ảnh sản phẩm
          </div>
          <div className="flex justify-between items-start">
            <h2 className="font-bold text-ink">Quần jean ống suông</h2>
            <Badge variant="warning">Đang kiểm tra</Badge>
          </div>
          <p className="text-sm text-muted mt-1">Size 30 · Tình trạng 98%</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-black text-lg text-ink">180.000 đ</span>
            <span className="text-xs text-muted">Mã: OCS-003</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

