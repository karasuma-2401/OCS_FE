import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Combobox,
  EmptyState,
  ErrorState,
  Form,
  Input,
  Loading,
  Modal,
  Pagination,
  Select,
  Table,
  Toast,
} from '@/components/shared';

export const UIComponentsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [componentPage, setComponentPage] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');

  return (
    <main className="min-h-screen bg-surface-dashboard px-4 py-8 text-text-primary sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-secondary">OCS / UI Kit</p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">
              Component dùng chung
            </h1>
            <p className="mt-2 text-sm text-muted">
              Demo các trạng thái thường dùng trong những phân hệ của OCS.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Quay lại trang chủ
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
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

          <Card title="Input & Select" description="Nhãn, trợ giúp và validation lỗi">
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
              <Select label="Trạng thái" defaultValue="active">
                <option value="active">Đang bán</option>
                <option value="hidden">Đang ẩn</option>
              </Select>
              <Select label="Đang tải danh mục" loading disabled>
                <option>Đang tải...</option>
              </Select>
            </div>
          </Card>

          <Card title="Form" description="Có thể khóa cả form khi đang gửi">
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                setShowToast(true);
              }}
            >
              <Input label="Email" type="email" placeholder="ban@example.com" required />
              <Button type="submit">Gửi thử</Button>
            </Form>
          </Card>

          <Card title="Badge & Toast" description="Trạng thái phản hồi">
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
              Hiện toast
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
              onRetry={() => setShowToast(true)}
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

