# P1-I017 — Đăng nhập Admin bắt buộc TOTP

**Stage:** identity  
**Status:** DONE  
**Depends on:** 016, 005  
**Canonical modules — read fully:** P1-ADMIN, P1-FLOW, P1-API, P1-SEC  
**Previous:** [P1-I016](./016_THIET_LAP_TOTP_LAN_DAU.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I018](./018_RBAC_MIDDLEWARE_VA_MENU_THEO_ROLE.md)

## Objective

Hoàn tất đăng nhập admin theo `P1-ADMIN §2`/`P1-API §9`: `POST /api/admin/login/totp` — bước 2 của luồng login, nhận mã TOTP 6 số, xác minh với secret đã kích hoạt (từ `P1-I016`), và set `AdminSession.totpVerifiedAt` để hoàn tất phiên. Trước khi bước này hoàn tất, session tạo ở `P1-I016` (bước 1, chỉ password) vẫn ở trạng thái `totpVerifiedAt = NULL` — **chưa hoàn tất TOTP nghĩa là chưa đăng nhập**, theo đúng nguyên tắc `P1-API §8` (`403` nếu chưa hoàn tất TOTP dù đã có session). Issue này cũng bổ sung enforcement chung cho `/api/admin/*`: mọi route ngoài `/api/admin/login`, `/api/admin/login/totp`, `/api/admin/totp/setup`, `/api/admin/totp/activate` phải từ chối truy cập nếu `totpVerifiedAt IS NULL`.

**Vì sao issue này không lặp lại bước 1:** `POST /api/admin/login` (password only, tạo `AdminSession` với `totpVerifiedAt = NULL`) và middleware admin session (đọc cookie `AdminSession`, gắn `event.context.admin`) đã được triển khai đầy đủ ở `P1-I016` để giải quyết vòng phụ thuộc thứ tự issue (`/totp/setup`/`/totp/activate` cần admin đã có session trước khi có TOTP để hoàn tất session). Issue này chỉ thêm bước 2 và enforcement `totpVerifiedAt` cho các route admin khác.

## Allowed change surface

`server/admin/`; `server/api/admin/login/totp.post.ts`; `server/middleware/` (admin session enforcement bổ sung); `tests/`. Không sửa `POST /api/admin/login` bước 1 hay `/totp/setup`/`/totp/activate` (đã đúng theo `P1-I016`, chỉ đọc lại để tái sử dụng).

## Required implementation

- `POST /api/admin/login/totp`: yêu cầu `event.context.admin` tồn tại (từ middleware `P1-I016`) và `totpVerifiedAt` hiện tại còn `NULL` (nếu đã set → coi như đã hoàn tất, trả lỗi hợp lý thay vì set lại). Nhận mã TOTP 6 số qua DTO strict (`zod`), giải mã secret đã lưu (`AdminTotpCredential.secretEncrypted`, phải đã `activatedAt` — nếu chưa activate thì chưa thể hoàn tất login, trả lỗi rõ ràng), verify bằng `otpauth` (tái dùng logic verify từ `activate-totp` ở mức thuật toán, không phải cùng use case vì ngữ nghĩa khác — activate kích hoạt credential, login-totp chỉ xác minh phiên). Mã đúng → `UPDATE AdminSession SET totpVerifiedAt = now() WHERE id = <session hiện tại>`. Mã sai → `401`, không set `totpVerifiedAt`, không tiết lộ thêm thông tin.
- Middleware/guard enforcement cho `/api/admin/*` (trừ 4 route bootstrap ở trên): sau khi `resolveAdminSessionMiddleware` (từ `P1-I016`) gắn `event.context.admin`, các route admin nghiệp vụ (ví dụ các route sẽ thêm ở issue sau — `P1-I018` RBAC trở đi) phải kiểm tra `event.context.admin.totpVerifiedAt !== null` trước khi cho qua, theo đúng bảng `P1-API §8`: `401` nếu thiếu/hết hạn session, `403` nếu có session nhưng chưa hoàn tất TOTP. Vì issue này là issue **đầu tiên** thêm business route admin thật sự ngoài auth bootstrap, cách triển khai hợp lý nhất là một guard dùng chung (`requireVerifiedAdmin(event)` hoặc tương đương trong `server/admin/`) mà các route admin nghiệp vụ tương lai (`P1-I018` trở đi) gọi tại đầu handler — không đặt trong middleware toàn cục vì 4 route bootstrap ở trên cố ý cần được phép đi qua dù `totpVerifiedAt` còn `NULL`.
- Không đổi cookie/tên session — vẫn `AdminSession`, vẫn tách biệt hoàn toàn khỏi `UserSession`.
- Không triển khai rate-limit/lockout cho login admin ở issue này — thuộc `P1-I080` (`Security headers CSRF CORS và CSP`, phụ thuộc issue này) theo đúng `P1-SEC §3` (ngưỡng rate-limit là invariant chung, triển khai cụ thể ở issue hardening riêng, không lặp lại ở từng issue auth).

## Tests required in the same change

