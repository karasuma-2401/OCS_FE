import React from 'react';
import { Card } from '@/components/shared';
import { Calendar } from 'lucide-react';

export const ConsignPage: React.FC = () => {
  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="text-accent-dark" size={24} />
          <h1 className="text-3xl font-extrabold text-ink">Quy trình ký gửi tại OCS</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Hướng dẫn 4 bước đơn giản để ký gửi quần áo và nhận chi trả minh bạch.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-dark font-bold">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Lựa chọn & Chuẩn bị quần áo</h2>
              <p className="mt-1 text-sm text-muted">
                Quần áo còn nguyên vẹn, đã giặt sạch, không rách hỏng và không ố màu.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-dark font-bold">
              2
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Đặt lịch hẹn hoặc mang tới cửa hàng</h2>
              <p className="mt-1 text-sm text-muted">
                Đến chi nhánh OCS gần nhất hoặc tạo lịch hẹn trên website để nhân viên tiếp nhận.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-dark font-bold">
              3
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Kiểm định & Thỏa thuận giá niêm yết</h2>
              <p className="mt-1 text-sm text-muted">
                Nhân viên OCS phân loại sản phẩm, đánh giá mức độ mới và thống nhất giá bán niêm yết cùng tỷ lệ hoa hồng.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-dark font-bold">
              4
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Theo dõi bán hàng & Nhận quyết toán</h2>
              <p className="mt-1 text-sm text-muted">
                Hệ thống thông báo tức thì khi sản phẩm được bán. Tiền hoa hồng ký gửi được cộng vào ví hoặc chuyển khoản định kỳ.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
