import { useState } from "react";
import {
  ArrowRight,
  Store,
  UserRound,
  CalendarDays,
  History,
  ShoppingBag,
  Compass,
  LogIn,
  Layers,
} from "lucide-react";
import CusNavBar, {
  type MenuId,
  type MenuItem,
} from "./components/layout/customer/CusNavBar";
import ShopNavBar, {
  type ShopNavId,
  type ShopNavItem,
} from "./components/layout/Store/ShopNavBar";
import { ShopBackground } from "./components/layout/Store/ShopBackground";
import { Badge, Button, Card, Input, Modal, Select, Toast } from "./components/shared";
import { NotificationBell } from "./components/shared/NotificationBell";
import { ConsignBooking } from "./components/customer/ConsignBooking";
import { MyBookings } from "./components/customer/MyBookings";
import { AppointmentManagement } from "./components/shop/AppointmentManagement";
import { useAuth } from "./context/AuthContext";

type UserType = "customer" | "shop";

const customerPageTitles: Record<MenuId, string> = {
  home: "Trang chủ",
  explore: "Khám phá",
  consign: "Cách ký gửi",
  booking: "Đặt lịch ký gửi",
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
  const { user, loginDemo, logout } = useAuth();

  const [userType, setUserType] = useState<UserType | null>(null);
  const [customerPage, setCustomerPage] = useState<MenuId>("home");
  const [consignSubTab, setConsignSubTab] = useState<"book" | "history">("book");
  const [shopPage, setShopPage] = useState<ShopNavId>("consignment");

  const [showComponents, setShowComponents] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSelectRole = (type: UserType) => {
    setUserType(type);
    if (type === "customer") {
      loginDemo("Customer");
      setCustomerPage("booking");
      setConsignSubTab("book");
    } else {
      loginDemo("Staff");
      setShopPage("consignment");
    }
  };

  const handleCustomerNavigate = (item: MenuItem): void => {
    setCustomerPage(item.id);
  };

  const handleShopNavigate = (item: ShopNavItem): void => {
    setShopPage(item.id);
  };

  // UI Kit Preview Mode
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
              </div>
            </Card>

            <Card title="Badge & Toast" description="Trạng thái phản hồi">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">Đã hoàn tất</Badge>
                <Badge variant="warning">Đang xử lý</Badge>
                <Badge variant="danger">Thất bại</Badge>
                <Badge variant="info">Thông tin</Badge>
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

            <Card title="Modal">
              <Button onClick={() => setShowModal(true)}>Mở modal</Button>
            </Card>
          </div>
        </div>

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Modal component"
          description="Ví dụ hộp thoại xác nhận thao tác."
        >
          <p className="text-sm text-muted">
            Nội dung modal dùng chung cho các phân hệ OCS.
          </p>
        </Modal>
      </main>
    );
  }

  // Welcome Screen: Select Role
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
              Vui lòng chọn vai trò để trải nghiệm luồng đặt lịch ký gửi & tiếp nhận.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSelectRole("customer")}
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
                    Đặt lịch hẹn ký gửi quần áo & Xem lịch sử (Task 2)
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
              onClick={() => handleSelectRole("shop")}
              className="group rounded-2xl border border-border bg-white p-6 text-left transition hover:-translate-y-1 hover:border-accent hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-state-warning-soft text-accent-dark">
                <Store size={23} aria-hidden="true" />
              </span>
              <span className="mt-5 flex items-center justify-between gap-3">
                <span>
                  <span className="block text-lg font-bold text-ink">
                    Cửa hàng / Nhân viên
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    Quản lý lịch hẹn, điểm danh & Tiếp nhận đồ (Task 3)
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

  // Customer View
  if (userType === "customer") {
    return (
      <div className="min-h-screen bg-surface">
        <CusNavBar
          activeItem={customerPage}
          onNavigate={handleCustomerNavigate}
          onBooking={() => {
            setCustomerPage("booking");
            setConsignSubTab("book");
          }}
        />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Top Bar with Role Switcher & Notification Bell */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                OCS / Khách hàng
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-ink">
                {customerPageTitles[customerPage]}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                onClick={() => {
                  logout();
                  setUserType(null);
                }}
                className="rounded-xl border border-border bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-accent shadow-sm"
              >
                Đổi vai trò
              </button>
            </div>
          </div>

          {/* Booking Page (Figma 529-10373 & Task 2) */}
          {customerPage === "booking" ? (
            <div className="space-y-6">
              {/* Segmented Sub Tabs: Book vs History */}
              <div className="inline-flex rounded-2xl border border-border bg-paper p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setConsignSubTab("book")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${consignSubTab === "book"
                      ? "bg-[#E53E8A] text-white shadow"
                      : "text-muted hover:text-ink"
                    }`}
                >
                  <CalendarDays size={15} /> Đặt lịch hẹn mới
                </button>
                <button
                  type="button"
                  onClick={() => setConsignSubTab("history")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${consignSubTab === "history"
                      ? "bg-[#E53E8A] text-white shadow"
                      : "text-muted hover:text-ink"
                    }`}
                >
                  <History size={15} /> Lịch hẹn của tôi
                </button>
              </div>

              {consignSubTab === "book" ? (
                <ConsignBooking
                  onBookingSuccess={() => setConsignSubTab("history")}
                  onViewHistory={() => setConsignSubTab("history")}
                />
              ) : (
                <MyBookings onNewBookingClick={() => setConsignSubTab("book")} />
              )}
            </div>
          ) : customerPage === "consign" ? (
            // Dedicated "Cách ký gửi" Guide Page (No booking form directly here!)
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-paper p-8 shadow-sm space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink-light px-3 py-1 text-xs font-bold text-brand-highlight">
                    Hướng dẫn ký gửi
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-ink">
                    Quy trình 4 bước ký gửi đồ tại OCS
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    Dễ dàng thanh lý tủ đồ thời trang của bạn với quy trình tiếp nhận, kiểm định minh bạch và nhận thanh toán nhanh chóng.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight font-black text-sm">
                      1
                    </span>
                    <h3 className="font-bold text-ink text-sm">Chuẩn bị sản phẩm</h3>
                    <p className="text-xs text-muted">
                      Chọn các món đồ còn tốt (&gt;80%), giặt ủi sạch sẽ, đầy đủ cúc và khóa kéo nguyên vẹn.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight font-black text-sm">
                      2
                    </span>
                    <h3 className="font-bold text-ink text-sm">Đặt lịch hẹn trước</h3>
                    <p className="text-xs text-muted">
                      Chọn ngày và khung giờ thuận tiện trực tuyến để được chuyên viên tiếp đón không phải chờ đợi.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight font-black text-sm">
                      3
                    </span>
                    <h3 className="font-bold text-ink text-sm">Kiểm định & Tạo hợp đồng</h3>
                    <p className="text-xs text-muted">
                      Mang đồ đến quầy theo lịch hẹn, chuyên viên thẩm định, đối chiếu và lập biên bản tiếp nhận.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-surface p-5 space-y-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-pink-light text-brand-highlight font-black text-sm">
                      4
                    </span>
                    <h3 className="font-bold text-ink text-sm">Nhận tiền khi bán</h3>
                    <p className="text-xs text-muted">
                      Theo dõi trạng thái bán đồ qua hệ thống và nhận tiền mặt hoặc chuyển khoản định kỳ.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-blue-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-ink text-base">
                      Bạn đã sẵn sàng mang đồ đến cửa hàng?
                    </h4>
                    <p className="text-xs text-muted mt-1">
                      Đặt lịch hẹn ngay để giữ chỗ tiếp nhận tại studio OCS.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setCustomerPage("booking");
                      setConsignSubTab("book");
                    }}
                    startIcon={<CalendarDays size={16} />}
                  >
                    Đặt lịch ký gửi ngay
                  </Button>
                </div>
              </div>
            </div>
          ) : customerPage === "home" ? (
            // Home Page
            <div className="space-y-8">
              <div className="rounded-3xl border border-border bg-paper p-8 shadow-sm">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink-light px-3 py-1 text-xs font-bold text-brand-highlight">
                    <ShoppingBag size={14} /> Chợ Ký Gửi Thời Trang OCS
                  </span>
                  <h2 className="mt-3 text-3xl font-extrabold text-ink">
                    Mua sắm thông minh, Ký gửi dễ dàng
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    Khám phá hàng ngàn món đồ thời trang tuyển chọn đã được kiểm định chất lượng, hoặc đăng ký lịch hẹn ký gửi để làm mới tủ đồ của bạn ngay hôm nay.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      onClick={() => {
                        setCustomerPage("booking");
                        setConsignSubTab("book");
                      }}
                      startIcon={<CalendarDays size={16} />}
                    >
                      Đặt lịch ký gửi ngay
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCustomerPage("explore")}
                    >
                      Khám phá sản phẩm
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : customerPage === "explore" ? (
            // Explore Page
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-paper p-8 text-center shadow-sm max-w-xl mx-auto space-y-3">
                <Compass size={40} className="mx-auto text-accent-dark" />
                <h2 className="text-xl font-bold text-ink">Khám phá sản phẩm OCS</h2>
                <p className="text-xs text-muted">
                  Bộ sưu tập các mặt hàng ký gửi đang mở bán tại cửa hàng OCS.
                </p>
                <Button
                  onClick={() => {
                    setCustomerPage("booking");
                    setConsignSubTab("book");
                  }}
                >
                  Ký gửi đồ của bạn
                </Button>
              </div>
            </div>
          ) : (
            // Login Page
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-paper p-8 text-center shadow-sm max-w-md mx-auto space-y-4">
                <LogIn size={40} className="mx-auto text-accent-dark" />
                <h2 className="text-xl font-bold text-ink">Tài khoản khách hàng</h2>
                <p className="text-xs text-muted">
                  Đang đăng nhập với: <strong>{user?.fullName || "Khách Hàng Ký Gửi"}</strong> ({user?.phoneNumber || "0901234567"}).
                </p>
                <Button
                  onClick={() => {
                    setCustomerPage("booking");
                    setConsignSubTab("history");
                  }}
                  className="w-full"
                >
                  Xem lịch hẹn đã đặt
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Shop / Staff View (Figma 39-1195 & Task 3 with ShopBackground)
  return (
    <ShopBackground className="px-3 pt-[11px] pb-12">
      <ShopNavBar
        activeItem={shopPage}
        onNavigate={handleShopNavigate}
        profileName="Nguyễn Văn A"
      />
      <main className="w-full px-2 sm:px-4 lg:px-6 pt-3 pb-8 text-text-primary">
        {/* Consignment Tab: Exact Figma 39-1195 Appointment Management */}
        {shopPage === "consignment" ? (
          <AppointmentManagement
            onSwitchRole={() => {
              logout();
              setUserType(null);
            }}
          />
        ) : (
          <div className="rounded-3xl border border-white/60 bg-white/95 backdrop-blur-sm p-10 text-center shadow-sm max-w-xl mx-auto space-y-4">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-surface text-accent-dark">
              <Layers size={28} />
            </div>
            <h2 className="text-xl font-bold text-ink">
              Phân hệ: {shopPageTitles[shopPage]}
            </h2>
            <p className="text-xs text-muted">
              Để trải nghiệm luồng Quản lý lịch hẹn, Xác nhận khách đến, Vắng mặt và Nút Bắt đầu tiếp nhận (Task 3), vui lòng mở phân hệ **Tiếp Nhận Ký Gửi**.
            </p>
            <Button
              onClick={() => setShopPage("consignment")}
              className="mx-auto"
            >
              Mở Tiếp Nhận Ký Gửi (Task 3)
            </Button>
          </div>
        )}
      </main>
    </ShopBackground>
  );
}
