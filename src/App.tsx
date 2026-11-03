import { useState } from "react";
import { ArrowRight, ShoppingBag, Store, UserRound } from "lucide-react";
import CusNavBar, {
  type MenuId,
  type MenuItem,
} from "./components/layout/customer/CusNavBar";
import ShopNavBar, {
  type ShopNavId,
  type ShopNavItem,
} from "./components/layout/Store/ShopNavBar";
import {
  Badge,
  Button,
  Card,
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
} from "./components/shared";

type UserType = "customer" | "shop";

const customerPageTitles: Record<MenuId, string> = {
  home: "Trang chủ",
  explore: "Khám phá",
  consign: "Cách ký gửi",
  login: "Đăng nhập",
};

const shopPageTitles: Record<ShopNavId, string> = {
  pos: "POS Bán Hàng",
  inventory: "Quản Lý Kho",
  consignment: "Tiếp Nhận Ký Gửi",
  customers: "Khách Hàng",
  settlement: "Quyết Toán",
  reports: "Báo Cáo",
  settings: "Cấu Hình",
};

export default function App() {
  const [userType, setUserType] = useState<UserType | null>(null);
  const [customerPage, setCustomerPage] = useState<MenuId>("home");
  const [shopPage, setShopPage] = useState<ShopNavId>("pos");
  const [showComponents, setShowComponents] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [componentPage, setComponentPage] = useState(1);

  const handleCustomerNavigate = (item: MenuItem): void => {
    setCustomerPage(item.id);
  };

  const handleShopNavigate = (item: ShopNavItem): void => {
    setShopPage(item.id);
  };

  if (showComponents) {
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
            <Button variant="outline" onClick={() => setShowComponents(false)}>
              Quay lại trang chủ
            </Button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
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
  }

  if (!userType) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
        <section className="w-full max-w-3xl rounded-3xl border border-border bg-paper p-6 shadow-xl sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-lg font-black text-accent shadow-md">
            OCS
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Old Clothes Store
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">
              Chào mừng đến với OCS
            </h1>
            <p className="mt-3 text-sm text-muted">
              Vui lòng chọn vai trò của bạn để tiếp tục.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setUserType("customer")}
              className="group rounded-2xl border border-border bg-white p-6 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight">
                <UserRound size={23} aria-hidden="true" />
              </span>
              <span className="mt-5 flex items-center justify-between gap-3">
                <span>
                  <span className="block text-lg font-bold text-ink">
                    Khách hàng
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Khám phá và ký gửi quần áo
                  </span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-accent-dark"
                  aria-hidden="true"
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setUserType("shop")}
              className="group rounded-2xl border border-border bg-white p-6 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-state-warning-soft text-accent-dark">
                <Store size={23} aria-hidden="true" />
              </span>
              <span className="mt-5 flex items-center justify-between gap-3">
                <span>
                  <span className="block text-lg font-bold text-ink">
                    Cửa hàng
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Quản lý bán hàng và ký gửi
                  </span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-accent-dark"
                  aria-hidden="true"
                />
              </span>
            </button>
          </div>
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setShowComponents(true)}>
              Xem thử UI Components
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (userType === "customer") {
    return (
      <div className="min-h-screen bg-surface">
        <CusNavBar
          activeItem={customerPage}
          onNavigate={handleCustomerNavigate}
          onBooking={() => setCustomerPage("consign")}
        />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">OCS / Khách hàng</p>
              <h1 className="mt-2 text-3xl font-extrabold text-ink">
                {customerPageTitles[customerPage]}
              </h1>
              <p className="mt-2 text-sm text-muted">
                Chào mừng bạn đến với nền tảng quần áo đã qua sử dụng OCS.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUserType(null)}
              className="rounded-xl border border-border bg-paper px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent"
            >
              Đổi vai trò
            </button>
          </div>
          <div className="mt-8 rounded-2xl border border-border bg-paper p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-accent-dark" size={22} aria-hidden="true" />
              <h2 className="font-bold text-ink">Mua sắm và ký gửi dễ dàng</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Khám phá các sản phẩm độc đáo hoặc tìm hiểu cách ký gửi quần áo
              cùng OCS.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dashboard px-3 pt-[11px]">
      <ShopNavBar activeItem={shopPage} onNavigate={handleShopNavigate} />
      <main className="p-6 text-text-primary">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-text-secondary">OCS / Cửa hàng</p>
            <h1 className="mt-2 text-heading-xl font-bold">
              {shopPageTitles[shopPage]}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Đang xem: {shopPage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUserType(null)}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent"
          >
            Đổi vai trò
          </button>
        </div>
      </main>
    </div>
  );
}
