# P1-PUBLIC — Public UX & Product

**Phase:** 1 · **Version:** 2.2 · **Owns:** Toàn bộ route, trạng thái, feed, đọc/nghe, comment, account, request, notification opt-in và art direction public.
**Depends on:** [P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md), [P1-ARCH](02_ARCHITECTURE_CODEBASE.md)

[← P1-ARCH](02_ARCHITECTURE_CODEBASE.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Mọi route/trạng thái ở đây phải tuân thủ `P1-SCOPE §3` (guest/user quyền mặc định, guest comment ownership 15 phút, user posting/report tắt mặc định, không media user). Business rule chi tiết đằng sau mỗi route thuộc `P1-FLOW`; contract API thuộc `P1-API`.

## 1. Route map public

| Route | Nội dung | Truy cập |
|---|---|---|
| `/` | Home — hero, giới thiệu, feed preview, kho truyện nổi bật | guest + user |
| `/stories` | Kho truyện — danh sách, filter, tìm kiếm cơ bản | guest + user |
| `/stories/:slug` | Chi tiết truyện — thông tin, danh sách chương, counters | guest + user |
| `/stories/:slug/chapters/:chapterSlug` | Trang đọc chương + CTA nghe YouTube | guest + user |
| `/feed` | Feed cộng đồng (bài chính thức, sau này bài user nếu flag bật) | guest + user |
| `/request` | Form yêu cầu truyện | guest + user |
| `/account/*` | Đăng ký, xác minh email, đăng nhập, quên/đặt lại mật khẩu, hồ sơ, cài đặt thông báo | guest (auth flow) → user (đã đăng nhập) |
| `/subscribe/*` | Xác nhận/hủy subscription email | guest + user (qua link email) |

Route chi tiết dưới `/system/*` hoặc `/admin/*` **không** thuộc P1-PUBLIC — xem `P1-ADMIN`. Không route public nào được render System navigation.

## 2. Trạng thái bắt buộc cho mọi async view

Theo `.claude/rules/frontend.md`, mỗi view async (fetch dữ liệu) phải xử lý đủ 5 trạng thái nơi áp dụng được:

1. **Loading** — skeleton/placeholder, không giật layout (CLS = 0).
2. **Empty** — không có dữ liệu (ví dụ kho truyện chưa có truyện, feed trống).
3. **Error** — lỗi mạng/server, có hành động thử lại.
4. **Forbidden/disabled** — tính năng bị tắt bởi runtime flag (ví dụ user posting đang off) hoặc không đủ quyền.
5. **Success** — hiển thị dữ liệu thật.

Feature-flagged control phải biến mất trong cửa sổ lan truyền quy định tại `P1-PERF`, nhưng API luôn là điểm enforce cuối cùng — ẩn UI không thay thế việc chặn API.

## 3. Kho truyện & chi tiết truyện

- Danh sách: phân trang/cursor theo `P1-API`, hiển thị cover, tiêu đề, trạng thái (đang ra/hoàn thành), counters công khai (`P1-DATA` sở hữu số liệu, xem `P1-I039`).
- Chi tiết truyện: mô tả, danh sách chương theo thứ tự, trạng thái publish. Chỉ hiển thị chương đã publish (visibility rule thuộc `P1-FLOW`).
- SSR bắt buộc cho SEO (title, description, structured data — chi tiết `P1-PERF §SEO`).

## 4. Đọc chương & CTA nghe YouTube

- Nội dung chương hiển thị dạng văn bản (TXT-based), không phát audio nội bộ, không AI text-to-speech (khớp `P1-SCOPE` loại trừ AI sinh nội dung).
- CTA "Nghe trên YouTube" trỏ ra ngoài trang (external link), có fallback rõ ràng khi truyện/chương không có link YouTube (ẩn CTA, không hiển thị nút chết).
- Trang đọc dùng hiệu ứng tối giản theo `.claude/rules/frontend.md` (glow qua CSS box-shadow/blur, không particle/GSAP loop).

## 5. Feed cộng đồng

- Feed hiển thị bài đăng chính thức (do admin/hệ thống tạo) theo cursor pagination, tải dần (infinite scroll hoặc "tải thêm").
- Bài đăng của user chỉ xuất hiện khi runtime flag user-posting được SUPER_ADMIN bật (mặc định tắt theo `P1-SCOPE §3.2`).
- Mỗi bài có: like (guest/user), comment, reply. Guest tương tác qua visitor identity (xem `P1-I043`), không cần đăng nhập.

## 6. Like

- Guest và user đều like/unlike được. Guest like gắn với visitor token; khi guest đăng ký/đăng nhập thành công, hệ thống merge like theo visitor token vào tài khoản (rule merge thuộc `P1-FLOW`).
- UI phải phản ánh trạng thái đã like ngay lập tức (optimistic update) nhưng số liệu hiển thị cuối cùng do server xác nhận.

## 7. Comment & reply

- Guest comment/reply không cần đăng nhập; ownership xác định bằng visitor token/hash.
- Chỉ được sửa hoặc soft-delete comment/reply của chính mình (theo token/tài khoản) trong vòng **15 phút** kể từ khi tạo — invariant khóa cứng từ `P1-SCOPE §3.3`. Sau 15 phút, UI ẩn nút sửa/xóa; API cũng phải từ chối (không chỉ ẩn UI).
- Comment/reply đi qua automated moderation (text-only) trước khi hiển thị công khai; trạng thái `PENDING` khi provider lỗi (fail-safe, không tự publish) — chi tiết `P1-SEC`.

## 8. Yêu cầu truyện (story request)

- Guest và user đều gửi được yêu cầu truyện qua `/request`.
- Guest phải cung cấp contact (email) để nhận phản hồi; việc thu thập contact tuân theo consent ledger (`P1-I060`, chi tiết `P1-SEC`).
- Không có SLA phản hồi tự động trong Phase 1; xử lý yêu cầu là thao tác thủ công của admin (xem `P1-ADMIN`).

## 9. Tài khoản user

- Đăng ký yêu cầu xác minh email trước khi tài khoản có toàn quyền user (login được nhưng một số hành động có thể yêu cầu email đã verify — chi tiết state machine thuộc `P1-FLOW`).
- Đăng nhập/đăng xuất, quên/đặt lại mật khẩu theo luồng chuẩn (token một lần, hết hạn, không lộ email tồn tại hay không qua thông điệp lỗi khác biệt).
- Hồ sơ user cho phép chỉnh thông tin cơ bản và cài đặt thông báo (bật/tắt từng loại notification cá nhân — không liên quan đến community feature flag cấp hệ thống).

## 10. Thông báo (public-facing)

- Chuông thông báo trong site cho user đã đăng nhập (theo `P1-I064`).
- Đăng ký nhận qua email đã xác minh hoặc Web Push opt-in (không Zalo trả phí, không kênh trả phí khác — `P1-SCOPE §3.7`).
- Hủy nhận (unsubscribe) qua link email phải hoạt động không cần đăng nhập.
- Tắt auto-send (do SUPER_ADMIN) không được chặn thông báo account/security/direct story-request cá nhân — chỉ chặn thông báo hàng loạt tự động về truyện/chương mới.

## 11. Art direction & performance (tham chiếu)

Chi tiết hiệu ứng hero, animation, performance budget theo section thuộc `.claude/rules/frontend.md` (UI performance and animation rules) và `P1-PERF`. Module này chỉ xác nhận: mọi trang public phải mobile-first, giữ SSR/SEO, tôn trọng `prefers-reduced-motion`.

## 12. Accessibility

- Điều hướng bàn phím đầy đủ, focus visible, HTML ngữ nghĩa, tên accessible cho control, độ tương phản đạt chuẩn — áp dụng cho mọi route trong mục 1.
- Chi tiết ngân sách performance/mobile cụ thể thuộc `P1-PERF`; chi tiết test coverage thuộc `P1-QA`.

## 13. Ranh giới với module khác

- State machine đằng sau publish/comment/like/request: `P1-FLOW`.
- Schema counters/comment/like/subscription: `P1-DATA`.
- Request/response shape, cursor, idempotency: `P1-API`.
- Rate limit, CAPTCHA, moderation, privacy: `P1-SEC`.
- Cache, SEO, performance budget cụ thể: `P1-PERF`.

Module này không được định nghĩa lại schema, API contract hay business rule — chỉ mô tả route, trạng thái UI và trải nghiệm.
