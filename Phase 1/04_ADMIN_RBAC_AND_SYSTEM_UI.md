# P1-ADMIN — Admin, RBAC & System UI

**Phase:** 1 · **Version:** 2.2 · **Owns:** CMS, 2FA, ma trận SUPER_ADMIN/ADMIN/USER, System menu, feature flags, auto-notification toggle và admin UX.
**Depends on:** [P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md), [P1-ARCH](02_ARCHITECTURE_CODEBASE.md)

[← P1-PUBLIC](03_PUBLIC_UX_AND_PRODUCT.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Ma trận quyền ở đây thực thi trực tiếp `P1-SCOPE §3.4` (hiding UI is never authorization) và `§3.9` (admin bắt buộc password + TOTP; user session không bao giờ gọi được admin API). Mọi enforcement thật sự nằm ở server API (`P1-API`, `.claude/rules/api-security.md`), UI chỉ phản ánh.

## 1. Ma trận quyền (RBAC)

| Khả năng | USER | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| Xem/like/comment/request (public) | ✅ | ✅ (kế thừa) | ✅ (kế thừa) |
| Đăng bài (khi flag bật) | ✅ nếu flag bật | — | — |
| CRUD truyện/chương, upload cover | ❌ | ✅ | ✅ |
| Bulk import TXT | ❌ | ✅ | ✅ |
| Publish truyện/chương | ❌ | ✅ | ✅ |
| Moderation post/comment (thủ công) | ❌ | ✅ | ✅ |
| Xem analytics dashboard | ❌ | ✅ | ✅ |
| Quản lý tracking link | ❌ | ✅ | ✅ |
| Quản trị tài khoản ADMIN khác | ❌ | ❌ | ✅ |
| System settings (infra-sensitive) | ❌ | ❌ | ✅ |
| Bật/tắt community feature flag | ❌ | ❌ | ✅ |
| Bật/tắt auto-send notification | ❌ | ❌ | ✅ |
| Abuse Guard / block UI | ❌ | ❌ | ✅ |

Ba role **tách biệt hoàn toàn** — không có role lai. Route handler nào phục vụ hành vi trong bảng trên phải kiểm tra role phía server trước khi thực thi (xem `.claude/rules/api-security.md`: authenticate first, authorize server-side second).

## 2. Admin authentication

- Đăng nhập admin bắt buộc **password + TOTP** (`otpauth`), không có phương án bỏ qua TOTP trong Phase 1.
- Thiết lập TOTP lần đầu (`P1-I016`) phải tạo secret, hiển thị QR (`qrcode`), và bắt buộc xác minh một mã hợp lệ trước khi kích hoạt.
- Đăng nhập admin (`P1-I017`) yêu cầu hoàn tất challenge TOTP trong cùng phiên trước khi session admin được coi là hợp lệ; chưa hoàn tất TOTP = chưa đăng nhập.
- Session namespace admin **tách biệt hoàn toàn** khỏi session public user — cookie/token khác nhau, middleware khác nhau. Session user public không bao giờ được admin API chấp nhận, kể cả khi user đó cũng có role admin trong bảng khác (không có tài khoản dùng chung giữa hai namespace trong Phase 1).

## 3. Bảo vệ SUPER_ADMIN cuối cùng

- Hệ thống không được cho phép xóa, hạ quyền, hoặc vô hiệu hóa tài khoản SUPER_ADMIN cuối cùng còn lại — luôn phải còn ít nhất một SUPER_ADMIN hoạt động (`P1-I019`).
- Hành động quản trị tài khoản admin khác (tạo/sửa/xóa/đổi role) chỉ SUPER_ADMIN thực hiện được, có audit log.

## 4. System menu & UI

- System navigation (System settings, feature flags, quản trị admin, abuse guard) **chỉ hiển thị cho SUPER_ADMIN**. Không được render menu này cho ADMIN hoặc USER dù ẩn bằng CSS — phải loại khỏi cây component/response phía server-driven navigation nếu có.
- CMS UI (quản lý truyện/chương/moderation/analytics) hiển thị cho cả ADMIN và SUPER_ADMIN.
- Mọi client-side role check chỉ mang tính trình bày (presentation only); nguồn sự thật là kết quả API.

## 5. Runtime feature flags

- Feature flag là cấu hình runtime lưu trong PostgreSQL (không phải biến môi trường/deploy), chỉnh qua System UI.
- Flag tối thiểu Phase 1: `user_posting_enabled`, `user_reporting_enabled`, `community_feature_enabled`, `auto_send_notification_enabled` (tên chính xác cột/bảng thuộc `P1-DATA`).
- Chỉ SUPER_ADMIN thay đổi được các flag infra-sensitive và auto-send; các flag còn lại theo đúng bảng quyền mục 1.
- Thay đổi flag phải có audit log (ai, khi nào, giá trị trước/sau) và dùng optimistic concurrency để tránh ghi đè race condition khi nhiều SUPER_ADMIN sửa đồng thời.
- Tắt `auto_send_notification_enabled` không được chặn thông báo account/security/direct story-request cá nhân (khớp `P1-SCOPE §3.5`); bật lại không xả backlog thông báo tích lũy trong lúc tắt.

## 6. CMS — Truyện & chương

- CRUD bộ truyện (metadata, cover ảnh, trạng thái) chỉ ADMIN/SUPER_ADMIN.
- CRUD từng chương dạng TXT (private storage, không public path trực tiếp — chi tiết `P1-DATA`/`P1-SEC`).
- Bulk import TXT chạy như admin job có preview, tiến trình, khả năng resume/cancel — không chặn request chính (background job theo `P1-ARCH §5`).
- Publish truyện/chương tạo publication event dùng cho fan-out thông báo (`P1-FLOW`).

## 7. Moderation (admin-facing)

- Admin xem hàng đợi comment/post ở trạng thái `PENDING`/bị flag, quyết định duyệt/từ chối thủ công.
- Automated moderation adapter chỉ hỗ trợ, không thay thế quyết định cuối của admin đối với nội dung bị flag; fail-safe của provider (`PENDING`, không auto-publish) là bắt buộc theo `P1-SCOPE §3.10`.
- Abuse Guard (rate limit/spam pattern) và block UI chỉ SUPER_ADMIN thao tác trực tiếp (mở/khóa block), theo bảng mục 1.

## 8. Analytics dashboard (admin-facing)

- ADMIN và SUPER_ADMIN xem được dashboard analytics tổng hợp (traffic, tracking link, current online).
- Dữ liệu hiển thị là aggregate đã tính sẵn (không truy vấn nặng trực tiếp trên request) — chi tiết pipeline thuộc `P1-FLOW`/`P1-DATA`; ngân sách hiệu năng thuộc `P1-PERF`.

## 9. Trạng thái UI bắt buộc

Áp dụng cùng 5 trạng thái (`loading/empty/error/forbidden-disabled/success`) như `P1-PUBLIC §2` cho mọi view admin async, đặc biệt `forbidden` khi ADMIN cố truy cập chức năng chỉ-SUPER_ADMIN (phải trả 403 thật từ API, không chỉ ẩn nút).

## 10. Ranh giới với module khác

- Chi tiết state machine publish/moderation: `P1-FLOW`.
- Schema admin, session, flag, audit log: `P1-DATA`.
- Request/response, error envelope: `P1-API`.
- CSRF/CORS/rate-limit/TOTP crypto chi tiết: `P1-SEC`.
- Ngân sách hiệu năng dashboard, cache: `P1-PERF`.

Module này không định nghĩa lại schema hay API contract — chỉ mô tả ma trận quyền, luồng auth admin và cấu trúc UI CMS/System.
