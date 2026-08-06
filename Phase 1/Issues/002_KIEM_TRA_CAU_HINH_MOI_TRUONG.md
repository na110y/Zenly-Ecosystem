# P1-I002 — Kiểm tra cấu hình môi trường

**Stage:** foundation  
**Status:** DONE  
**Depends on:** 001  
**Canonical modules — read fully:** P1-ARCH, P1-SEC, P1-INFRA  
**Previous:** [P1-I001](./001_KHOI_TAO_NUXT_NITRO_STRICT.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I003](./003_DOCKER_LOCAL_VOI_POSTGRESQL.md)

## Objective

Validate toàn bộ biến môi trường bắt buộc lúc khởi động Nitro theo `P1-INFRA §2`: `DATABASE_URL`, `NUXT_SESSION_SECRET`, `NUXT_DATA_ENCRYPTION_KEY`, `NUXT_VISITOR_HMAC_KEY`, `NUXT_TOTP_ENCRYPTION_KEY`. Thiếu biến hoặc giá trị placeholder dạng dev (`change_me`, `dev_*`, rỗng) phải chặn khởi động server, không được chạy ngầm với giá trị không an toàn.

## Allowed change surface

`server/`; `nuxt.config.ts`; `.env.example`; `tests/`. Không tạo module nghiệp vụ (auth, story, comment...). Chỉ validate cấu hình runtime.

## Required implementation

- Một module validate env (ví dụ `server/env/` hoặc `server/utils/env.ts`) dùng `zod` để parse `process.env`/`runtimeConfig`, chạy tại thời điểm khởi động Nitro (plugin hoặc `nitro:init`), không phải lazy trong từng request.
- Kiểm tra độ dài tối thiểu cho các key bí mật (≥ 32 byte theo `P1-INFRA §2`) và biến bắt buộc không được rỗng — áp dụng ở mọi môi trường.
- Khi `NODE_ENV=production`: bổ sung kiểm tra từ chối giá trị khớp pattern placeholder dev (`change_me`, `dev_`, `replace_with_*`) theo đúng câu chữ `P1-INFRA §2` ("không được có giá trị mặc định kiểu change_me/dev_* khi lên production"). Không áp dụng rule này cho development/test vì `.env` dev hợp lệ hiện tại cố ý dùng giá trị dạng `dev_*`.
- Khi validate thất bại: log lỗi rõ ràng liệt kê tên biến thiếu/không hợp lệ (không log giá trị thật của secret — khớp `P1-SEC §7`), sau đó server dừng khởi động (throw/exit), không phục vụ request nào.
- `.env.example` giữ nguyên danh sách placeholder đã có tại `P1-ARCH`/setup; không thêm secret thật.
- Không thêm dependency mới ngoài `zod` (đã có sẵn trong `package.json`).

## Tests required in the same change

- Unit test: validate module chấp nhận bộ env hợp lệ đầy đủ.
- Unit test: validate module từ chối khi thiếu từng biến bắt buộc (test riêng cho mỗi biến bắt buộc — happy path + từng trường hợp thiếu).
- Unit test: từ chối khi rỗng hoặc ngắn hơn 32 byte cho các key mã hóa (mọi môi trường).
- Unit test: khi `NODE_ENV=production`, từ chối giá trị placeholder dev (`change_me`, `dev_*`); khi `NODE_ENV=development`/`test`, cùng giá trị đó được chấp nhận (miễn đủ độ dài).
- Unit test: xác nhận thông báo lỗi không chứa giá trị secret thật (privacy — không lộ trường cấm).
- Regression: `pnpm build` và smoke server-start (kế thừa từ P1-I001) vẫn phải pass với `.env` hợp lệ hiện có trong môi trường dev.

## Acceptance gate

- Tất cả dependency (001) đã DONE; canonical modules đã đọc đầy đủ.
- Validate chạy qua đường dẫn khởi động Nitro thật (không chỉ unit test gọi hàm cô lập).
- Typecheck, lint, unit test pass; coverage không giảm dưới ngưỡng P1-QA.
- Không log giá trị secret thật trong bất kỳ nhánh lỗi nào.
- Rollback: thay đổi thuần code + test, không có migration; revert bằng git revert nếu cần.

## Completion evidence

```text
Issue: P1-I002
Canonical requirement sections: P1-INFRA §2 (required env vars, 32-byte minimum, production placeholder rejection), P1-SEC §7 (no secret values in logs/errors), P1-ARCH §4 (thin route/plugin layering)
Dependencies verified: 001 DONE
Exact files changed: server/env/schema.ts (new), server/env/validate.ts (new), server/env/bootstrap.ts (new), server/plugins/00.env-validate.ts (new), tests/env/validate.test.ts (new), tests/env/bootstrap.test.ts (new), .env.example (placeholder values lengthened to >=32 bytes to match P1-INFRA §2), server/.gitkeep removed (dir no longer empty)
Migration/schema result: none
API/UI result: none
Unit/component tests: tests/env/validate.test.ts (17 cases: happy path, missing-per-field, too-short-per-field, dev placeholder accepted in dev, dev placeholder rejected in production per-field, change_me DATABASE_URL accepted in dev / rejected in production, fully valid production env accepted, error message never contains secret value), tests/env/bootstrap.test.ts (2 cases: real process.env valid path does not throw, invalid path throws and logs field name without secret value)
Integration/contract tests: not applicable at this layer (no repository/provider code yet)
E2E/security/performance tests: manual boot smoke against the real built Nitro server (node .output/server/index.mjs) — negative case: existing repo .env has NUXT_VISITOR_HMAC_KEY at 20 bytes, server correctly refused to boot with EnvValidationError naming only the field, no secret value in output; positive case: env with all values >=32 bytes booted successfully and served HTTP 200 on a probe port. e2e/smoke.spec.ts (from P1-I001) re-verified green after the change (2 passed).
Coverage delta: project-wide line 96.29%, branch 90.9%, functions 85.71% (was 100/100/100 on 0 statements at P1-I001 baseline since no business code existed yet) — both above P1-QA §1 floor (90% line / 85% branch)
Acceptance items satisfied: (1) dependency 001 DONE, canonical modules read in full; (2) validated through the real Nitro startup path (server/plugins/00.env-validate.ts -> bootstrapEnv -> validateEnv), proven via actual server boot, not only isolated unit calls; (3) format/lint/typecheck/test:coverage/build/check:cycles/test:e2e all pass; (4) coverage above P1-QA floor; (5) rollback is a plain git revert, no migration/destructive state
Rollback/compensation: no schema/migration/destructive change; revert via git revert of the listed files restores prior (no-validation) behavior
Known limitations (no P0/P1): the repository's local .env has NUXT_VISITOR_HMAC_KEY under the 32-byte floor and will fail to boot until the user updates it (flagged to user directly, not silently edited per "never edit .env" rule — this is expected-correct behavior of the new validation, not a defect in the issue's implementation)
```
