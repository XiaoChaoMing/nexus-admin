# NexusLive Admin

Trang quản trị của NexusLive (WP6b, GĐ1) — React + TypeScript + Vite, **tách riêng** khỏi web người dùng `nexuslive-web`.
GĐ1: duyệt / từ chối **đơn đăng ký Creator**. GĐ5 (WP8): **Báo cáo**, **Người dùng**, **Kênh**, **Buổi phát**, **Nhật ký**.

Hợp đồng: TSD `nexuslive-be/docs/plans/technical/2026-10-13-gd01-identity-web-shell.md` (§3 S4/S6, §4.1, §6);
Working Plan cùng tên §WP6b; spec NXL-D §3.4, §7.2, BR-D12/D13/D24, §13.1; NXL-00 §5 (mã lỗi), §7 (phiên).
GĐ5: TSD `docs/plans/technical/2026-10-15-gd05-safety-notifications.md` (§4 S5–S7, §5.1, §5.3, §5.4, §6.5, §7), Working Plan
cùng tên §WP8, spec NXL-F §3.9–§3.13, §8, §9, §13.5; brief design GĐ5 mục A0–A6; API catalog §6C.

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
| `pnpm test` | Unit test (Vitest): ánh xạ lỗi API, định dạng, lý do, phiên + chặn quyền Admin, khóa i18n; GĐ5: lọc / xử lý báo cáo, lỗi hành động Admin, trạng thái tài khoản, bộ lọc nhật ký, render tĩnh bằng chứng / badge / bảng (`*.test.tsx`, `react-dom/server`) |
| `pnpm e2e` | E2E (Playwright) trên stack thật — xem mục E2E |
| `pnpm preview` | Chạy thử bản build (http://localhost:4174) |

## Cấu hình

Sao chép `.env.example` thành `.env.local` nếu cần đổi.

| Biến | Mặc định | Việc |
| --- | --- | --- |
| `VITE_DEV_GATEWAY_URL` | `http://localhost:8080` | Nginx edge; Vite proxy chuyển mọi `/v1` tới đây (cùng origin, không cần CORS khi dev) |
| `VITE_WEB_APP_URL` | `http://localhost:5173` | Web người dùng: liên kết "Mở trang xem ↗" / "Mở hồ sơ ↗" của báo cáo, kênh, buổi phát |

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
| `/reports[/:id]?tab=&targetType=&reason=` | Hàng đợi báo cáo: tab Cần xử lý (`OPEN,IN_REVIEW`, mặc định) / Đã xử lý / Đã bỏ qua / Tất cả, lọc đối tượng + lý do, cũ nhất trước. Panel: báo cáo, đối tượng (+ liên kết web / người dùng), bằng chứng (≤ 10 tin, tin bị báo cáo nổi bật, tin đã xóa giữ nội dung gốc, `UNAVAILABLE` → cảnh báo), lịch sử hành động, báo cáo cùng đối tượng; Nhận xử lý / Nhận lại; **Xử lý** (hành động hợp với đối tượng → lý do → "Đóng luôn N báo cáo khác") và **Bỏ qua** |
| `/users[/:id]?q=&status=` | Tra cứu trên bản sao safety (UUID hoặc tiền tố username), chi tiết từ identity (email, kiểu khóa, lý do), lịch sử audit; Khóa (24 giờ · 7 ngày · 30 ngày · Vĩnh viễn) / Mở khóa / Đổi thời hạn; không có nút khóa cho Admin và chính mình |
| `/channels[/:id]?q=&status=` | Tra cứu kênh (UUID, tiền tố handle, tên chứa `q`), chi tiết (chủ kênh, đang live, báo cáo mở), lịch sử; Tạm ngưng / Mở lại kênh |
| `/streams` | Buổi phát đang live (`GET /v1/streams?status=live`, gồm `INTERRUPTED`, 18+): thumbnail, kênh, danh mục, người xem, thời gian đã phát; Gỡ + "Xem ↗" |
| `/audit-log?action=&resourceType=&resourceId=&actor=&from=&to=` | Nhật ký mới nhất trước; lọc hành động, loại / ID đối tượng, người thực hiện (`@username` được đổi sang id qua tra cứu người dùng, hoặc UUID), khoảng ngày (theo múi giờ máy: `from` = 0 giờ ngày đầu, `to` = 0 giờ ngày sau ngày cuối, không bao gồm); bấm dòng → mở rộng `metadata` |
| `*` | 404 |

- `409 INVALID_STATE` khi duyệt/từ chối → tải lại danh sách + chi tiết, toast "Đơn đã được xử lý".
- `403 FORBIDDEN` (Admin tự duyệt đơn của mình, BR-D24) → toast; panel cũng ghi chú khi đơn là của chính mình.
- Bàn phím: Tab vào bảng, ↑/↓/Home/End giữa các dòng, Enter/Space mở chi tiết, Esc đóng panel (tablet). Hộp thoại giữ focus bên trong và trả focus về nút đã mở.
- Bố cục desktop-first (≥ 1280): sidebar 240px + panel chi tiết bên phải. Tablet: sidebar chỉ icon, chi tiết là ngăn kéo phủ lên bảng. Không làm mobile.

### Quản trị GĐ5 — quy tắc chung

- **Hỏi lại 30 s** (NF-Q9, `src/lib/poll.ts`): hàng đợi + chi tiết báo cáo, số báo cáo `OPEN` trên sidebar (`/open-count`),
  người dùng, kênh, buổi phát, nhật ký.
- **Mọi hành động Admin** dùng `AdminActionDialog` (Confirm Danger + lý do 10–500 ký tự, bộ đếm). safety-svc trả `202 {actionId}`
  rồi service sở hữu áp dụng (≤ 2 s): giao diện hiện "Đang áp dụng…" và tải lại các truy vấn liên quan ngay, sau 1,5 s và 4 s.
- **Xử lý báo cáo** = hành động (kèm `reportId`) rồi `resolve {RESOLVED, note = lý do, applyToSameTarget}`; hành động lỗi → báo
  cáo vẫn mở; hành động xong mà đóng lỗi → toast nói rõ. Hành động theo đối tượng: Tin nhắn → xóa tin / timeout / cấm chat
  (kênh lấy từ `GET /v1/streams/{streamId}`) / khóa tài khoản; Người dùng → timeout / cấm chat (khi có `streamId`) / khóa; Buổi
  phát → gỡ / tạm ngưng kênh; Kênh → tạm ngưng.
- **Lỗi** (`features/admin-actions/lib/action-errors.ts`): `reason`/`note = LENGTH` ở lại hộp thoại; `userId = INVALID` → "chính
  mình"; khóa Admin `403` → "Không thể khóa tài khoản quản trị viên"; chat `details.target = PROTECTED`; `404` → tải lại;
  `409 INVALID_STATE` → "Báo cáo đã được xử lý" / "Buổi phát đã kết thúc hoặc không thể gỡ" / "đang bị cấm chat" + tải lại;
  còn lại theo `common:errors`.

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
| GET | `/v1/admin/reports?status=&targetType=&reason=&cursor=&limit=20` · `/open-count` · `/{id}` | Bearer (safety) |
| POST | `/v1/admin/reports/{id}/claim` · `/resolve` `{status, note, applyToSameTarget}` | Bearer (safety) |
| GET | `/v1/admin/users?q=&status=&cursor=&limit=` · `/v1/admin/channels?q=&status=&cursor=&limit=` · `/v1/admin/channels/{id}` | Bearer (safety) |
| GET | `/v1/admin/users/{id}` | Bearer (identity) |
| POST | `/v1/admin/users/{id}/lock` `{durationHours, reason, reportId?}` · `/unlock` `{reason}` → `202 {actionId}` | Bearer (safety) |
| POST | `/v1/admin/channels/{id}/suspend` `{reason, reportId?}` · `/restore` `{reason}` → `202` | Bearer (safety) |
| POST | `/v1/admin/streams/{id}/takedown` `{reason, reportId?}` → `202` | Bearer (safety) |
| GET | `/v1/admin/audit-log?actorId=&action=&resourceType=&resourceId=&from=&to=&cursor=&limit=50` | Bearer (safety) |
| DELETE · PUT | `/v1/chat/rooms/{streamId}/messages/{messageId}` · `/v1/channels/{channelId}/timeouts/{userId}` `{durationSec, reason}` · `/bans/{userId}` `{reason}` | Bearer (chat, Admin = mod mọi kênh) |
| GET | `/v1/streams?status=live&limit=50` · `/v1/streams/{id}` · `/v1/categories` | — (stream, channel) |

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
| `src/components/ui/checkbox.tsx` | `src/components/ui/checkbox.tsx` | Nguyên văn (chép 2026-10-15) |
| `src/lib/utils.ts` | `src/lib/utils.ts` | Nguyên văn |
| `src/lib/api-client.ts` | `src/lib/api-client.ts` | Đổi: tùy chọn `headers`, `CLIENT_HEADER` (`X-NXL-Client: admin`), `toApiError` đọc `Retry-After` và suy mã lỗi từ HTTP status khi body không phải envelope (trang lỗi Nginx); `202` đọc `{data}` (`{actionId}` của safety-svc) |
| `src/lib/api-error.ts` | `src/lib/api-error.ts` | Đổi: `details: Record<string, unknown>`, `retryAfter`, helper `codeForStatus` / `retryAfterSeconds` / `lockedUntil` |
| `src/lib/query-client.ts` | `src/lib/query-client.ts` | Đổi: không retry lỗi 4xx; refetch khi quay lại tab (dữ liệu duyệt đơn có thể đổi bởi Admin khác) |
| `src/i18n/{index,messages,i18next.d.ts,resources.test}.ts` | `src/i18n/*` | `index.ts` đổi khóa localStorage thành `nxl.admin.lang`; `resources.ts` viết lại cho 3 namespace |
| `src/app/shell/language-menu.tsx` | `src/app/shell/language-menu.tsx` | Nguyên văn |
| `.oxlintrc.json`, `tsconfig*.json`, `vitest.config.ts`, `components.json`, `.gitignore` | cùng tên | Nguyên văn |

## Đa ngôn ngữ

- `src/locales/<vi|en>/<common|auth|applications|reports|users|channels|streams|audit>.json`; **tiếng Việt là nguồn** (thêm key `vi` trước rồi dịch `en`) — G1-Q6: GĐ1 dịch cả hai.
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
| `src/components/admin/` | Khung trang quản trị dùng chung: `DataTable` (bàn phím ↑/↓/Home/End/Enter, chọn / mở rộng dòng, skeleton, lỗi, Tải thêm), `MasterDetail`, `DetailPanel`, `FilterBar`, `SearchForm` |
| `src/features/admin-actions/` | API hành động Admin (safety + chat), `AdminActionDialog`, `ChoiceGroup`, ánh xạ lỗi, `useSettle`, `useApplying` |
| `src/features/{reports,users,channels,streams,audit}/` | Năm trang GĐ5 |
| `src/i18n/`, `src/locales/` | i18next |
| `e2e/` | Playwright |

## E2E

`pnpm e2e` (`e2e/approve.spec.ts`) chạy qua Vite proxy trên stack thật (`make nxl-up-all`, seed dev bật):

1. Tạo user mới bằng API (`acceptTerms: true`), lấy token xác minh từ Mailpit (`/api/v1/search?query=to:<email>` → `/api/v1/message/<ID>`),
   `POST /v1/auth/verify-email`, nộp đơn Creator; đăng nhập admin `admin@nexuslive.dev` / `E2E_SEED_PASSWORD` (mặc định `nexuslive123`),
   tìm đơn (bấm "Tải thêm" nếu cần), Duyệt, kiểm tra người nộp thấy `APPROVED`.
2. Tài khoản thường đăng nhập admin → màn "Tài khoản không có quyền quản trị"; `GET /v1/admin/creator-applications` → `403 FORBIDDEN`.

`e2e/moderation.spec.ts` (GĐ5, chạy nối tiếp trên **một** trang, điều hướng trong app để tiết kiệm lượt `/v1/auth/*`) tự tạo dữ liệu qua API:

1. Người báo cáo + người bị báo cáo mới → `POST /v1/reports` (USER, Quấy rối) → Admin mở Báo cáo, lọc, Nhận xử lý, Xử lý = Khóa
   tài khoản 7 ngày → báo cáo "Đã xử lý bởi"; identity `LOCKED`, đăng nhập → `403 ACCOUNT_LOCKED`; trang Người dùng hiện "Đã khóa
   tới"; Nhật ký có Khóa tài khoản, Nhận xử lý báo cáo, Xử lý báo cáo.
2. Creator mới (xác minh Mailpit, đơn được duyệt qua API) → trang Kênh: Tạm ngưng (hồ sơ công khai `403 CHANNEL_SUSPENDED`) → Mở
   lại → Nhật ký có cả hai.
3. Creator mới phát bằng ffmpeg (`E2E_RTMP_URL`, mặc định `rtmp://localhost:1935/live`) → trang Buổi phát: Gỡ → stream `ENDED /
   admin_takedown` → Nhật ký có Gỡ buổi phát. Bỏ qua khi máy không có ffmpeg.

Chạy riêng: `pnpm e2e moderation`.

- Biến: `E2E_SEED_PASSWORD`, `E2E_MAILPIT_URL` (mặc định `http://localhost:8025`), `E2E_RTMP_URL`, `E2E_CHROMIUM_PATH` (dùng trình duyệt có sẵn).
- Lần đầu: `pnpm exec playwright install chromium`.
- Edge giới hạn `/v1/auth/*` 10 request/phút/IP: chạy liên tục nhiều lần có thể gặp `429`.
- CI (`.github/workflows/ci.yml`) chỉ chạy lint, typecheck, unit test, build; E2E chạy trên máy vì cần cả stack.
