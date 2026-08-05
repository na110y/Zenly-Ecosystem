# P1-QA — Testing & Quality Gates

**Phase:** 1 · **Version:** 2.2 · **Owns:** Unit/integration/contract/E2E/security/performance/recovery test, AI golden dataset, coverage, CI/CD gate và failure injection.
**Depends on:** P1-SCOPE, P1-ARCH, P1-PUBLIC, P1-ADMIN, P1-FLOW, P1-DATA, P1-API, P1-SEC, P1-PERF, P1-INFRA

[← P1-ROADMAP](11_IMPLEMENTATION_ROADMAP.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Đây là nguồn canonical cho ngưỡng test mà `CLAUDE.md` (quality gate cấp dự án) và `.claude/rules/testing.md` tham chiếu. Không issue nào được đóng nếu chưa đạt các ngưỡng dưới đây.

## 1. Ngưỡng coverage (khóa cứng)

- **Line coverage ≥ 90%**, **branch coverage ≥ 85%** toàn dự án (đo bằng `vitest run --coverage`).
- **Critical business branch = 100%**, gồm:
  - Toàn bộ state transition tại `P1-FLOW` (Story/Chapter lifecycle, comment moderation, publication fan-out, subscription).
  - Toàn bộ nhánh RBAC/authorization tại `P1-ADMIN §1` và middleware admin/user namespace tại `P1-SEC §6`.
  - Cửa sổ sửa/xóa comment 15 phút (`P1-FLOW §3`).
  - Fail-safe moderation khi provider lỗi (`P1-SEC §5`).
  - Bảo vệ SUPER_ADMIN cuối cùng (`P1-ADMIN §3`).
  - Idempotency của publication outbox và like/comment (`P1-API §5`).
  - Feature flag enforcement phía API (không chỉ UI) cho mọi flag tại `P1-DATA §4`.
- Coverage giảm so với baseline không được chấp nhận để đóng issue — không hạ ngưỡng để "cho qua".

## 2. Loại test bắt buộc theo lớp

| Lớp | Công cụ | Áp dụng cho |
|---|---|---|
| Unit | `vitest` | Pure rule trong use case/domain service (state machine, validation logic) |
| Integration (PostgreSQL thật) | `vitest` + `@testcontainers/postgresql` | Repository, transaction, constraint, concurrency — **không SQLite thay thế trong bất kỳ trường hợp nào** |
| Contract | `vitest` + `msw` (mock provider ngoài) | API route handler shape, provider adapter (email/Web Push/moderation) |
| E2E | `@playwright/test` | Hành trình người dùng xuyên lớp (đăng ký → verify → login → tương tác; admin login TOTP → CMS) |
| Accessibility | `@axe-core/playwright` | Route public chính (`P1-PUBLIC §1`) |
| Mutation | `@stryker-mutator/*` | Domain service critical (state machine, authorization) để xác nhận test thật sự bắt được lỗi, không chỉ chạy qua |
| Property-based (khi hợp lý) | `fast-check` | Validation schema, cursor encode/decode, hàm thuần phức tạp |

## 3. Ma trận kịch bản bắt buộc (áp dụng mọi tính năng có API mutation)

Theo `.claude/rules/testing.md`, mỗi endpoint mutation phải có test cho:

1. Happy path.
2. Validation (thiếu field, sai kiểu, field lạ bị từ chối theo `P1-API §11`).
3. Authorization/ownership (đúng role được phép, role khác bị 403; đúng owner được sửa, người khác bị chặn).
4. State boundary (transition hợp lệ/không hợp lệ theo `P1-FLOW`, ví dụ publish khi đã publish, sửa comment sau 15 phút).
5. Idempotency/retry (gọi lại cùng request/Idempotency-Key không tạo bản ghi trùng).
6. Concurrency (hai request đồng thời tranh chấp cùng tài nguyên — dùng test **điều phối chạy song song thật**, không gọi hàm tuần tự giả lập song song).
7. Provider failure (timeout/429/5xx/malformed response) cho mọi adapter — email, Web Push, automated moderation.
8. Privacy (response không lộ trường cấm tại `P1-SEC §7`).
9. Cache (đúng `Cache-Control` theo `P1-PERF §4`, không cache response session-bound).
10. Logging (không log giá trị nhạy cảm, có `requestId`).

Một test không thể fail khi hành vi bị lỗi (test giả) không được tính là bằng chứng hợp lệ.

## 4. AI golden dataset (automated moderation)

- Bộ dataset chuẩn cho `P1-SEC §5`: tập case rõ ràng nên `APPROVE`, tập case rõ ràng nên `REJECT`, tập case biên (ambiguous) chấp nhận `PENDING`.
- Test golden dataset chạy mỗi khi thay đổi adapter/logic liên quan moderation; không được để pass giả bằng cách mock luôn trả kết quả đúng — phải test qua đúng adapter interface với input thật.
- Test adversarial: input cố ý né automated moderation (biến thể ký tự, chèn khoảng trắng...) — xác nhận hệ thống vẫn fail-safe hoặc bắt được theo chính sách đã định, không claim "diệt tuyệt đối" mọi biến thể.
- Test provider-failure riêng cho moderation (timeout/429/5xx/malformed) xác nhận đúng hành vi `PENDING` fail-safe tại `P1-SEC §5`.

## 5. Security test bắt buộc

Theo `.claude/rules/testing.md`, cho mọi endpoint bảo vệ:

- Gọi trực tiếp API bỏ qua UI (curl-equivalent) cho từng role và từng trạng thái flag (bật/tắt).
- Cross-role access: user session gọi admin API → 401 (không phải 403 gây hiểu nhầm, theo `P1-SEC §6`).
- Ownership bypass: sửa/xóa comment không phải của mình, sửa sau cửa sổ 15 phút.
- Replay: dùng lại token đã `consumedAt` (email verify, password reset, unsubscribe) phải bị từ chối.
- Payload abuse: field lạ, body quá lớn, cursor không hợp lệ.
- Sensitive-field exposure: kiểm tra response JSON không chứa các trường cấm tại `P1-SEC §7` bằng snapshot cấu trúc field, không chỉ đọc mắt.

## 6. Performance & recovery test

- Kiểm tra ngân sách `P1-PERF §1` (LCP/TBT/CLS) trên các route public chính bằng công cụ đo lường tự động trong CI hoặc quy trình thủ công có ghi lại kết quả — không claim đạt ngân sách mà không có số đo.
- Load/soak test trên cấu hình tương đương VPS 2 GB (`P1-I106`) trước go-live, xác nhận không OOM, không rớt kết nối DB dưới tải kỳ vọng.
- Recovery test: mô phỏng backup/restore (`P1-INFRA §4`) thật trên môi trường sạch, xác nhận dữ liệu khôi phục đúng và đầy đủ.
- Rollback drill: mô phỏng deploy lỗi, xác nhận rollback về version trước hoạt động (`P1-INFRA §5`).

## 7. CI/CD quality gate

- Pipeline tối thiểu (`P1-I006`): `format:check`, `lint`, `typecheck`, `test` (với coverage), `check:cycles`, `test:e2e` (ít nhất smoke), build production.
- Không merge/đóng issue khi bất kỳ bước nào đỏ; không dùng `--no-verify` hoặc tắt bước để né lỗi (khớp `CLAUDE.md` cấp dự án).
- Test order-independent: fixture reset xác định, không dựa vào thứ tự chạy hay `sleep` tùy tiện để chờ điều kiện — dùng cơ chế chờ điều kiện tường minh (poll có điều kiện dừng rõ ràng, không sleep cố định để "chắc ăn").

## 8. Định nghĩa "không hợp lệ" cho bằng chứng test

Không được chấp nhận làm bằng chứng hoàn thành:

- Test bị skip/flaky không rõ lý do.
- Snapshot approve hành vi sai (chốt lại bug thành "expected").
- Mock quá rộng khiến test không còn chạm code thật (đặc biệt ở lớp integration/contract).
- Giảm ngưỡng coverage cục bộ để một issue "xanh".
- Comment tường trình dạng "đã test thủ công" thay cho test tự động lặp lại được.

## 9. Ranh giới với module khác

- Nội dung nghiệp vụ cần test: các module tương ứng (P1-FLOW, P1-API, P1-SEC...).
- Tiêu chí nghiệm thu **cấp release** tổng hợp từ kết quả test: `P1-ACCEPT`.
- Trình tự chặng mà mỗi loại test áp dụng: `P1-ROADMAP`.

Module này sở hữu **ngưỡng, loại test và quy tắc bằng chứng hợp lệ** — không định nghĩa lại business rule mà test đó xác minh.
