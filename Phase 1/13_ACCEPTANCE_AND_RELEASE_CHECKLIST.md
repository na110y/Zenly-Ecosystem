# P1-ACCEPT — Acceptance & Release Checklist

**Phase:** 1 · **Version:** 2.2 · **Owns:** Tiêu chí nghiệm thu public/admin/kỹ thuật và release gate cuối cùng.
**Depends on:** [P1-ROADMAP](11_IMPLEMENTATION_ROADMAP.md), [P1-QA](12_TESTING_AND_QUALITY_GATES.md)

[← P1-QA](12_TESTING_AND_QUALITY_GATES.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là checklist nghiệm thu **cấp release** (khác với Definition of Done cấp chặng tại `P1-ROADMAP §3` và Definition of Ready/Done cấp issue tại `P1-ISSUES`). Phase 1 chỉ được coi là go-live khi toàn bộ mục dưới đây có bằng chứng, không phải khi "cảm thấy đã xong".

## 1. Nghiệm thu Public

- [ ] Kho truyện, chi tiết truyện, trang đọc chương hoạt động đúng SSR, đúng trạng thái publish (`P1-PUBLIC §3–4`).
- [ ] CTA nghe YouTube hiển thị đúng điều kiện, fallback khi thiếu link.
- [ ] Feed cộng đồng: like/comment/reply guest và user hoạt động, ownership 15 phút enforce đúng ở API.
- [ ] User posting ẩn hoàn toàn khi flag tắt (UI lẫn API 403), hiện đúng khi flag bật.
- [ ] Yêu cầu truyện gửi được, contact capture ghi consent ledger.
- [ ] Đăng ký/đăng nhập/quên-đặt-lại mật khẩu user hoạt động đầy đủ, không lộ thông tin tồn tại tài khoản qua thông điệp lỗi.
- [ ] Subscription email (double opt-in) và Web Push opt-in hoạt động; unsubscribe không cần đăng nhập.
- [ ] Toàn bộ route public đạt 5 trạng thái bắt buộc (loading/empty/error/forbidden/success) theo `P1-PUBLIC §2`.
- [ ] Accessibility: keyboard navigation, focus visible, contrast đạt chuẩn trên route chính (`P1-PUBLIC §12`).

## 2. Nghiệm thu Admin/CMS

- [ ] Đăng nhập admin bắt buộc TOTP, không có đường vòng bỏ qua bước 2.
- [ ] RBAC 3 cấp enforce đúng: ADMIN không truy cập được System UI/API; USER không truy cập được bất kỳ admin API nào.
- [ ] Không thể xóa/hạ quyền SUPER_ADMIN cuối cùng (test trực tiếp API, không chỉ UI).
- [ ] CRUD truyện/chương, upload cover, bulk import TXT (preview, resume, cancel) hoạt động đúng theo `P1-FLOW §1`.
- [ ] Publish tạo đúng publication event, không tạo trùng khi gọi lại (idempotent).
- [ ] Hàng đợi moderation hiển thị đúng nội dung `PENDING`/flagged; admin duyệt/từ chối thủ công hoạt động.
- [ ] Feature flag và System settings: chỉ SUPER_ADMIN sửa được các mục infra-sensitive/auto-send; có audit log; optimistic concurrency chặn ghi đè race.
- [ ] Auto-send tắt không chặn thông báo account/security/direct request; bật lại không xả backlog (test trực tiếp, có bằng chứng dữ liệu).
- [ ] Abuse Guard: block/clear chỉ SUPER_ADMIN thao tác được, có audit log lý do.
- [ ] Dashboard analytics hiển thị đúng số liệu aggregate, không truy vấn nặng chặn request.

## 3. Nghiệm thu Kỹ thuật

- [ ] Coverage ≥ 90% line / ≥ 85% branch toàn dự án; 100% cho nhánh critical liệt kê tại `P1-QA §1`.
- [ ] Toàn bộ ma trận kịch bản bắt buộc (`P1-QA §3`) có test cho mọi endpoint mutation đã triển khai.
- [ ] Security test (`P1-QA §5`) pass: cross-role 401/403 đúng mã, ownership bypass bị chặn, replay token bị từ chối, payload abuse bị từ chối, không lộ trường nhạy cảm.
- [ ] Automated moderation: golden dataset + adversarial + provider-failure test pass, fail-safe `PENDING` xác nhận bằng test thật (không mock luôn thành công).
- [ ] Performance: LCP ≤ 2.5s, TBT ≤ 200ms, CLS = 0 đo được trên route public chính (4G mobile mô phỏng).
- [ ] Load/soak test trên cấu hình tương đương VPS 2 GB không OOM, không rớt kết nối DB dưới tải kỳ vọng.
- [ ] Backup chạy được tự động, restore đã diễn tập thành công trên môi trường sạch.
- [ ] Rollback drill: deploy lỗi giả lập, rollback về version trước thành công.
- [ ] Health/readiness endpoint hoạt động đúng, migration chạy tách biệt khỏi traffic serving.
- [ ] Không secret/PII/cache leakage: rà soát log và response API không chứa trường cấm tại `P1-SEC §7`.
- [ ] Không có defect P0/P1 mở.
- [ ] Không có test bị skip/flaky không rõ lý do trong pipeline CI.

## 4. Release gate cuối cùng

Phase 1 chỉ go-live khi:

1. Mục 1, 2, 3 ở trên **đều đã tick** với bằng chứng cụ thể (link test run, số liệu đo, log audit) — không chấp nhận "đã làm" bằng lời khẳng định suông.
2. Staging acceptance (`P1-I107`) đã chạy migration rehearsal từ schema production trước đó (hoặc từ trạng thái tương đương) thành công.
3. Production go-live runbook (`P1-I108`) đã được review, có bước rollback rõ ràng.
4. SUPER_ADMIN xác nhận thủ công các feature flag ở trạng thái seed đúng theo `P1-SCOPE §3.2/§3.5` (posting/report tắt, auto-send theo quyết định vận hành tại thời điểm launch).

## 5. Ranh giới với module khác

- Nội dung chi tiết từng hạng mục: module tương ứng (P1-PUBLIC, P1-ADMIN, P1-QA, P1-INFRA...).
- Trình tự chặng để đạt các mục trên: `P1-ROADMAP`.

Module này chỉ tổng hợp **tiêu chí nghiệm thu cuối cùng** — không định nghĩa lại chi tiết kỹ thuật đằng sau mỗi mục.
