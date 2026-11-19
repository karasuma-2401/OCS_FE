import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Check, Clock, Sparkles } from 'lucide-react';
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
  extractNotificationHighlights,
  formatNotificationRelativeTime,
  getNotificationCategoryMeta,
  groupNotificationsByTime,
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryMeta,
} from '@/components/notifications/notificationMeta';
import type { Notification } from '@/types';

const nowMs = Date.now();
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'demo-1',
    title: 'Nhắc nhở: Lịch hẹn ký gửi sắp diễn ra',
    content:
      'Quý khách có lịch hẹn ký gửi mã #APT-2026-014 lúc 14:00 - 15:00 hôm nay tại cửa hàng OCS.',
    type: 0,
    category: 'Appointment',
    sentAt: new Date(nowMs - 8 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'demo-2',
    title: 'Giải ngân tiền ký gửi thành công',
    content:
      'Khoản thanh toán 1.250.000đ cho hợp đồng #CN-2026-089 đã được chuyển khoản qua VietQR.',
    type: 0,
    category: 'Payment',
    sentAt: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: 'demo-3',
    title: 'Hoàn tất thu mua đứt sản phẩm',
    content:
      'Phiếu thu mua #BO-2026-032 đã được quản lý phê duyệt với tổng giá trị 850.000đ.',
    type: 0,
    category: 'Buyout',
    sentAt: new Date(nowMs - 26 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'demo-4',
    title: 'Ưu đãi ký gửi Local Brand & Luxury cuối tuần',
    content:
      'Giảm 5% phí hoa hồng cho hợp đồng mới từ 5 sản phẩm trở lên trong tháng này.',
    type: 2,
    category: 'Promotion',
    sentAt: new Date(nowMs - 4 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
];

export const UIComponentsPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [componentPage, setComponentPage] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [productStatus, setProductStatus] = useState('active');
  const [exampleDate, setExampleDate] = useState('');
  const [demoItems, setDemoItems] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const [demoFilter, setDemoFilter] = useState<'all' | 'unread'>('all');
  const toast = useToast();

  const categoryList: NotificationCategoryMeta[] = Object.values(
    NOTIFICATION_CATEGORIES,
  );

  const demoUnreadCount = useMemo(
    () => demoItems.filter((item) => !item.isRead).length,
    [demoItems],
  );

  const demoGroups = useMemo(() => {
    const filtered =
      demoFilter === 'unread'
        ? demoItems.filter((item) => !item.isRead)
        : demoItems;
    return groupNotificationsByTime(filtered);
  }, [demoItems, demoFilter]);

  return (
    <main className="min-h-screen bg-surface-dashboard px-4 py-8 text-text-primary sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-secondary">
              OCS / UI Kit & Notification Design System
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-ink">
              Component & Hệ Thống Thông Báo Dùng Chung
            </h1>
            <p className="mt-2 text-sm text-muted">
              Phong cách Quiet Editorial (Sonner × Aesop): tối giản, viền hairline 1px, icon nét mảnh, Stacked Toast Deck và Editorial Timeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/notifications">
              <Button
                variant="secondary"
                startIcon={<Bell size={16} aria-hidden="true" />}
              >
                Mở Trung tâm thông báo
              </Button>
            </Link>
            <Link to="/">
              <Button
                variant="outline"
                startIcon={<ArrowLeft size={16} aria-hidden="true" />}
              >
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
                live={false}
                variant="success"
                title="Tiếp nhận ký gửi hoàn tất"
                description="Hợp đồng #CN-2026-089 đã được lưu và khởi tạo 6 mã vạch sản phẩm."
              />
              <AlertBanner
                live={false}
                variant="info"
                title="Đồng bộ thông báo thời gian thực"
                description="Hệ thống tự động cập nhật trạng thái lịch hẹn và thanh toán VietQR."
              />
              <AlertBanner
                live={false}
                variant="warning"
                title="Hợp đồng sắp đến hạn tất toán"
                description="Có 3 hợp đồng ký gửi sẽ hết kỳ hạn 30 ngày vào ngày mai."
              />
              <AlertBanner
                live={false}
                variant="error"
                title="Không thể kết nối máy in tem"
                description="Vui lòng kiểm tra lại kết nối máy in mã vạch hoặc tải file PDF để in."
              />
              <AlertBanner
                live={false}
                variant="brand"
                className="md:col-span-2"
                title="Chiến dịch Ký Gửi Mùa Lễ Hội OCS"
                description="Ưu đãi giảm 5% phí hoa hồng cho các mặt hàng Local Brand & Luxury được tiếp nhận trong tuần này."
                action={{
                  label: 'Kích hoạt thông báo nổi',
                  onClick: () =>
                    toast.brand('Đã kích hoạt thông báo chiến dịch!', {
                      tag: 'Ưu đãi',
                      description:
                        'Thông báo ưu đãi đã được gửi thử nghiệm lên góc màn hình.',
                    }),
                }}
              />
            </div>
          </Card>

          <Card
            title="Tầng 3: Floating Toast & Stacked Deck (Sonner Style)"
            description="Nền trắng sạch, viền hairline 1px, icon nét mảnh; tự động xếp lớp khi có 2+ thông báo, rê chuột để mở rộng"
          >
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  toast.success('Đã lưu hợp đồng ký gửi', {
                    tag: 'Ký gửi',
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
                    tag: 'Lịch hẹn',
                    description: 'Khung giờ 14:00 - 15:00 hôm nay (5 sản phẩm).',
                    action: {
                      label: 'Xem lịch',
                      onClick: () =>
                        toast.success('Đã chuyển tới chi tiết lịch hẹn!'),
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
                    tag: 'Kho hàng',
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
                    tag: 'Thanh toán',
                    description:
                      'Vui lòng tạo mã QR thanh toán mới cho hóa đơn POS.',
                  })
                }
              >
                Toast Error
              </Button>
              <Button
                size="sm"
                variant="ghost"
                startIcon={<Sparkles size={14} aria-hidden="true" />}
                onClick={() =>
                  toast.brand('Chào mừng đến với OCS Boutique', {
                    tag: 'OCS Boutique',
                    description:
                      'Giao diện giấy kem thanh lịch, đồng bộ cho Khách hàng & Cửa hàng.',
                  })
                }
              >
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
                      tag: cat.label,
                      title: `[${cat.label}] Thông báo mẫu`,
                      description: `Ví dụ thông báo thuộc phân nhóm nghiệp vụ ${cat.label}.`,
                    })
                  }
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-paper p-2.5 text-left transition hover:border-brand-pink hover:shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cat.iconBgClass}`}
                  >
                    {cat.renderIcon(16)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">{cat.label}</p>
                    <p className="text-xs text-muted">{cat.key}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Live Editorial Timeline & Highlight Chips Preview */}
          <Card
            title="Tầng 4B: Editorial Timeline & Highlight Chips (Preview trực tiếp)"
            description="Gom nhóm Hôm nay / Hôm qua / Trước đó kèm trích xuất tự động mã phiếu & số tiền dạng Mono Pill"
            className="md:col-span-2"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={demoFilter === 'all'}
                  onClick={() => setDemoFilter('all')}
                  className={`min-h-8 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    demoFilter === 'all'
                      ? 'bg-ink text-paper'
                      : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                  }`}
                >
                  Tất cả ({demoItems.length})
                </button>
                <button
                  type="button"
                  aria-pressed={demoFilter === 'unread'}
                  onClick={() => setDemoFilter('unread')}
                  className={`min-h-8 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                    demoFilter === 'unread'
                      ? 'bg-brand-highlight text-white'
                      : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                  }`}
                >
                  Chưa đọc ({demoUnreadCount})
                </button>
              </div>
              {demoUnreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setDemoItems((prev) =>
                      prev.map((i) => ({ ...i, isRead: true })),
                    );
                    toast.success('Đã đánh dấu đọc tất cả thông báo mẫu.');
                  }}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-highlight transition hover:bg-brand-pink-surface"
                >
                  <Check size={13} aria-hidden="true" /> Đọc tất cả
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDemoItems(DEMO_NOTIFICATIONS)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition hover:bg-surface"
                >
                  Đặt lại mẫu
                </button>
              )}
            </div>

            <div className="space-y-4">
              {demoGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-border/70" aria-hidden="true" />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.items.map((item) => {
                      const meta = getNotificationCategoryMeta(item);
                      const chips = extractNotificationHighlights(
                        `${item.title} ${item.content}`,
                      );
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDemoItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, isRead: true } : x,
                              ),
                            );
                            toast.show({
                              variant: meta.toastVariant,
                              tag: meta.label,
                              title: item.title,
                              description: item.content,
                            });
                          }}
                          className={`flex items-start gap-3 rounded-xl border border-border/70 p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight ${
                            item.isRead
                              ? 'bg-paper hover:bg-surface/60'
                              : 'bg-brand-pink-surface/75 hover:bg-brand-pink-light/60'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBgClass}`}
                          >
                            {meta.renderIcon(17)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5">
                                <Badge variant={meta.badgeVariant}>
                                  {meta.label}
                                </Badge>
                                {!item.isRead && (
                                  <span
                                    className="h-2 w-2 rounded-full bg-brand-highlight"
                                    title="Chưa đọc"
                                  />
                                )}
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                                <Clock size={11} aria-hidden="true" />
                                {formatNotificationRelativeTime(item.sentAt)}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs font-bold text-ink">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
                              {item.content}
                            </p>
                            {chips.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {chips.map((chip) => (
                                  <span
                                    key={chip}
                                    className="inline-flex items-center rounded-md border border-border bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink"
                                  >
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
              <Badge variant="brand">Ưu đãi</Badge>
              <Badge variant="payment">Thanh toán</Badge>
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
                tag="Hoàn tất"
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