- Unit: `login-admin-totp` (hoặc tên use case tương đương) — mã đúng set `totpVerifiedAt`; mã sai không set, trả lỗi; session đã `totpVerifiedAt` set rồi thì từ chối set lại; credential chưa `activatedAt` thì từ chối hoàn tất login.
- Unit: guard `requireVerifiedAdmin` — cho qua khi `totpVerifiedAt` đã set; chặn khi `NULL`; chặn khi không có `event.context.admin`.
- Integration PostgreSQL thật: toàn bộ flow — bootstrap SUPER_ADMIN (`P1-I015`) → login bước 1 (`P1-I016`) → setup + activate TOTP (`P1-I016`) → login bước 2 (issue này) set đúng `totpVerifiedAt` qua DB thật; mã sai ở bước 2 không set `totpVerifiedAt`.
- Security test: gọi trực tiếp API bỏ qua bước 2 — một route admin nghiệp vụ giả lập dùng `requireVerifiedAdmin` phải trả `403` nếu chỉ có session bước 1 (`totpVerifiedAt` còn `NULL`); `401` nếu không có session; `UserSession` không bao giờ được chấp nhận.
- Test: 4 route bootstrap (`login`, `login/totp`, `totp/setup`, `totp/activate`) không bị chặn bởi `requireVerifiedAdmin` (chúng không gọi guard này, hoặc gọi guard khác phù hợp ngữ nghĩa riêng).

## Acceptance gate

- Dependencies 016, 005 DONE; canonical modules đọc đầy đủ.
- Đường dẫn thật login bước 1 → TOTP setup/activate → login bước 2 hoạt động qua PostgreSQL thật.
- Typecheck, lint, unit/integration/security test pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh mã đúng/sai ở bước 2 và guard `totpVerifiedAt` đạt 100%.
- Không lộ secret/token qua response hay log.
- Rollback: thuần code, không migration mới (dùng schema đã có từ `P1-I015`).

## Completion evidence

