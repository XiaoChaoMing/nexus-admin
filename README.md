# NexusLive Admin

Trang quản trị của NexusLive (WP6b, GĐ1) — React + TypeScript + Vite, **tách riêng** khỏi web người dùng `nexuslive-web`.
GĐ1 có một màn hình: duyệt / từ chối **đơn đăng ký Creator**. GĐ5 thêm Báo cáo, Người dùng, Kênh, Stream, Nhật ký (đã có chỗ trên sidebar, đang tắt).

Hợp đồng: TSD `nexuslive-be/docs/plans/technical/2026-10-13-gd01-identity-web-shell.md` (§3 S4/S6, §4.1, §6);
Working Plan cùng tên §WP6b; spec NXL-D §3.4, §7.2, BR-D12/D13/D24, §13.1; NXL-00 §5 (mã lỗi), §7 (phiên).

## Vì sao là một app riêng (ADR-013)

- Người dùng và mục đích khác hẳn web chính: bảng dữ liệu, thao tác duyệt; không cần player, Shell, SEO.
- Bundle của web người dùng không chứa code quản trị (và ngược lại: không có hls.js ở đây).
- Deploy và giới hạn truy cập riêng: host riêng (`admin.<domain>`), sau này thêm IP allowlist ở Nginx.
- GĐ5 thêm chức năng kiểm duyệt mà không làm phình `nexuslive-web`.

UI chỉ là lớp phụ: identity-svc vẫn kiểm `role = ADMIN` trên mọi `/v1/admin/**` (`403 FORBIDDEN`).

## Yêu cầu

- Node.js ≥ 22.12 (Vite 8), pnpm 10.
- Backend chạy cả stack qua Nginx edge: `make nxl-up-all` trong `nexuslive-be` (identity, Nginx `:8080`, Mailpit `:8025`).

## Lệnh

