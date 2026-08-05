# P1-API — API Contracts

**Phase:** 1 · **Version:** 2.2 · **Owns:** Public/user/admin/system API, DTO, cursor, idempotency, cache header và authorization contract.
**Depends on:** [P1-FLOW](05_BUSINESS_FLOWS.md), [P1-DATA](06_DATABASE_SCHEMA.md), [P1-ADMIN](04_ADMIN_RBAC_AND_SYSTEM_UI.md)

[← P1-DATA](06_DATABASE_SCHEMA.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Mọi endpoint dưới đây phải tuân thủ `.claude/rules/api-security.md`: validate trước khi chạy use case, authenticate rồi mới authorize, giữ namespace public/admin tách biệt, dùng error envelope chuẩn, không rò rỉ nội bộ.

## 1. Namespace & versioning

- Prefix: `/api/public/*` (guest+user), `/api/user/*` (yêu cầu user session), `/api/admin/*` (yêu cầu admin session + TOTP), `/api/system/*` (chỉ SUPER_ADMIN).
- Không version trong URL ở Phase 1 (một version duy nhất); thay đổi breaking phải qua migration có kế hoạch, không sửa ngầm contract đã publish.
- Content-Type bắt buộc `application/json` cho mọi request có body; từ chối content type khác với `415`.

## 2. Error envelope chuẩn

```json
{
  "error": {
    "code": "STRING_STABLE_CODE",
    "message": "Thông điệp an toàn để hiển thị người dùng",
    "requestId": "uuid"
  }
}
```

- `code` là chuỗi ổn định, dùng để client rẽ nhánh xử lý (vd `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`).
- Không bao giờ trả stack trace, câu lệnh SQL, đường dẫn file nội bộ, hay raw provider response.
- `requestId` sinh tại middleware request-context (`P1-I005`), dùng để tra log nội bộ mà không lộ thông tin ra ngoài.

## 3. Xác thực & phiên

| Namespace | Cơ chế | Ghi chú |
|---|---|---|
| `/api/public/*` | Không bắt buộc; visitor token cookie nếu có tương tác trước đó | Guest OK |
| `/api/user/*` | `UserSession` cookie (httpOnly, secure) | 401 nếu thiếu/hết hạn |
| `/api/admin/*` | `AdminSession` cookie, **và** `totpVerifiedAt IS NOT NULL` | 401 nếu chưa login; 403 nếu chưa hoàn tất TOTP dù đã có session |
| `/api/system/*` | Như admin, **và** role = `SUPER_ADMIN` | 403 nếu role = ADMIN |

`UserSession` không bao giờ được middleware admin chấp nhận và ngược lại — kiểm tra cookie name/namespace riêng biệt ngay tại middleware, không suy luận quyền từ payload chung.

## 4. Cursor pagination (danh sách công khai/feed/comment)

```
GET /api/public/.../?cursor=<opaque>&limit=<n>
→ { "items": [...], "nextCursor": "opaque|null" }
```

- `cursor` là chuỗi opaque (base64 của `(createdAt, id)` hoặc tương đương) — không lộ ID tuần tự dự đoán được của DB.
- `limit` có giá trị mặc định và trần tối đa (ví dụ mặc định 20, trần 50) — vượt trần thì API tự cắt về trần, không lỗi.
- Áp dụng cho: kho truyện, feed, comment/reply, notification list, tracking/analytics list phía admin.

## 5. Idempotency cho mutation có thể retry

- Mutation "tạo một lần" nhạy cảm với duplicate (like, comment, subscription verify, publication fan-out, story request) chấp nhận header `Idempotency-Key` (UUID do client sinh) hoặc dùng unique constraint tự nhiên đã có ở `P1-DATA` (vd `Like` unique theo target+actor).
- Retry cùng key trong cửa sổ hợp lệ trả lại đúng kết quả lần đầu (status 200/201 với cùng payload), không tạo bản ghi thứ hai.
- Race safety enforce bằng unique constraint / transaction ở PostgreSQL, không chỉ kiểm tra tồn tại ở application layer trước khi insert (tránh TOCTOU).

## 6. Cache header contract

| Loại response | Cache-Control |
|---|---|
| Trang public SSR (story list/detail, feed) | `public, max-age=<ngắn>, stale-while-revalidate=<...>` — giá trị cụ thể thuộc `P1-PERF` |
| API public GET đọc dữ liệu bán-tĩnh | Tương tự, có `ETag` khi hợp lý |
| API user/admin (có session) | `private, no-store` |
| API mutation | `no-store` |

Chi tiết ma trận cache/invalidation đầy đủ thuộc `P1-PERF`; ở đây chỉ khóa nguyên tắc: **không cache response có dữ liệu theo session hoặc theo quyền**.

## 7. Public API (guest + user)

```
GET  /api/public/stories                     -- cursor list
GET  /api/public/stories/:slug                -- chi tiết + counters
GET  /api/public/stories/:slug/chapters/:chapterSlug   -- nội dung chương (visibility theo P1-FLOW §1)
GET  /api/public/feed                         -- cursor list bài chính thức (+ bài user nếu flag bật)
POST /api/public/feed/:postId/like            -- idempotent theo (target, actor)
POST /api/public/feed/:postId/comments        -- tạo comment, đi qua moderation (P1-FLOW §4)
POST /api/public/comments/:commentId/replies  -- tạo reply
PATCH /api/public/comments/:commentId         -- sửa, chỉ trong 15 phút + đúng ownership (409 nếu hết hạn/sai owner)
DELETE /api/public/comments/:commentId        -- soft-delete, cùng điều kiện 15 phút
POST /api/public/stories/:storyId/like        -- like truyện
POST /api/public/requests                     -- yêu cầu truyện (guest/user)
POST /api/public/subscriptions                -- đăng ký email (double opt-in)
GET  /api/public/subscriptions/verify         -- xác minh qua link email
POST /api/public/subscriptions/unsubscribe    -- hủy nhận, idempotent
POST /api/public/webpush/subscribe            -- đăng ký Web Push
GET  /api/public/track/:slug                  -- redirect tracking link + ghi attribution async
```

## 8. User API (yêu cầu `UserSession`)

```
POST /api/user/register
POST /api/user/register/verify-email
POST /api/user/login
POST /api/user/logout
POST /api/user/password/forgot
POST /api/user/password/reset
GET  /api/user/profile
PATCH /api/user/profile
GET  /api/user/notification-preferences
PATCH /api/user/notification-preferences
GET  /api/user/notifications                  -- cursor list chuông thông báo
POST /api/user/notifications/:id/read
POST /api/user/feed/posts                     -- chỉ khi feature flag user-posting bật; 403 nếu tắt dù UI đã ẩn
```

`POST /api/user/feed/posts` phải kiểm tra `FeatureFlag.user_posting_enabled` phía server ở mọi request, không cache kết quả flag lâu hơn cửa sổ lan truyền quy định tại `P1-PERF`.

## 9. Admin API (yêu cầu `AdminSession` + TOTP)

```
POST /api/admin/login                 -- bước 1: password
POST /api/admin/login/totp            -- bước 2: mã TOTP, hoàn tất session
POST /api/admin/totp/setup            -- tạo secret + QR (P1-I016)
POST /api/admin/totp/activate         -- xác minh mã đầu tiên để kích hoạt

GET|POST|PATCH|DELETE /api/admin/stories
GET|POST|PATCH|DELETE /api/admin/stories/:id/chapters
POST /api/admin/stories/:id/cover                 -- upload ảnh bìa
POST /api/admin/stories/:id/import                -- bulk import TXT, tạo StoryImportJob
GET  /api/admin/stories/:id/import/:jobId         -- tiến trình job
POST /api/admin/stories/:id/import/:jobId/cancel
POST /api/admin/stories/:id/publish
POST /api/admin/chapters/:id/publish

GET  /api/admin/moderation/queue                  -- comment/post PENDING/flagged
POST /api/admin/moderation/:targetType/:id/decision   -- APPROVE | REJECT

GET  /api/admin/analytics/dashboard
GET  /api/admin/analytics/tracking-links
POST /api/admin/tracking-links
```

## 10. System API (chỉ SUPER_ADMIN)

```
GET  /api/system/feature-flags
PATCH /api/system/feature-flags/:key      -- body kèm `expectedVersion` cho optimistic concurrency
GET  /api/system/settings
PATCH /api/system/settings/:key
GET  /api/system/admins
POST /api/system/admins
PATCH /api/system/admins/:id              -- đổi role/status; chặn hạ quyền SUPER_ADMIN cuối cùng (409)
GET  /api/system/audit-log
GET  /api/system/abuse/signals
POST /api/system/abuse/block
POST /api/system/abuse/:id/clear
```

`PATCH /api/system/feature-flags/:key` và `/settings/:key` trả `409 CONFLICT` nếu `expectedVersion` không khớp `version` hiện tại trong DB — client phải fetch lại trước khi thử lại.

## 11. Validation chung cho mọi mutation

Trước khi gọi use case, route handler phải:

1. Kiểm tra `Content-Type` và giới hạn kích thước body.
2. Parse/validate bằng schema Zod tương ứng DTO; **từ chối field lạ** (`strict`/`strip: false` tùy ngữ cảnh — mặc định từ chối trừ khi contract nói rõ cho phép field mở rộng).
3. Validate định dạng identifier (UUID) và cursor trước khi truy vấn DB.
4. Với state-transition (publish, moderation decision, flag toggle): kiểm tra trạng thái nguồn hợp lệ theo `P1-FLOW` trước khi ghi — trả `409 CONFLICT` nếu transition không hợp lệ từ trạng thái hiện tại.

## 12. Ranh giới với module khác

- Ý nghĩa nghiệp vụ đằng sau mỗi transition endpoint: `P1-FLOW`.
- Tên bảng/cột thực tế ánh xạ DTO: `P1-DATA`.
- Ma trận quyền chi tiết theo role: `P1-ADMIN`.
- Ngưỡng rate-limit/CAPTCHA/CSRF/CORS/CSP cụ thể áp cho các route trên: `P1-SEC`.
- Giá trị cache/TTL cụ thể: `P1-PERF`.

Module này chỉ định nghĩa **hình dạng contract** (route, method, request/response envelope, pagination, idempotency, cache class) — không định nghĩa lại business rule hay schema.
