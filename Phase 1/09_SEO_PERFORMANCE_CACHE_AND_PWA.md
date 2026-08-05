# P1-PERF — SEO, Performance, Cache & PWA

**Phase:** 1 · **Version:** 2.2 · **Owns:** SEO SSR, cache matrix/invalidation, performance budgets, mobile/PWA và crawler behavior.
**Depends on:** [P1-ARCH](02_ARCHITECTURE_CODEBASE.md), [P1-PUBLIC](03_PUBLIC_UX_AND_PRODUCT.md), [P1-DATA](06_DATABASE_SCHEMA.md), [P1-API](07_API_CONTRACTS.md), [P1-SEC](08_SECURITY_MODERATION_AND_PRIVACY.md)

[← P1-SEC](08_SECURITY_MODERATION_AND_PRIVACY.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Ngân sách và quy tắc animation chi tiết đã khóa tại `.claude/rules/frontend.md` (UI performance and animation rules). Module này là nguồn canonical cho performance budget, cache matrix và PWA — `.claude/rules/frontend.md` là hướng dẫn thực thi cụ thể, không mâu thuẫn với nhau.

## 1. Performance budget (khóa cứng, áp dụng toàn bộ route public)

- **LCP ≤ 2.5s** trên 4G mobile.
- **TBT ≤ 200ms**.
- **CLS = 0** (không giật layout — ảnh/skeleton phải có kích thước cố định trước khi load).
- Hero animation JS ≤ 30 KB gzipped.
- Không render-blocking script ngoài critical CSS.

## 2. SEO & SSR

- Mọi route public tại `P1-PUBLIC §1` phải SSR đầy đủ (title, meta description, canonical URL, Open Graph, structured data JSON-LD phù hợp loại nội dung — `Book`/`Article`/`BreadcrumbList` khi áp dụng).
- Structured data cho trang truyện/chương phải phản ánh đúng trạng thái publish thật (không index nội dung DRAFT).
- Slug (`Story.slug`, `Chapter.slug`) là định danh SEO ổn định — không tái sử dụng slug đã publish cho nội dung khác.

## 3. Robots, sitemap, crawler policy

- `robots.txt` cho phép crawl toàn bộ route public trong mục `P1-PUBLIC §1`; chặn crawl `/api/admin/*`, `/api/system/*`, `/account/*` (trang có dữ liệu cá nhân).
- Sitemap tự động sinh từ `Story`/`Chapter` có `status = PUBLISHED`, cập nhật khi publish/unpublish (không sitemap tĩnh lỗi thời).
- Crawler bot được nhận diện qua user-agent pattern đã biết, dùng để loại trừ khỏi `AnalyticsSession`/`AnalyticsEvent` (`P1-DATA §13`) và không tính vào rate-limit như visitor thường (nhưng vẫn giới hạn tốc độ tổng để chống crawl abuse — chi tiết ngưỡng thuộc `P1-SEC §3`).

## 4. Cache matrix

| Nội dung | Nơi cache | TTL/chiến lược | Invalidation |
|---|---|---|---|
| Trang chi tiết truyện/chương đã publish | HTTP cache public (Cache-Control) + SSR cache trong Nitro | `max-age` ngắn + `stale-while-revalidate` | Xóa cache key khi publish/unpublish, khi edit nội dung chương |
| Kho truyện (danh sách) | HTTP cache public | TTL ngắn hơn trang chi tiết (danh sách thay đổi thường xuyên hơn) | Xóa khi có story mới publish/archive |
| Feed cộng đồng | Không cache dài (gần real-time) hoặc TTL rất ngắn | — | Xóa/giảm TTL khi có post/comment mới hoặc moderation decision thay đổi |
| Counters (`StoryCounter`, `FeedPostCounter`) | Không cache riêng — đọc trực tiếp cùng query trang chứa nó | — | N/A (luôn đọc mới) |
| API user/admin (session-bound) | `private, no-store` | Không cache | N/A |
| Ảnh cover (`@nuxt/image` output) | CDN/edge cache dài hạn, versioned URL | Dài (ảnh immutable theo hash/version trong URL) | Đổi URL khi cover thay đổi (không cần purge cache thủ công) |
| Feature flag đọc phía client (nếu cache) | In-memory ngắn hạn tại client hoặc edge | ≤ cửa sổ lan truyền mục 5 | Không áp dụng cache dài — luôn re-fetch trong cửa sổ quy định |

Chi tiết cơ chế xóa cache (event-driven invalidation qua publication event tại `P1-FLOW §5`, hay TTL-only) triển khai tại `P1-I084`; bảng trên là ràng buộc tối thiểu, không được nới lỏng.

## 5. Cửa sổ lan truyền feature flag

- Sau khi SUPER_ADMIN đổi feature flag, UI ẩn/hiện control liên quan trong vòng **tối đa 60 giây** (poll hoặc cache TTL ngắn phía client) — con số chính xác cấu hình tại `P1-I084`/`P1-I020`, không vượt quá mức này.
- API luôn là điểm enforce cuối; cửa sổ lan truyền chỉ ảnh hưởng UI, không ảnh hưởng tính đúng đắn của authorization.

## 6. Mobile & responsive

- Mobile-first cho toàn bộ layout public (`P1-PUBLIC`).
- Trên mobile: giảm blur ≤ 12px, `will-change` chỉ trên phần tử hero, thay Three.js (nếu Home Hero dùng) bằng ảnh WebP tĩnh, tối đa 2 GSAP timeline song song, không `backdrop-filter` khi thiếu `prefers-reduced-motion` guard — theo đúng `.claude/rules/frontend.md`.

## 7. PWA & Service Worker an toàn (P1-I085)

- Service worker (`@vite-pwa/nuxt`) chỉ cache asset tĩnh (JS/CSS/ảnh/manifest) — **không cache** response API có dữ liệu cá nhân hoặc session-bound (`private, no-store` ở mục 4 phải được tôn trọng bởi service worker, không override).
- Cập nhật service worker phải có cơ chế "skip waiting" có kiểm soát, tránh phục vụ asset cũ vĩnh viễn sau deploy.
- Web Push subscription (đăng ký tại `/api/public/webpush/subscribe`) tách biệt khỏi cache logic của service worker.

## 8. Ngân sách hiệu năng cho query/dashboard admin

- Query dashboard analytics (`P1-ADMIN §8`) phải dùng dữ liệu đã aggregate (`AnalyticsDailyAggregate`), không query trực tiếp `AnalyticsEvent` thô trên khoảng thời gian lớn tại request-time.
- Cursor pagination (`P1-API §4`) bắt buộc cho mọi danh sách có khả năng tăng không giới hạn (feed, comment, tracking link list, audit log).

## 9. Accessibility (tham chiếu)

Yêu cầu accessibility chi tiết (contrast, focus, semantic HTML) thuộc `P1-PUBLIC §12`/`.claude/rules/frontend.md`; module này chỉ đảm bảo chúng không bị hy sinh vì tối ưu hiệu năng (vd không dùng `<div>` giả lập button để giảm bundle size).

## 10. Ranh giới với module khác

- Route/trạng thái UI cụ thể: `P1-PUBLIC`.
- Schema counters/analytics: `P1-DATA`.
- Ngưỡng bảo mật crawler/rate-limit: `P1-SEC`.
- Ngân sách CPU/RAM hạ tầng để đạt các budget này trên VPS 2 GB: `P1-INFRA`.

Module này sở hữu **con số ngân sách và chiến lược cache/SEO/PWA**; không định nghĩa lại route hay schema.