| Lệnh | Việc |
| --- | --- |
| `pnpm install` | Cài dependency (cùng phiên bản với `nexuslive-web`) |
| `pnpm dev` | Dev server tại http://localhost:5174 (cổng cố định; web người dùng ở 5173) |
| `pnpm build` | Kiểm tra type rồi build ra `dist/` |
| `pnpm typecheck` | Chỉ kiểm tra type |
| `pnpm lint` | oxlint |
| `pnpm test` | Unit test (Vitest): ánh xạ lỗi API, tuổi/ngày sinh, lý do từ chối, phiên + chặn quyền Admin, khóa i18n |
| `pnpm e2e` | E2E (Playwright) trên stack thật — xem mục E2E |
| `pnpm preview` | Chạy thử bản build (http://localhost:4174) |

## Cấu hình

Sao chép `.env.example` thành `.env.local` nếu cần đổi.

| Biến | Mặc định | Việc |
| --- | --- | --- |
| `VITE_DEV_GATEWAY_URL` | `http://localhost:8080` | Nginx edge; Vite proxy chuyển mọi `/v1` tới đây (cùng origin, không cần CORS khi dev) |

Khi deploy: build tĩnh `dist/`, phục vụ trên **host riêng** (ví dụ `admin.<domain>`) và để Nginx chuyển `/v1` tới identity như web chính
(`NXL_ADMIN_ORIGIN` trong cấu hình edge chỉ cần khi admin gọi cổng vào khác origin).

## Tài khoản Admin

- Dev: identity tạo sẵn `admin@nexuslive.dev` (ADMIN, đã xác minh) khi `NXL_ENV=dev` và `IDENTITY_DEV_SEED=true`,
  mật khẩu `IDENTITY_DEV_SEED_PASSWORD` (mặc định `nexuslive123`).
- Nâng quyền tài khoản có sẵn: `identity promote-admin <email>` (vai trò mới có hiệu lực ở lần refresh kế tiếp).

## Phiên đăng nhập

- `/login` gọi `POST /v1/auth/login` (email hoặc username), rồi `GET /v1/me`; `roles` không có `ADMIN` → màn
  "Tài khoản không có quyền quản trị" + nút đăng xuất.
- Access token chỉ nằm trong bộ nhớ (Zustand, `features/session/session-store.ts`), không ghi storage.
- Refresh token là cookie `nxl_rt` (HttpOnly, SameSite=Strict, `Path=/v1/auth`). Khi mở app: `POST /v1/auth/refresh` → `GET /v1/me`.
- `POST /v1/auth/refresh` và `POST /v1/auth/logout` **luôn gửi `X-NXL-Client: admin`** (chống CSRF, TSD S6; thiếu → `403`).
- `401` → refresh **một lần** (các request đồng thời dùng chung) → gửi lại; refresh lỗi → về `/login`.
- `429` hiện số giây chờ (`details.retryAfterSec` / `Retry-After`); `403 ACCOUNT_LOCKED` hiện thời điểm mở khóa (`details.lockedUntil`);
  `503` / mất mạng → thông báo thử lại; lỗi khi khôi phục phiên → màn "Không khôi phục được phiên" có nút Thử lại.
- **Lưu ý khi dev trên `localhost`:** cookie không phân biệt cổng, nên `nxl_rt` của web người dùng (5173) và admin (5174) là **một**;
  đăng nhập / đăng xuất ở bên này ảnh hưởng bên kia. Khi deploy trên host riêng thì tách biệt.

## Màn hình

| Đường dẫn | Nội dung |
| --- | --- |
| `/login` | Đăng nhập (chỉ khi chưa đăng nhập) |
| `/creator-applications?status=` | Bảng đơn: tab `PENDING` (mặc định), `APPROVED`, `REJECTED`, `CANCELLED`, `ALL`; cũ nhất trước; "Tải thêm" theo cursor |
| `/creator-applications/:id` | Như trên + panel chi tiết (đường dẫn chia sẻ được). Duyệt / Từ chối (lý do 10–500 ký tự) đều có hộp xác nhận |
| `*` | 404 |

- `409 INVALID_STATE` khi duyệt/từ chối → tải lại danh sách + chi tiết, toast "Đơn đã được xử lý".
- `403 FORBIDDEN` (Admin tự duyệt đơn của mình, BR-D24) → toast; panel cũng ghi chú khi đơn là của chính mình.
- Bàn phím: Tab vào bảng, ↑/↓/Home/End giữa các dòng, Enter/Space mở chi tiết, Esc đóng panel (tablet). Hộp thoại giữ focus bên trong và trả focus về nút đã mở.
- Bố cục desktop-first (≥ 1280): sidebar 240px + panel chi tiết bên phải. Tablet: sidebar chỉ icon, chi tiết là ngăn kéo phủ lên bảng. Không làm mobile.

## API đang dùng

| Method | Path | Header |
| --- | --- | --- |
| POST | `/v1/auth/login` | — |
| POST | `/v1/auth/refresh` | cookie `nxl_rt` + `X-NXL-Client: admin` |
| POST | `/v1/auth/logout` | cookie `nxl_rt` + `X-NXL-Client: admin` |
| GET | `/v1/me` | `Authorization: Bearer` |
| GET | `/v1/admin/creator-applications?status=&cursor=&limit=20` | Bearer |
| GET | `/v1/admin/creator-applications/{id}` | Bearer |
| POST | `/v1/admin/creator-applications/{id}/approve` | Bearer |
| POST | `/v1/admin/creator-applications/{id}/reject` `{reason}` | Bearer |

## Thư viện

Giống hệt `nexuslive-web` (cùng khoảng phiên bản), bỏ `hls.js`: Tailwind v4, shadcn/Radix (`radix-ui`), lucide-react,
TanStack Query v5 (dữ liệu server), Zustand v5 (chỉ phiên), react-hook-form + zod, i18next / react-i18next, Vitest, Playwright, oxlint.
**Không thêm thư viện mới** khi chưa thống nhất (Working Plan WP6b).

## UI dùng chung (chép từ `nexuslive-web`, 2026-10-13)

GĐ1 **chép** thay vì tách package chung (G1-Q5: chi phí monorepo FE lớn hơn lợi ích); xem lại ở GĐ5. Khi sửa token hoặc
component ở `nexuslive-web`, chép lại sang đây và cập nhật ngày.

| File ở đây | Nguồn (`nexuslive-web/…`) | Ghi chú |
| --- | --- | --- |
| `src/styles/tokens.css` | `src/styles/tokens.css` | Nguyên văn (Obsidian Pulse, dark-only) |
| `src/index.css` | `src/index.css` | Nguyên văn |
| `src/components/ui/{button,input,label,textarea,text-field,alert-dialog,confirm-dialog,badge,skeleton,sonner,spinner,separator,tooltip,dropdown-menu,tabs}.tsx` | `src/components/ui/*` | Nguyên văn |
| `src/lib/utils.ts` | `src/lib/utils.ts` | Nguyên văn |
| `src/lib/api-client.ts` | `src/lib/api-client.ts` | Đổi: tùy chọn `headers`, `CLIENT_HEADER` (`X-NXL-Client: admin`), `toApiError` đọc `Retry-After` và suy mã lỗi từ HTTP status khi body không phải envelope (trang lỗi Nginx) |
| `src/lib/api-error.ts` | `src/lib/api-error.ts` | Đổi: `details: Record<string, unknown>`, `retryAfter`, helper `codeForStatus` / `retryAfterSeconds` / `lockedUntil` |
| `src/lib/query-client.ts` | `src/lib/query-client.ts` | Đổi: không retry lỗi 4xx; refetch khi quay lại tab (dữ liệu duyệt đơn có thể đổi bởi Admin khác) |
| `src/i18n/{index,messages,i18next.d.ts,resources.test}.ts` | `src/i18n/*` | `index.ts` đổi khóa localStorage thành `nxl.admin.lang`; `resources.ts` viết lại cho 3 namespace |
| `src/app/shell/language-menu.tsx` | `src/app/shell/language-menu.tsx` | Nguyên văn |
| `.oxlintrc.json`, `tsconfig*.json`, `vitest.config.ts`, `components.json`, `.gitignore` | cùng tên | Nguyên văn |

## Đa ngôn ngữ

- `src/locales/<vi|en>/<common|auth|applications>.json`; **tiếng Việt là nguồn** (thêm key `vi` trước rồi dịch `en`) — G1-Q6: GĐ1 dịch cả hai.
- Key được kiểm tra kiểu (`src/i18n/i18next.d.ts`); ngoài component (zod, ánh xạ lỗi) trả **key** `"ns:path"` và dịch bằng `useMessage()`.
- Ngày giờ qua `src/lib/format.ts` (ngày sinh `YYYY-MM-DD` định dạng theo UTC để không lệch ngày theo múi giờ).
- `pnpm test` kiểm tra `en` có đủ key của `vi` và giữ nguyên placeholder.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/app/` | Router, providers, khung quản trị (sidebar, top bar), trang 404 |
| `src/components/ui/` | Component nền (chép từ web) |
| `src/lib/` | `api-client`, `api-error`, `error-message` (mã lỗi → key i18n), `format`, `query-client` |
| `src/features/session/` | Đăng nhập, khôi phục phiên, chặn quyền Admin (`lib/gate.ts`), màn không có quyền |
| `src/features/applications/` | Đơn Creator: API, hook TanStack Query, bảng, panel chi tiết, hộp thoại Duyệt / Từ chối |
| `src/i18n/`, `src/locales/` | i18next |
| `e2e/` | Playwright |

## E2E

`pnpm e2e` (`e2e/approve.spec.ts`) chạy qua Vite proxy trên stack thật (`make nxl-up-all`, seed dev bật):

1. Tạo user mới bằng API (`acceptTerms: true`), lấy token xác minh từ Mailpit (`/api/v1/search?query=to:<email>` → `/api/v1/message/<ID>`),
   `POST /v1/auth/verify-email`, nộp đơn Creator; đăng nhập admin `admin@nexuslive.dev` / `E2E_SEED_PASSWORD` (mặc định `nexuslive123`),
   tìm đơn (bấm "Tải thêm" nếu cần), Duyệt, kiểm tra người nộp thấy `APPROVED`.
2. Tài khoản thường đăng nhập admin → màn "Tài khoản không có quyền quản trị"; `GET /v1/admin/creator-applications` → `403 FORBIDDEN`.

- Biến: `E2E_SEED_PASSWORD`, `E2E_MAILPIT_URL` (mặc định `http://localhost:8025`), `E2E_CHROMIUM_PATH` (dùng trình duyệt có sẵn).
- Lần đầu: `pnpm exec playwright install chromium`.
- Edge giới hạn `/v1/auth/*` 10 request/phút/IP: chạy liên tục nhiều lần có thể gặp `429`.
- CI (`.github/workflows/ci.yml`) chỉ chạy lint, typecheck, unit test, build; E2E chạy trên máy vì cần cả stack.
