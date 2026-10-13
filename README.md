# OCS Frontend

Ứng dụng client cho **OCS - Old Clothes Store**, dùng chung React Native codebase cho iOS, Android, web và desktop Windows.

## Công nghệ

- Expo SDK 57, React Native 0.86 và TypeScript strict.
- Expo Router cho routing theo file trong `src/app`.
- Electron cho ứng dụng desktop Windows.
- SQLite: `expo-sqlite` trên mobile và module `node:sqlite` tích hợp trong Electron 44.
- ESLint, Expo Doctor, Docker, GitHub Actions và electron-builder.

Desktop chỉ expose các hàm nghiệp vụ được định nghĩa rõ qua preload bridge; renderer không được truy cập Node.js, Electron IPC thô hoặc câu lệnh SQL trực tiếp.

## Chạy local

Yêu cầu Node.js 24 và npm 11.

```powershell
Copy-Item .env.example .env
npm ci
```

Cập nhật `EXPO_PUBLIC_API_URL` nếu backend không chạy tại `http://localhost:5204`.

```powershell
npm start           # Expo dev server
npm run android     # Android
npm run ios         # iOS (cần macOS/Xcode hoặc dùng Expo Go)
npm run web         # Trình duyệt
npm run desktop     # Expo web + Electron desktop
```

Database desktop được tạo tại thư mục `userData` riêng của ứng dụng. Database mobile được tạo trong sandbox của app.

## Kiểm tra và build

```powershell
npm run lint
npm run typecheck
npx expo-doctor
npm run build:web
npm run build:desktop
docker build --tag ocs-frontend:local .
```

`build:desktop` tạo Windows NSIS installer trong `release/`. Bản phát hành hiện chưa ký số; cần bổ sung chứng thư code signing trước khi phân phối production.

## Cấu trúc

```text
src/
├── app/                    # Route/screen của Expo Router
├── config/                 # Cấu hình môi trường
├── infrastructure/
│   └── database/           # Adapter SQLite theo nền tảng
├── theme/                  # Design tokens
└── types/                  # Khai báo type toàn cục
electron/
├── main.cjs                # Main process, SQLite và IPC handlers
└── preload.cjs             # API tối thiểu expose cho renderer
deploy/
└── compose.prod.yaml       # Web container trên VPS
```

## CI/CD

Pipeline bám theo cấu trúc của UGTM: CI trên `dev`/`main`, publish image sau khi CI xanh, rồi deploy VPS sau khi publish thành công.

- `Frontend CI`: ESLint, TypeScript, Expo Doctor, secret scan, web export, Windows package verification và Docker build verification.
- `Publish Frontend Image`: build multi-architecture image, quét Trivy và publish lên GHCR với tag `dev`, `main`, `latest` và `sha-xxxxxxx`.
- `Deploy Frontend to VPS`: pull image từ GHCR và restart container bằng Docker Compose.
- `Release Windows Desktop`: build installer thủ công hoặc khi push tag `v*`; tag release sẽ đính kèm installer vào GitHub Release.

GitHub Actions secrets bắt buộc cho deploy:

- `VPS_HOST`, `VPS_SSH_KEY`.
- Tùy chọn: `VPS_USERNAME` (mặc định `ubuntu`) và `VPS_PORT` (mặc định `22`).

Repository variables:

- `EXPO_PUBLIC_API_URL`: URL public của backend được bake vào web image.
- `FRONTEND_PORT`: cổng web trên VPS, mặc định `3000`.

Mobile store delivery bằng EAS chưa được bật vì cần Expo organization/project ID và quyền Apple/Google của nhóm.
