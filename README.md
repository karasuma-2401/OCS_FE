# OCS Frontend

Ứng dụng Website duy nhất cho **OCS - Old Clothes Store**, phục vụ cả khách hàng ký gửi và nhân viên nội bộ (quản lý, kho, thẩm định, thu ngân Web POS).

## Công nghệ

- **React 19**
- **Vite 6** (TypeScript)
- **Tailwind CSS v4** (với design tokens thương hiệu OCS)
- **React Router DOM 7**
- **Lucide React** (Bộ biểu tượng hiện đại)
- **Axios** (Kết nối Web API)

## Phân hệ chức năng

1. **Khách hàng & Người ký gửi:**
   - Trang chủ (`/`): Giới thiệu OCS và quy trình ký gửi thời trang tuần hoàn.
   - Danh mục sản phẩm (`/catalog`): Xem sản phẩm độc bản, tìm kiếm và lọc theo danh mục.
   - Đặt lịch ký gửi (`/appointments`): Đặt lịch hẹn tiếp nhận trực tuyến theo khung giờ.
   - Hợp đồng của tôi (`/contracts`): Tra cứu hợp đồng ký gửi, theo dõi doanh thu và tiền ví giải ngân.
2. **Nội bộ Cửa hàng (Staff / Manager / Admin):**
   - Web POS bán hàng tại quầy (`/admin/pos`): Quét mã Barcode độc bản, tính tiền mặt hoặc quét mã VietQR động trực tuyến 100%.
   - Quản lý kho & kiểm định (`/admin/products`): Tiếp nhận món mới, cấp mã Barcode, phân hạng thương hiệu và đổi trạng thái.
   - Tổng quan cửa hàng (`/admin`): Báo cáo doanh số, số món đang bán, lịch hẹn hôm nay.

## Chạy trên môi trường phát triển (Local)

Yêu cầu: Node.js 20+ và npm 10+.

```powershell
# Cài đặt thư viện
npm install

# Khởi chạy Vite Dev Server
npm run dev
```

Truy cập: `http://localhost:3000`.

## Build đóng gói

```powershell
npm run build
```
