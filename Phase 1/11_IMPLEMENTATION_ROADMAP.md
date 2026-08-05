# P1-ROADMAP — Implementation Roadmap

**Phase:** 1 · **Version:** 2.2 · **Owns:** Thứ tự code, thời lượng, dependency giữa chặng và Definition of Done ở cấp chặng.
**Depends on:** P1-SCOPE, P1-ARCH, P1-PUBLIC, P1-ADMIN, P1-FLOW, P1-DATA, P1-API, P1-SEC, P1-PERF, P1-INFRA

[← P1-INFRA](10_INFRA_DEPLOY_COST_AND_BACKUP.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là bản đồ trình tự **cấp chặng** (stage), khớp 1-1 với dependency graph tại [P1-WORK §2](16_TRACEABILITY_AND_AI_WORK_PACKAGES.md#2-dependency-graph) và trình tự issue tại [P1-ISSUES](Issues/00_ISSUE_INDEX.md). Không giao nguyên một chặng cho AI code — chặng chỉ dùng để hiểu thứ tự và tránh nghẽn (bắt đầu chặng sau trước khi chặng trước xong dependency bắt buộc).

## 1. Nguyên tắc trình tự

1. Một chặng chỉ bắt đầu khi **toàn bộ chặng nó phụ thuộc** đã đạt Definition of Done cấp chặng (mục 3).
2. Trong một chặng, các issue có thể chạy song song nếu dependency giữa chúng không chồng lấn (xem cột "Depends on" trong [00_ISSUE_INDEX.md](Issues/00_ISSUE_INDEX.md)).
3. Không bỏ qua chặng nền tảng (WP-00) để chạy trước chặng nghiệp vụ — schema/kiến trúc phải ổn định trước khi có API/UI dựa trên nó.
4. Thứ tự dưới đây là thứ tự **thực thi**, không phải thứ tự ưu tiên kinh doanh — thay đổi thứ tự phải cập nhật lại cả bảng này và dependency graph tại P1-WORK.

## 2. Trình tự chặng

| # | Chặng | Issue range | Blocked by | Mục tiêu ra khỏi chặng |
|---|---|---|---|---|
| 1 | WP-00 Foundation | 001–006 | — | Repo Nuxt/Nitro strict TypeScript chạy được; PostgreSQL/Prisma local; error envelope + request context; CI quality gate tối thiểu xanh |
| 2 | WP-01 Identity & Admin Auth | 010–020 | WP-00 | User auth/session/email-verify/reset hoạt động; Admin TOTP bắt buộc; RBAC 3 cấp enforce ở API; System settings/feature flag runtime |
| 3 | WP-02 Stories CMS | 030–039 | WP-00, WP-01 (admin auth) | CRUD truyện/chương, upload cover, bulk import TXT, publish workflow, public story/chapter page, counters |
| 4 | WP-03 Public Stories *(gộp vào WP-02 kết quả cuối)* | — | WP-01, WP-02 | Đã đạt cùng lúc với cuối WP-02 (037–039); không phải chặng issue riêng trong index hiện tại |
| 5 | WP-04 Community | 040–050 | WP-01, WP-02 | Feed, guest/user like, comment/reply + ownership 15 phút, moderation thủ công, abuse guard, posting flag mặc định tắt |
| 6 | WP-06 Notifications & Engagement | 060–068 | WP-01, WP-02, WP-04 (một phần) | Contact capture/consent, story request, subscription email, Web Push, publication fan-out/outbox, cost guard, auto-send toggle |
| 7 | WP-07 Analytics | 070–075 | WP-04 (visitor identity) | Tracking link, attribution, analytics event ghi async, aggregate hằng ngày, dashboard admin |
| 8 | WP-05/08 Hardening | 080–086 | WP-04 (moderation cơ bản), WP-06, WP-07 | Security headers CSRF/CORS/CSP, privacy/copyright export, SEO metadata, robots/sitemap, cache matrix, PWA an toàn, mobile/accessibility budget |
| 9 | WP-08 Infra | 090–094 | Hardening (080, 084) | Production Compose + Caddy TLS, tuning VPS 2GB, health/readiness/rollback, backup 0đ + restore, observability |
| 10 | WP-09 Quality Gate & Go-live | 100–108 | Toàn bộ chặng 1–9 | Test harness PostgreSQL, regression suite theo domain, load/soak VPS 2GB, staging acceptance, production go-live |

Ghi chú: đánh số issue (010, 020, 030...) có khoảng trống để chèn issue mới trong cùng chặng mà không phải đổi số toàn bộ — khớp ghi chú tại `P1-WORK §6`.

## 3. Definition of Done cấp chặng

Một chặng được coi là DONE khi:

1. Mọi issue trong range của chặng có status `DONE` tại [00_ISSUE_INDEX.md](Issues/00_ISSUE_INDEX.md), với evidence template đã điền đầy đủ.
2. Test liên quan (unit/integration/E2E theo `P1-QA`) của toàn chặng chạy xanh trên PostgreSQL thật.
3. Không còn defect P0/P1 mở phát sinh từ issue trong chặng.
4. Global invariant tại `P1-SCOPE §3` liên quan đến chặng đó vẫn được enforce có bằng chứng test (không suy luận từ code review đơn thuần).
5. Chặng kế tiếp phụ thuộc vào chặng này được xác nhận có thể bắt đầu (dependency check theo `.claude/scripts/issue_context.py --next`).

## 4. Rủi ro nghẽn tiến độ đã biết trước

- **WP-01 → WP-02/WP-04:** mọi tính năng cần admin/user auth đều bị chặn tới khi WP-01 xong; ưu tiên xong RBAC + session tách namespace trước khi mở nhiều issue song song ở WP-02.
- **WP-02 → WP-04/WP-06:** publication event (`P1-FLOW §5`) là nền cho cả feed lẫn notification fan-out; không triển khai WP-06 trước khi outbox pattern trong WP-02/WP-04 đã ổn định.
- **WP-07 phụ thuộc visitor identity của WP-04:** không tách WP-07 chạy hoàn toàn độc lập trước WP-04 vì attribution cần `VisitorIdentity`.
- **WP-09 là chặng chốt duy nhất:** không rút gọn/song song hóa quality gate cuối cùng với các chặng trước — nó cần toàn bộ chặng 1–9 đã DONE để có phạm vi regression đầy đủ.

## 5. Ranh giới với module khác

- Nội dung nghiệp vụ/schema/API/security trong mỗi chặng: các module tương ứng (P1-FLOW, P1-DATA, P1-API, P1-SEC...).
- Tiêu chí nghiệm thu chi tiết cấp release (không phải cấp chặng): `P1-ACCEPT`.
- Danh sách issue atomic thật sự để giao cho AI: `P1-ISSUES`.

Module này chỉ sở hữu **trình tự và điều kiện chuyển chặng** — không định nghĩa lại nội dung từng issue.