```text
Issue: P1-I017
Canonical requirement sections: P1-ADMIN §2 (admin login requires password + completed TOTP challenge in the same session; incomplete TOTP = not logged in), P1-API §1/§8/§9 (admin route table, "totpVerifiedAt IS NOT NULL" enforcement row for /api/admin/*, POST /api/admin/login/totp endpoint listed), P1-SEC §2 (session cookie namespace separation, unchanged by this issue), §3 (rate-limit for admin login is a general invariant, concrete implementation explicitly deferred to P1-I080 per the issue index dependency 005/012/017 -> 080).
Dependencies verified: P1-I016 Status: DONE, P1-I005 Status: DONE (both confirmed via issue_context.py 017 — Ready: YES).
Exact files changed:
  - Phase 1/Issues/017_DANG_NHAP_ADMIN_BAT_BUOC_TOTP.md (new — this issue's own file did not exist in the repo despite being referenced by 00_ISSUE_INDEX.md and P1-I016's "Next" link; drafted following the same structure as 001-016 before implementation, per explicit user decision)
  - Phase 1/Issues/00_ISSUE_INDEX.md (status TODO -> IN_PROGRESS -> DONE for row 017)
  - server/admin/use-cases/verify-admin-login-totp.ts (new — login step 2: resolves the AdminSession by token hash directly, validates revoked/expired/already-verified/not-activated states, verifies the TOTP code, sets totpVerifiedAt)
  - server/admin/require-verified-admin.ts (new — guard for future business admin routes: 401 if no event.context.admin, 403 if totpVerifiedAt is NULL, otherwise returns the context)
  - server/admin/repository/admin-repository.ts (extended — added findAdminSessionById and markAdminSessionTotpVerified)
  - server/admin/dto/auth.ts (extended — added adminLoginTotpBodySchema, strict 6-digit code)
  - server/admin/handlers/login-totp-handler.ts (new — reads AdminSession cookie directly since this route runs before totpVerifiedAt exists, no dependency on event.context.admin)
  - server/api/admin/login/totp.post.ts (new route)
  - tests/admin/verify-admin-login-totp.test.ts (new, 9 tests)
  - tests/admin/require-verified-admin.test.ts (new, 3 tests)
  - tests/admin/login-totp-handler.test.ts (new, 7 tests, real h3+HTTP)
  - tests/admin/require-verified-admin-route.test.ts (new, 4 tests, real h3+HTTP, cross-namespace security)
  - tests/prisma/admin-login-totp-flow.test.ts (new, 3 tests, real PostgreSQL)
Migration/schema result: No new migration — AdminSession.totpVerifiedAt (nullable Timestamptz) already exists from P1-I015's schema; this issue only writes to it.
API/UI result:
  - POST /api/admin/login/totp: requires the AdminSession cookie (read directly, not via event.context.admin, since totpVerifiedAt does not exist yet at this point in the flow); 401 if cookie missing or session unknown/revoked/expired; 409 if totpVerifiedAt is already set (idempotency guard — cannot re-verify a completed session) or if no TOTP credential has been activated yet (defensive: this state should not normally be reachable once P1-I016's setup/activate flow is followed, but the check exists rather than silently succeeding); 401 with a generic message for an incorrect code (does not reveal whether the credential exists); 200 and sets totpVerifiedAt on success. No new UI added — the existing app/pages/system/totp-setup.vue (P1-I016) already ends its flow before this step; a full multi-step admin login UI is out of this issue's scope per its Allowed change surface (server/admin/, server/api/admin/login/totp.post.ts, middleware, tests only — no app/pages/ listed).
  - requireVerifiedAdmin(event) guard added in server/admin/ for the business admin routes that P1-I018 (RBAC) and beyond will introduce; verified via a real h3 route in tests that it returns 401 with no context, 403 with an incomplete (step-1-only) session, and 200 with a fully verified session — and that a UserSession cookie is still never accepted (401), proving cross-namespace isolation continues to hold when this guard is layered on top of the existing middleware from P1-I016.
Unit/component tests:
  - tests/admin/verify-admin-login-totp.test.ts (9): correct code verifies; incorrect code rejected (no verification); unknown token; revoked session; expired session; already-verified session; no credential found; credential not yet activated.
  - tests/admin/require-verified-admin.test.ts (3): returns context when verified; 401 with no context; 403 with unverified context.
Integration/contract tests:
  - tests/admin/login-totp-handler.test.ts (7, real h3+HTTP): 401 no cookie, 200 correct code, 401 incorrect code (no verification side effect), 409 already verified, 400 malformed payload, 401 cookie present but unknown session, 409 credential not activated.
  - tests/admin/require-verified-admin-route.test.ts (4, real h3+HTTP, layered on the P1-I016 middleware): 401 no cookie, 403 step-1-only session, 200 fully verified session, 401 for a UserSession cookie (never accepted by the admin guard).
E2E/security/performance tests:
  - tests/prisma/admin-login-totp-flow.test.ts (3, real PostgreSQL via testcontainers): full flow (bootstrap admin -> setup+activate TOTP -> login step 1 -> login step 2) verified against real DB state, confirming totpVerifiedAt transitions from NULL to set; incorrect code at step 2 leaves totpVerifiedAt NULL in the database; a second verification attempt on an already-verified session is rejected.
  - Security assertions: generic 401 on incorrect TOTP code (no information leak about credential existence); UserSession cookie never accepted by the admin guard route (tests/admin/require-verified-admin-route.test.ts); no secret/token/passwordHash in any response body (consistent with P1-I016's established pattern, unchanged handlers reused).
  - No dedicated Playwright E2E spec: same rationale as P1-I016 — the real-h3-HTTP handler tests plus the real-PostgreSQL full-flow test already exercise the complete request/response contract and real DB state end-to-end for this issue's scope.
Coverage delta: Full suite 292/292 passing (up from 267 after P1-I016). Overall coverage 94.66% lines / 92.69% branches / 84.8% functions — above the P1-QA minimum (90% line / 85% branch). verify-admin-login-totp.ts and require-verified-admin.ts are both at 100% line coverage; the correct/incorrect-code and verified/unverified branches are covered by both unit and real-HTTP tests.
Acceptance items satisfied:
  - Dependencies 016/005 DONE; canonical modules (P1-ADMIN, P1-FLOW, P1-API, P1-SEC) read fully; issue_context.py 017 confirmed Ready: YES before implementation.
  - Real login-step-1 -> TOTP-activate -> login-step-2 path verified via real-PostgreSQL integration test.
  - Typecheck, lint, format, full test suite (test:coverage), build, and check:cycles all pass with exit code 0.
  - Coverage above P1-QA thresholds; verify/guard branches at 100%.
  - No secret/token exposed via any API response; validate_phase_docs.py shows no new P1-I016/P1-I017 mismatches after the status updates (pre-existing errors for unrelated future issues 017-108 predate this change and are out of scope).
Rollback/compensation: Pure code change, no new migration (reuses P1-I015's AdminSession.totpVerifiedAt column as-is). Rollback is a plain revert of the listed files; no data migration or compensation needed.
Known limitations (no P0/P1):
  - Rate-limiting/lockout/CAPTCHA for repeated admin login or TOTP attempts is explicitly NOT implemented here — P1-SEC §3 specifies the threshold table as a general cross-cutting invariant, and the issue index places its concrete implementation at P1-I080 (Security headers CSRF CORS và CSP), which depends on this issue (005, 012, 017) rather than the reverse. Implementing it here would exceed this issue's allowed change surface.
  - requireVerifiedAdmin is implemented and tested against a synthetic route in this issue's own test suite, but is not yet wired into any real business admin route — no such route exists yet. The first real consumer will be P1-I018 (RBAC middleware và menu theo role) and subsequent admin CMS issues.
  - No admin-login UI beyond the existing P1-I016 totp-setup page was added; a full "enter TOTP code to complete login" UI screen for already-activated admins is left for a future admin-UI issue, since this issue's allowed change surface does not include app/pages/.
```
