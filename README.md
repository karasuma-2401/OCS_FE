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

## Kiểm tra chất lượng & Chạy Test

Bộ test Node kiểm tra trực tiếp các hàm validation và chuyển đổi lỗi ProblemDetails trong mã nguồn. Luồng trình duyệt đầy đủ vẫn cần kiểm thử end-to-end riêng:

```powershell
# Chạy bộ test tự động (Node.js test runner)
npm test

# Kiểm tra lỗi kiểu dữ liệu TypeScript
npm run lint

# Đóng gói bản Production
npm run build
```

Docker build và workflow publish yêu cầu `VITE_API_URL` trỏ tới API HTTPS công khai, gồm `/api` (ví dụ `https://api.example.com/api`); cấu hình GitHub repository variable cùng tên trước khi publish. Giá trị được nhúng lúc build, nên đổi URL cần build lại image. Cookie hiện dùng `SameSite=Lax`: frontend và API cần cùng site, hoặc dùng reverse proxy cùng origin; cấu hình CORS và HTTPS phù hợp.

## Cơ chế Xác thực & Phiên làm việc (Auth Architecture)

- **HttpOnly Cookie & CSRF:** Ứng dụng kết nối API qua proxy `/api` (cấu hình trong `vite.config.ts` trỏ về `http://localhost:5204`). Trình duyệt tự động nhận/gửi cookie `ocs_session`. Mọi mutation (`POST`, `PUT`, `DELETE`, `PATCH`) tự động đính kèm header `X-XSRF-TOKEN` từ `GET /api/auth/csrf`.
- **Trạng thái phiên chuẩn xác:** `AuthContext` quản lý 3 trạng thái `checking`, `authenticated`, `anonymous`. Khi ứng dụng mở hoặc quay lại tab (`focus` / `visibilitychange`), app tự động xác minh phiên từ endpoint `GET /api/auth/me`.
- **Đồng bộ đa tab:** Sự kiện đăng nhập / đăng xuất được đồng bộ tức thì giữa các tab trình duyệt thông qua `BroadcastChannel('ocs_auth_sync')`.
- **Bảo vệ Route:** `ProtectedRoute` kiểm tra vai trò người dùng theo `Role.Code` (`Admin`, `Manager`, `Staff`, `Customer`), ngăn chặn các nỗ lực truy cập trái phép và hỗ trợ safe return path nội bộ (chống tấn công Open Redirect).

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
