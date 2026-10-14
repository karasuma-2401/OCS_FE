# OCS Frontend

Repository giao diện cho **OCS - Old Clothes Store**, gồm hai ứng dụng độc lập trong cùng một repository:

- Ứng dụng khách hàng dùng React Native/React Native Web cho Android, iOS và website.
- Ứng dụng nội bộ dùng WPF cho quản lý cửa hàng và POS trên Windows.

## Công nghệ

- Expo SDK 57, React Native 0.86, React Native Web và TypeScript strict cho ứng dụng khách hàng.
- Expo Router cho routing theo file trong `src/app`.
- WPF, C# và .NET 10 cho ứng dụng quản lý/POS trên Windows.
- ESLint, Expo Doctor, Docker và GitHub Actions.

Theo phạm vi hiện tại, Mobile/Website hoạt động trực tuyến qua Backend API. SQLite offline, Outbox và Sync Service của WPF POS chưa được hiện thực trong repository này.

## Chạy local

Yêu cầu:

- Node.js 24 và npm 11 cho Mobile/Web.
- .NET SDK 10 và Windows cho WPF.

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
```

Chạy ứng dụng WPF trên Windows:

```powershell
dotnet run --project desktop/OCS.Desktop/OCS.Desktop.csproj
```

## Kiểm tra và build

```powershell
npm run lint
npm run typecheck
npx expo-doctor
npm run build:web
docker build --tag ocs-frontend:local .
dotnet format desktop/OCS.Desktop/OCS.Desktop.csproj --verify-no-changes
dotnet build desktop/OCS.Desktop/OCS.Desktop.csproj --configuration Release
```

Workflow phát hành WPF tạo gói `win-x64` phụ thuộc .NET Desktop Runtime 10. MSIX/MSI, code signing và cơ chế cập nhật tự động sẽ được lựa chọn khi nhóm chốt phương thức phân phối production.

## Cấu trúc

```text
src/
├── app/                    # Route/screen của Expo Router
├── config/                 # Cấu hình môi trường
└── theme/                  # Design tokens
desktop/
└── OCS.Desktop/            # Ứng dụng WPF quản lý cửa hàng/POS
deploy/
└── compose.prod.yaml       # Web container trên VPS
```

## CI/CD

Pipeline bám theo cấu trúc của UGTM: CI trên `dev`/`main`, publish image sau khi CI xanh, rồi deploy VPS sau khi publish thành công.

- `Frontend CI`: ESLint, TypeScript, Expo Doctor, secret scan, web export, WPF build và Docker build verification.
- `Publish Frontend Image`: build multi-architecture image, quét Trivy và publish lên GHCR với tag `dev`, `main`, `latest` và `sha-xxxxxxx`.
- `Deploy Frontend to VPS`: pull image từ GHCR và restart container bằng Docker Compose.
- `Release Windows Desktop`: publish WPF `win-x64` thủ công hoặc khi push tag `v*`; tag release sẽ đính kèm file ZIP vào GitHub Release.

GitHub Actions secrets bắt buộc cho deploy:

- `VPS_HOST`, `VPS_SSH_KEY`.
- Tùy chọn: `VPS_USERNAME` (mặc định `ubuntu`) và `VPS_PORT` (mặc định `22`).

Repository variables:

- `EXPO_PUBLIC_API_URL`: URL public của backend được bake vào web image.
- `FRONTEND_PORT`: cổng web trên VPS, mặc định `3000`.

Mobile store delivery bằng EAS chưa được bật vì cần Expo organization/project ID và quyền Apple/Google của nhóm.
