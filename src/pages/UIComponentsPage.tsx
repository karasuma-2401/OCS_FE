import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Sparkles } from 'lucide-react';
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  Combobox,
  DatePicker,
  EmptyState,
  ErrorState,
  Form,
  Input,
  Loading,
  Modal,
  Pagination,
  SkeletonLoading,
  Table,
  Toast,
} from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryMeta,
} from '@/components/notifications/notificationMeta';

export const UIComponentsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [componentPage, setComponentPage] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [productStatus, setProductStatus] = useState('active');
  const [exampleDate, setExampleDate] = useState('');
  const toast = useToast();

  const categoryList: NotificationCategoryMeta[] = Object.values(
    NOTIFICATION_CATEGORIES,
  );

  return (
    <main className="min-h-screen bg-surface-dashboard px-4 py-8 text-text-primary sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-secondary">OCS / UI Kit & Notification Design System</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">
              Component & Hệ Thống Thông Báo Dùng Chung
            </h1>
            <p className="mt-2 text-sm text-muted">
              Chuẩn hóa Design Tokens, 4 tầng thông báo (Inline Error, Alert Banner, Floating Toast, Notification Center) và các component cơ bản của OCS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/notifications">
              <Button variant="secondary" className="flex items-center gap-2">
                <Bell size={16} />
                Mở Trung tâm thông báo
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Quay lại trang chủ
              </Button>
            </Link>
          </div>
        </div>

        {/* Notification Design System Section */}
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card
            title="Tầng 2: Alert Banner (Inline Contextual Alerts)"
            description="5 biến thể ngữ nghĩa hiển thị tĩnh trong Form, Card hoặc đầu trang"
            className="md:col-span-2"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <AlertBanner
                variant="success"
                title="Tiếp nhận ký gửi hoàn tất"
                description="Hợp đồng #CN-2026-089 đã được lưu và khởi tạo 6 mã vạch sản phẩm."
              />
              <AlertBanner
                variant="info"
                title="Đồng bộ thông báo thời gian thực"
                description="Hệ thống tự động cập nhật trạng thái lịch hẹn và thanh toán VietQR."
              />
              <AlertBanner
                variant="warning"
                title="Hợp đồng sắp đến hạn tất toán"
                description="Có 3 hợp đồng ký gửi sẽ hết kỳ hạn 30 ngày vào ngày mai."
              />
              <AlertBanner
                variant="error"
                title="Không thể kết nối máy in tem"
                description="Vui lòng kiểm tra lại kết nối máy in mã vạch hoặc tải file PDF để in."
              />
              <AlertBanner
                variant="brand"
                className="md:col-span-2"
                title="Chiến dịch Ký Gửi Mùa Lễ Hội OCS"
                description="Ưu đãi giảm 5% phí hoa hồng cho các mặt hàng Local Brand & Luxury được tiếp nhận trong tuần này."
                action={{
                  label: 'Kích hoạt thông báo nổi',
                  onClick: () =>
                    toast.brand('Đã kích hoạt thông báo chiến dịch!', {
                      description: 'Thông báo ưu đãi đã được gửi thử nghiệm lên góc màn hình.',
                    }),
                }}
              />
            </div>
          </Card>

          <Card
            title="Tầng 3: Global Floating Toast Engine (useToast)"
            description="Thông báo nổi góc trên màn hình, tự động ẩn sau 4.5s, tạm dừng khi rê chuột vào"
          >
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  toast.success('Đã lưu hợp đồng ký gửi', {
                    description: 'Mã hợp đồng #CN-2026-102 đã sẵn sàng in.',
                  })
                }
              >
                Toast Success
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  toast.info('Khách hàng vừa đặt lịch hẹn mới', {
                    description: 'Khung giờ 14:00 - 15:00 hôm nay (5 sản phẩm).',
                    action: {
                      label: 'Xem lịch',
                      onClick: () => toast.success('Đã chuyển tới chi tiết lịch hẹn!'),
                    },
                  })
                }
              >
                Toast Info + Action
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast.warning('Tồn kho sắp chạm ngưỡng tối đa', {
                    description: 'Kệ A2 (Áo khoác Denim) đã đạt 92% sức chứa.',
                  })
                }
              >
                Toast Warning
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  toast.error('Giao dịch VietQR đã hết hạn', {
                    description: 'Vui lòng tạo mã QR thanh toán mới cho hóa đơn POS.',
                  })
                }
              >
                Toast Error
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  toast.brand('Chào mừng đến với OCS Design System', {
                    description: 'Giao diện pastel đồng bộ cho cả Khách hàng & Cửa hàng.',
                  })
                }
              >
                <Sparkles size={14} className="mr-1" />
                Toast Brand
              </Button>
            </div>
          </Card>

          <Card
            title="Tầng 4: Phân Loại Nghiệp Vụ (Notification Taxonomy)"
            description="6 nhóm nghiệp vụ chuẩn hiển thị trong Chuông thông báo & Trang Lịch sử"
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {categoryList.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() =>
                    toast.show({
                      variant: cat.toastVariant,
                      title: `[${cat.label}] Thông báo mẫu`,
                      description: `Ví dụ thông báo thuộc phân nhóm nghiệp vụ ${cat.label}.`,
                    })
                  }
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-white p-2.5 text-left transition hover:border-brand-pink hover:shadow-xs"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cat.iconBgClass}`}
                  >
                    {cat.renderIcon(16)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">{cat.label}</p>
                    <p className="text-[10px] text-muted">{cat.key}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Product Rail Gallery" description="Preview tương tác toàn màn hình với dữ liệu mẫu">
            <Link to="/ui-components/product-rail-gallery" className="inline-flex rounded-control bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Xem Product Rail Gallery
            </Link>
          </Card>

          <Card title="Button" description="Biến thể, disabled và loading">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button loading>Đang lưu</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>

          <Card title="Combobox" description="Chọn bằng chuột hoặc bàn phím">
            <Combobox label="Size" value={selectedSize} onChange={setSelectedSize} placeholder="Chọn size" options={[{ value: 's', label: 'S' }, { value: 'm', label: 'M' }, { value: 'l', label: 'L' }, { value: 'xl', label: 'XL', disabled: true }]} helperText="Dùng phím mũi tên để di chuyển, Enter để chọn." />
          </Card>

          <Card title="Date picker" description="Nhập ngày hoặc chọn trên lịch">
            <DatePicker label="Ngày vào làm" value={exampleDate} onChange={setExampleDate} helperText="Định dạng ngày/tháng/năm." />
          </Card>

          <Card title="Input & Combobox" description="Nhãn, trợ giúp và validation lỗi (Tầng 1: Inline Error)">
            <div className="space-y-4">
              <Input
                label="Tên sản phẩm"
                placeholder="Ví dụ: Áo khoác denim"
                helperText="Tên sẽ hiển thị trong danh sách sản phẩm."
              />
              <Input
                label="Mã sản phẩm"
                defaultValue="OCS-001"
                error="Mã sản phẩm đã tồn tại."
              />
              <Combobox label="Trạng thái" value={productStatus} onChange={setProductStatus} options={[{ value: 'active', label: 'Đang bán' }, { value: 'hidden', label: 'Đang ẩn' }]} />
              <Combobox label="Đang tải danh mục" value="" onChange={() => {}} disabled placeholder="Đang tải..." options={[]} />
            </div>
          </Card>

          <Card title="Form" description="Có thể khóa cả form khi đang gửi">
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                setShowToast(true);
                toast.success('Gửi biểu mẫu thành công!');
              }}
            >
              <Input label="Email" type="email" placeholder="ban@example.com" required />
              <Button type="submit">Gửi thử</Button>
            </Form>
          </Card>

          <Card title="Badge & Toast Card" description="Trạng thái phản hồi">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Đã hoàn tất</Badge>
              <Badge variant="warning">Đang xử lý</Badge>
              <Badge variant="danger">Thất bại</Badge>
              <Badge variant="info">Thông tin</Badge>
              <Badge loading>Đang đồng bộ</Badge>
            </div>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => setShowToast(true)}
            >
              Hiện toast tĩnh
            </Button>
            {showToast && (
              <Toast
                className="mt-4"
                variant="success"
                title="Thành công"
                message="Thao tác đã được thực hiện."
                onClose={() => setShowToast(false)}
              />
            )}
          </Card>

          <Card title="Modal" description="Hộp thoại có thể đóng bằng Escape">
            <Button onClick={() => setShowModal(true)}>Mở modal</Button>
          </Card>

          <Card title="Loading & Empty State">
            <Loading label="Đang tải danh sách..." />
            <SkeletonLoading variant="list" count={2} label="Đang tải danh sách..." className="mt-4" />
            <EmptyState
              className="mt-4"
              title="Chưa có sản phẩm"
              description="Thêm sản phẩm đầu tiên để bắt đầu quản lý kho."
              action={<Button size="sm">Thêm sản phẩm</Button>}
            />
          </Card>

          <Card title="Error State" description="Có thể bật hành động thử lại">
            <ErrorState
              title="Không tải được dữ liệu"
              description="Vui lòng kiểm tra kết nối và thử lại."
              onRetry={() => {
                setShowToast(true);
                toast.info('Đang thử tải lại dữ liệu...');
              }}
            />
          </Card>

          <Card title="Table & Pagination" className="md:col-span-2">
            <Table
              rowKey="id"
              columns={[
                { key: "name", header: "Sản phẩm", accessor: "name" },
                { key: "category", header: "Danh mục", accessor: "category" },
                {
                  key: "status",
                  header: "Trạng thái",
                  render: (row) => (
                    <Badge variant={row.status === "Đang bán" ? "success" : "warning"}>
                      {row.status}
                    </Badge>
                  ),
                },
              ]}
              data={[
                { id: 1, name: "Áo khoác denim", category: "Áo khoác", status: "Đang bán" },
                { id: 2, name: "Túi tote canvas", category: "Phụ kiện", status: "Đang kiểm tra" },
              ]}
            />
            <Pagination
              className="mt-4"
              page={componentPage}
              totalPages={5}
              onPageChange={setComponentPage}
            />
            <p className="mt-2 text-center text-xs text-muted">
              Trang hiện tại: {componentPage}
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Modal component"
        description="Ví dụ hộp thoại xác nhận thao tác."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                setShowModal(false);
                setShowToast(true);
                toast.success('Đã xác nhận thao tác trên Modal!');
              }}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Nội dung modal có thể thay bằng form hoặc thông tin theo từng phân hệ.
        </p>
      </Modal>
    </main>
  );
};
