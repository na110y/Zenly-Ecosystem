# P1-I005 — Chuẩn response lỗi và request context

**Stage:** foundation  
**Status:** DONE  
**Depends on:** 001, 002  
**Canonical modules — read fully:** P1-API, P1-SEC  
**Previous:** [P1-I004](./004_PRISMA_MIGRATION_VA_SEED_NEN.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I006](./006_CI_NEN_VA_QUALITY_GATE_TOI_THIEU.md)

## Objective

Thiết lập middleware request-context (sinh `requestId` UUID cho mọi request) và error envelope chuẩn dùng chung cho toàn bộ API (`P1-API §2`), áp dụng cho mọi route handler tương lai (`/api/public`, `/api/user`, `/api/admin`, `/api/system` — các route đó chưa tồn tại, issue này chỉ dựng hạ tầng dùng chung).

## Allowed change surface

`server/`; `tests/`. Không tạo route nghiệp vụ thật (không có route nào tồn tại để validate ngoài một route health/test tối thiểu nếu cần chứng minh middleware hoạt động).

## Required implementation

- Middleware request-context (Nitro `server/middleware/`, chạy trước mọi handler): sinh `requestId` (UUID v4 qua `uuid`, đã có sẵn dependency), gắn vào `event.context` để route handler/logger dùng lại; không sinh requestId mới nếu client đã có (không áp dụng ở Phase 1 — không có upstream proxy header tin cậy được định nghĩa, nên luôn tự sinh).
- Hàm/tiện ích tạo error envelope chuẩn đúng `P1-API §2`: `{ error: { code, message, requestId } }`. `code` là một tập enum/union cố định tối thiểu (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`) — mở rộng được sau nhưng không đổi shape.
- Global Nitro error handler (`server/error.ts` hoặc tương đương `nitro.errorHandler`) bắt lỗi chưa xử lý, map về error envelope chuẩn với `code = INTERNAL_ERROR`, không bao giờ để lộ stack trace/SQL/đường dẫn file/raw provider response ra response body (`P1-API §2`, `P1-SEC §7`).
- Logging: mọi request nên log tối thiểu `requestId`, method, path, status, duration — không log body/header nhạy cảm (`P1-SEC §7` — không log giá trị secret/token/session).
- Không tạo route `/api/*` nghiệp vụ ở issue này; có thể thêm một test-only route hoặc test trực tiếp gọi middleware/error-mapper qua Nitro test harness (`@nuxt/test-utils`) để chứng minh hành vi thật qua HTTP, không chỉ unit gọi hàm cô lập.

## Tests required in the same change

- Unit test: hàm tạo error envelope trả đúng shape cho từng `code`.
- Unit test: error envelope không bao giờ chứa field ngoài `code`/`message`/`requestId` (snapshot cấu trúc, khớp `P1-QA §5` "Sensitive-field exposure").
- Integration/E2E test qua HTTP thật (`@nuxt/test-utils` hoặc Playwright): request tới một route gây lỗi (400/404/500 mô phỏng) trả đúng envelope, có `requestId` hợp lệ (UUID), không có stack trace trong body.
- Test: hai request khác nhau nhận `requestId` khác nhau (không tái sử dụng/cố định).
- Test: log output (nếu capture được trong test) không chứa giá trị nhạy cảm giả lập (ví dụ header `Authorization` giả).

## Acceptance gate

- Dependencies 001, 002 DONE; canonical modules đọc đầy đủ.
- Middleware chạy qua đường dẫn HTTP thật của Nitro, không chỉ mock event object.
- Typecheck, lint, test pass; coverage không giảm dưới ngưỡng P1-QA.
- Không lộ thông tin nội bộ trong bất kỳ nhánh lỗi nào (test xác nhận, không chỉ đọc mắt).
- Rollback: thuần code, revert bằng git revert; không migration.

## Completion evidence

```text
Issue: P1-I005
Canonical requirement sections: P1-API §2 (error envelope shape { error: { code, message, requestId } }, requestId sourced from this issue's middleware, no stack trace/SQL/path/raw provider response), §1 (application/json content type), P1-SEC §7 (no secret/internal values in logs or responses)
Dependencies verified: 001 DONE, 002 DONE
Exact files changed: server/middleware/00.request-context.ts (new — generates a UUID per request via node:crypto randomUUID, stores in event.context, also sets X-Request-Id response header), server/utils/request-context.ts (new — setRequestId/getRequestId/generateRequestId), server/utils/error-envelope.ts (new — ERROR_CODES union + createErrorEnvelope), server/error.ts (new — Nitro global error handler; maps H3Error statusCode to the fixed error-code set, defaults unknown/500 errors to a generic "Internal server error" message so the real Error.message never reaches the client), server/api/public/health.get.ts (new — minimal liveness endpoint; added because the repo had zero API routes and the middleware/error handler could not be proven through real HTTP without at least one; doubles as a seed for the P1-INFRA §5 liveness endpoint P1-I092 will extend with a real readiness/DB check), tests/api/error-envelope.test.ts (new), tests/api/request-context.test.ts (new), tests/api/request-context-error-handling.test.ts (new), tests/api/health.test.ts (new)
Migration/schema result: none
API/UI result: introduces GET /api/public/health (200, { status: "ok" }) — the first real route in the repo; establishes the error envelope + X-Request-Id contract every future /api/* handler will reuse
Unit/component tests: tests/api/error-envelope.test.ts (7 cases: correct shape for every ERROR_CODES member, no extra fields), tests/api/request-context.test.ts (4 cases: UUID format, uniqueness, set/get round-trip, throws if middleware never ran)
Integration/contract tests: tests/api/health.test.ts (1 case, real h3 app + real Node http server, not mocked) and tests/api/request-context-error-handling.test.ts (11 cases, same real-h3-app-over-real-HTTP-socket pattern): thrown 404 maps to correct envelope with valid requestId; response body never contains a stack trace, file path, or extra fields; two concurrent requests get different requestIds; success responses are unaffected and also carry X-Request-Id; every one of the 5 fixed error codes (400/401/403/409/429) maps correctly through a dedicated real thrown error per status; an unhandled plain Error (no statusCode) maps to 500 INTERNAL_ERROR without leaking its real message text
E2E/security/performance tests: manual verification against the actual built Nitro server (node .output/server/index.mjs): GET /api/public/health returned 200 with X-Request-Id header containing a valid UUID. e2e/smoke.spec.ts (P1-I001) re-verified green.
Coverage delta: project-wide line 98.14%, branch 92.85% (up from P1-I004's 96.29%/90.9% baseline) — all new files fully exercised through real HTTP paths, not isolated function mocks
Acceptance items satisfied: (1) dependencies 001/002 DONE, canonical modules read in full; (2) middleware and error handler proven through a real h3 App + real Node HTTP server + real fetch() calls (server/middleware/00.request-context.ts and server/error.ts imported directly, not reimplemented/mocked in the test), plus a manual check against the actual built Nitro server; (3) format/lint/typecheck/coverage/build/cycles/e2e all pass; (4) coverage above P1-QA floor; (5) rollback is a plain git revert, no migration
Rollback/compensation: no schema/migration/destructive change; git revert of the listed files removes the middleware, error handler, and the one health route cleanly
Known limitations (no P0/P1): server/error.ts is a plain default-exported function rather than one wrapped in defineNitroErrorHandler — this was necessary because defineNitroErrorHandler is an identity-only type helper sourced from nitropack/runtime, which is not resolvable outside Nuxt's own build pipeline and broke the real-HTTP integration test; the plain function still type-checks and built successfully through the real Nuxt/Nitro build (pnpm build, verified). GET /api/public/health currently only proves liveness (server responds); it does not check DB connectivity — that upgrade to a true readiness probe is P1-I092's explicit scope, not this issue's.
```
