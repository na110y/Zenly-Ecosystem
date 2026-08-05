# P1-SCOPE — Product Scope & Release

**Phase:** 1 · **Version:** 2.2 · **Owns:** Mục tiêu, phạm vi launch, quyền public ban đầu, global decisions và ranh giới không được lén mở rộng.
**Depends on:** — (module gốc)

[Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là module canonical gốc. Mọi module khác (P1-ARCH, P1-PUBLIC, P1-ADMIN, P1-FLOW, P1-DATA, P1-API, P1-SEC, P1-PERF, P1-INFRA, P1-ROADMAP, P1-QA, P1-ACCEPT) phải tuân thủ ranh giới định nghĩa ở đây. Không module nào được lén mở rộng phạm vi đã khóa.

## 1. Sản phẩm

- **Tên sản phẩm:** Zenly Stories.
- **Thương hiệu:** Zenly Ecosystem.
- **Mô tả:** Nền tảng đọc truyện (light novel / truyện chữ tiên hiệp và thể loại liên quan) với kho truyện public, đọc chương trực tiếp trên web, CTA nghe qua YouTube ngoài, cộng đồng nhẹ (like, comment, yêu cầu truyện) và CMS quản trị nội bộ.

## 2. Mục tiêu Phase 1

1. Ra mắt một sản phẩm đọc truyện hoàn chỉnh, vận hành ổn định trên hạ tầng chi phí thấp (VPS 2 GB).
2. Cho phép guest và user tương tác cơ bản (xem, chia sẻ, like, comment/reply, yêu cầu truyện) mà không cần tài khoản.
3. Cung cấp CMS quản trị đủ để SUPER_ADMIN/ADMIN vận hành nội dung, kiểm duyệt và cấu hình runtime mà không cần can thiệp code/deploy.
4. Giữ toàn bộ vận hành trong ngân sách 0đ/gần-0đ ngoài chi phí VPS đã có (không dịch vụ trả phí bắt buộc).

## 3. Global invariants — khóa cứng Phase 1

Không module hoặc issue nào được sửa ngầm các invariant sau. Thay đổi invariant chỉ được thực hiện tại Master (`Zenly_Ecosystem_Phase_1_Plan.md`) theo quy trình change control của P1-WORK.

1. **Kiến trúc:** một Nuxt/Nitro modular monolith + PostgreSQL + Caddy; launch chạy trên VPS 2 GB. Không Redis, không microservice, không queue server riêng.
2. **Quyền tương tác mặc định:** guest và user được xem, chia sẻ, like, comment/reply và yêu cầu truyện ngay khi launch. User posting (đăng bài) và report (báo cáo) là runtime flag, mặc định **tắt**.
3. **Guest comment ownership:** dựa trên visitor token/hash, chỉ được sửa hoặc soft-delete trong vòng 15 phút kể từ khi tạo; không yêu cầu đăng nhập để bình luận.
4. **Phân quyền:** SUPER_ADMIN có toàn bộ nghiệp vụ + quyền System/hạ tầng; ADMIN chỉ có nghiệp vụ; USER chỉ có quyền public/mặc định. Ẩn UI không phải là authorization — API luôn phải enforce 403 cho hành vi vượt quyền.
5. **Cấu hình cộng đồng và auto-send:** chỉ SUPER_ADMIN được bật/tắt community feature flag và auto-send notification trong CMS; không được sửa qua code hoặc deploy. Tắt auto-send không được chặn thông báo account/security/direct story-request; bật lại không được xả backlog thông báo cũ.
6. **User posting Phase 1:** chỉ text-only, không media do user tải lên. (Phase 2 VIP mới cho phép tối đa 4 ảnh WebP 1080×1080 kèm thumbnail 540×540 — ngoài phạm vi Phase 1, xem P1-FUTURE.)
7. **Thông báo ngoài website:** user nhận qua Web Push (opt-in) hoặc email đã xác minh (free tier); không dùng Zalo API trả phí; không auto-overage, không auto-renew dịch vụ trả phí.
8. **Backup:** source code lưu Git; PostgreSQL + TXT/cover backup ra ngoài VPS bằng phương án 0đ. Snapshot trả phí chưa bắt buộc ở Phase 1.
9. **Admin authentication:** admin/SUPER_ADMIN bắt buộc password + TOTP. Session người dùng public (guest/user) không bao giờ được phép gọi admin API.
10. **Automated Moderation Phase 1:** chỉ kiểm tra nội dung text. Khi provider lỗi, hệ thống fail-safe về trạng thái `PENDING`; không được tự động publish; không được tự kết luận vi phạm bản quyền.
11. **Chất lượng:** "không test thì chưa xong". CI Quality Gate, PostgreSQL thật (không SQLite thay thế), AI golden dataset, E2E/security/performance/recovery và regression suite là bắt buộc trước khi đóng issue hoặc release.
12. **Loại trừ phạm vi (Phase 1 exclusions):** không marketplace, không 3D/commerce, không payment/VIP, không mobile app, không chat realtime, không AI sinh nội dung (AI chỉ dùng để kiểm duyệt text, không sinh nội dung).

## 4. Vai trò người dùng (role) trong phạm vi Phase 1

| Role | Phạm vi |
|---|---|
| `GUEST` | Không tài khoản. Xem, chia sẻ, like, comment/reply (ownership theo visitor token 15 phút), yêu cầu truyện, đăng ký nhận thông báo (email/Web Push). |
| `USER` | Có tài khoản, đã xác minh email. Kế thừa toàn bộ quyền guest gắn với danh tính cố định thay vì visitor token. Posting/report là runtime flag, mặc định tắt. |
| `ADMIN` | Toàn bộ nghiệp vụ CMS: quản lý truyện/chương, kiểm duyệt, xem analytics. Không có quyền System/hạ tầng. |
| `SUPER_ADMIN` | Toàn bộ quyền ADMIN + System settings, community feature flags, cấu hình hạ tầng-nhạy cảm, auto-send notification toggle, quản trị tài khoản admin khác. |

Chi tiết ma trận quyền, TOTP, và System UI thuộc `P1-ADMIN`. Chi tiết route/UI public thuộc `P1-PUBLIC`.

## 5. Tính năng trong phạm vi Phase 1 (in-scope)

- Kho truyện public (danh sách, chi tiết, tìm kiếm cơ bản).
- Đọc chương trực tiếp trên web (TXT-based) + CTA nghe qua YouTube ngoài (không phát audio nội bộ, không AI TTS).
- Feed cộng đồng: bài đăng chính thức (admin/hệ thống), like, comment, reply.
- Yêu cầu truyện (story request) từ guest và user.
- Thông báo: chuông trong site, email xác minh, Web Push opt-in; publication fan-out cho truyện/chương mới.
- CMS: CRUD truyện/chương, upload ảnh bìa, bulk import TXT, publish workflow, moderation (thủ công + automated text moderation), System settings, feature flags, tracking link, analytics dashboard nội bộ.
- Bảo mật: RBAC ba cấp, TOTP admin, CSRF/CORS/CSP, rate limit, CAPTCHA, abuse guard, audit log, consent ledger cho contact capture.
- Hạ tầng: Docker Compose trên VPS 2 GB, Caddy TLS, health/readiness, backup 0đ, observability tối thiểu.

## 6. Ngoài phạm vi Phase 1 (out-of-scope — không được lén mở rộng)

- Redis, message broker, microservice tách rời, in-memory durable store.
- User-uploaded media (ảnh, video, audio) trong bài đăng.
- Marketplace, thương mại điện tử, 3D/AR/VR commerce.
- Thanh toán, gói VIP, subscription trả phí cho user.
- Mobile app (native/hybrid).
- Chat thời gian thực (1-1 hoặc group).
- Nội dung do AI sinh ra (truyện, ảnh, audio). AI chỉ được dùng cho automated text moderation.
- Dịch vụ nhắn tin trả phí (Zalo API trả phí, SMS trả phí).
- Snapshot backup trả phí, auto-renew hoặc auto-overage cho bất kỳ dịch vụ nào.

Nếu một yêu cầu thay đổi chạm vào các mục loại trừ này, dừng lại và báo cáo scope impact trước khi chỉnh sửa bất kỳ canonical module nào (theo quy tắc tại `.claude/rules/specification.md`).

## 7. Release definition — Phase 1 "launch-ready"

Phase 1 được coi là sẵn sàng phát hành khi đồng thời:

1. Toàn bộ tính năng in-scope tại mục 5 hoạt động qua đường dẫn thật (UI → API → DB), không chỉ qua mock.
2. Toàn bộ 12 global invariant tại mục 3 được enforce có bằng chứng test (không chỉ tài liệu).
3. Quality gate tại `P1-QA` đạt ngưỡng tối thiểu (coverage, security, performance, recovery) và `P1-ACCEPT` checklist được ký đầy đủ.
4. Hạ tầng chạy ổn định trong ngân sách VPS 2 GB theo `P1-INFRA`, có backup 0đ hoạt động và rollback runbook đã diễn tập.
5. Không còn defect P0/P1 mở liên quan tính năng in-scope.

Chi tiết tiêu chí nghiệm thu từng hạng mục thuộc `P1-ACCEPT`. Chi tiết trình tự triển khai thuộc `P1-ROADMAP`.

## 8. Change control cho module này

- Thay đổi global invariant chỉ được thực hiện khi có quyết định thay đổi ở cấp Master; cập nhật đồng thời Master và mục 3 ở đây, không được để lệch nhau.
- Các module phụ thuộc (P1-ARCH trở đi) chỉ được tham chiếu ID (`P1-SCOPE §3.1`, v.v.), không được sao chép lại nội dung invariant.
- Không tạo file `final`, `copy`, `(2)` hoặc bản sao song song của module này.
