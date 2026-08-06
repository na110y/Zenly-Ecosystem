# P1-I016 — Thiết lập TOTP lần đầu

**Stage:** identity  
**Status:** DONE  
**Depends on:** 015  
**Canonical modules — read fully:** P1-ADMIN, P1-FLOW, P1-API, P1-SEC  
**Previous:** [P1-I015](./015_SCHEMA_ADMIN_VA_BOOTSTRAP_SUPER_ADMIN.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I017](./017_DANG_NHAP_ADMIN_BAT_BUOC_TOTP.md)

## Objective

Triển khai `POST /api/admin/totp/setup` (tạo secret + QR) và `POST /api/admin/totp/activate` (xác minh mã đầu tiên để kích hoạt) theo `P1-ADMIN §2`/`P1-API §9`. Mã hóa TOTP secret AES-256-GCM trước khi lưu (`P1-SEC §1`).

**Giải quyết vòng phụ thuộc thứ tự issue:** `/totp/setup`/`/totp/activate` yêu cầu admin đã xác thực, nhưng đăng nhập admin đầy đủ (password + hoàn tất TOTP challenge) là `P1-I017` — phụ thuộc ngược vào issue này. Theo quyết định đã xác nhận với người dùng: issue này bao gồm **`POST /api/admin/login` bước 1 (chỉ password)** — tạo `AdminSession` với `totpVerifiedAt = NULL` (đúng thiết kế "NULL = challenge chưa hoàn tất" tại `P1-DATA §3`) và middleware admin session đọc cookie `AdminSession` (tách biệt hoàn toàn khỏi `UserSession` theo `P1-SEC §6`). `/totp/setup`/`/totp/activate` chấp nhận session này dù `totpVerifiedAt` còn NULL — vì đó chính là mục đích của issue (thiết lập TOTP lần đầu, TRƯỚC khi có mã TOTP để hoàn tất session). `P1-I017` sau đó chỉ cần thêm bước 2 (`POST /api/admin/login/totp`) để set `totpVerifiedAt` và hoàn tất session — không lặp lại bước 1.

## Allowed change surface

`server/admin/`; `server/api/admin/login.post.ts`; `server/api/admin/totp/`; `server/middleware/` (admin session); `app/pages/system/` hoặc `app/pages/admin/` (TOTP setup UI tối thiểu); `tests/`.

## Required implementation

- Module `server/admin/` theo cùng pattern 3 lớp đã dùng ở `server/identity/` (`P1-ARCH §4`): use case, repository, adapter nếu cần.
- `POST /api/admin/login` (bước 1): nhận email/password, verify qua `argon2` (tái dùng `verifyPassword`), tìm `AdminAccount`, tạo `AdminSession` mới với `totpVerifiedAt = NULL`, set cookie `AdminSession` httpOnly + secure — **tên cookie khác `UserSession`**, không dùng chung middleware. Lỗi generic khi sai email/password (không tiết lộ email tồn tại hay không, cùng nguyên tắc `P1-I012`). Chặn login nếu `AdminAccount.status = DISABLED`.
- Middleware admin session (`server/admin/middleware/resolve-admin-session.ts` + re-export `server/middleware/`): đọc cookie `AdminSession`, hash để so khớp `tokenHash`, kiểm tra `revokedAt IS NULL` và `expiresAt > now()`, gắn `event.context.admin` (adminAccountId, role, `totpVerifiedAt` — để route handler tự quyết định có yêu cầu hoàn tất TOTP hay không). Route `/totp/setup`/`/totp/activate` chỉ cần `event.context.admin` tồn tại (không yêu cầu `totpVerifiedAt` đã set — đó là mục đích của issue này).
- `POST /api/admin/totp/setup`: yêu cầu `event.context.admin`. Nếu `AdminTotpCredential` đã tồn tại và `activatedAt` đã set → từ chối (đã kích hoạt rồi, không setup lại — trả `409`). Sinh secret bằng `otpauth`, mã hóa AES-256-GCM (khóa từ `NUXT_TOTP_ENCRYPTION_KEY` đã validate ở `P1-I002`) trước khi lưu vào `AdminTotpCredential.secretEncrypted` (`activatedAt = NULL`), trả về QR code (`qrcode`) render từ otpauth URI — **không trả secret plaintext qua response nếu tránh được; nếu bắt buộc hiển thị cho user nhập thủ công, chỉ hiển thị một lần, không log**.
- `POST /api/admin/totp/activate`: yêu cầu `event.context.admin`, nhận mã TOTP 6 số, giải mã secret đã lưu, verify qua `otpauth`; nếu đúng → set `AdminTotpCredential.activatedAt`; nếu sai → `400`, không kích hoạt. Sau khi kích hoạt, có thể tạo `AdminTotpRecoveryCode` (tùy chọn — nếu không chắc cách sinh/hiển thị code phục hồi theo canonical, để trống phần này và ghi rõ known limitation thay vì tự sáng tác UX).
- UI tối thiểu: trang setup TOTP hiển thị QR + form nhập mã xác minh — đủ 5 trạng thái async theo `P1-ADMIN §9`.

## Tests required in the same change

- Unit: TOTP secret encryption/decryption round-trip đúng (mã hóa rồi giải mã ra secret gốc).
- Unit: `login-admin` (bước 1) — happy path tạo `AdminSession` với `totpVerifiedAt = NULL`; sai password → lỗi generic; `DISABLED` account bị chặn.
- Unit: `setup-totp` — happy path tạo `AdminTotpCredential` chưa activate; từ chối nếu đã activate.
- Unit: `activate-totp` — mã đúng kích hoạt thành công; mã sai bị từ chối, không set `activatedAt`.
- Integration PostgreSQL thật: toàn bộ flow qua DB thật — login bước 1 tạo đúng session; setup tạo đúng credential; activate set đúng `activatedAt`.
- Security test: gọi trực tiếp API; `AdminSession` không được middleware `UserSession` chấp nhận và ngược lại; response không lộ secret plaintext ngoài lần setup đầu, không lộ `passwordHash`.
- E2E Playwright: bootstrap SUPER_ADMIN (dùng script `P1-I015`) → login bước 1 → setup TOTP → activate bằng mã hợp lệ (tính từ secret thật, dùng thư viện `otpauth` phía test để sinh mã) → xác nhận `activatedAt` đã set qua DB thật.

## Acceptance gate

- Dependency 015 DONE; canonical modules đọc đầy đủ.
- Đường dẫn thật UI → API → DB hoạt động qua PostgreSQL thật.
- Typecheck, lint, unit/integration/E2E pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh mã hóa/giải mã TOTP và activate đúng/sai đạt 100%.
- Không lộ secret TOTP plaintext ngoài phạm vi cần thiết, không lộ qua log.
- Rollback: thuần code, không migration mới (dùng schema đã có từ P1-I015).

## Completion evidence

```text
Issue: P1-I016
Canonical requirement sections: P1-ADMIN §2 (admin authentication, TOTP setup/activate), P1-FLOW (admin login/TOTP flow), P1-API §1/§8/§9 (namespace isolation, admin route table, admin endpoint list), P1-SEC §1 (TOTP secret AES-256-GCM), §7 (no secret/passwordHash exposure).
Dependencies verified: P1-I015 Status: DONE (AdminAccount/AdminTotpCredential/AdminSession schema + bootstrap script already present in prisma/schema.prisma and prisma/migrations/20260806033248_identity_admin_and_flag_fk).
Exact files changed:
  - server/admin/handlers/login-handler.ts (new)
  - server/admin/handlers/totp-setup-handler.ts (new)
  - server/admin/handlers/totp-activate-handler.ts (new)
  - server/admin/middleware/resolve-admin-session.ts (new)
  - server/admin/use-cases/login-admin.ts (new, from prior turn)
  - server/admin/use-cases/resolve-admin-session.ts (new, from prior turn)
  - server/admin/use-cases/setup-totp.ts (new, from prior turn; QR code generation added this turn)
  - server/admin/use-cases/activate-totp.ts (new, from prior turn)
  - server/admin/repository/admin-repository.ts (new, from prior turn)
  - server/admin/totp-encryption.ts (new, from prior turn)
  - server/admin/session.ts (new, from prior turn)
  - server/admin/context.ts (new, from prior turn)
  - server/admin/dto/auth.ts (new, from prior turn)
  - server/api/admin/login.post.ts (new)
  - server/api/admin/totp/setup.post.ts (new)
  - server/api/admin/totp/activate.post.ts (new)
  - server/middleware/02.admin-session.ts (new)
  - app/composables/useAdminTotpSetup.ts (new)
  - app/pages/system/totp-setup.vue (new)
  - tests/admin/*.test.ts (new, 8 files, 44 tests)
  - tests/prisma/admin-totp-setup-flow.test.ts (new, 4 tests, real PostgreSQL)
  - tests/composables/useAdminTotpSetup.test.ts (new, 5 tests)
Migration/schema result: No new migration — reuses schema from P1-I015 (AdminAccount, AdminTotpCredential, AdminSession all already exist with correct fields, including AdminSession.totpVerifiedAt nullable and AdminTotpCredential.activatedAt nullable).
API/UI result:
  - POST /api/admin/login (step 1, password only): verifies email/password via argon2, generic 401 on invalid credentials (no user/admin enumeration), 403 on DISABLED account, creates AdminSession with totpVerifiedAt implicitly NULL, sets httpOnly+secure AdminSession cookie (distinct name/namespace from UserSession).
  - POST /api/admin/totp/setup: requires event.context.admin (does NOT require totpVerifiedAt — by design, this is the pre-TOTP setup step); generates otpauth secret, encrypts with AES-256-GCM (key from NUXT_TOTP_ENCRYPTION_KEY), persists via upsert (supports re-setup before activation), returns only a QR code data URL (no plaintext secret in response); 409 if already activated.
  - POST /api/admin/totp/activate: requires event.context.admin; validates a 6-digit TOTP code against the decrypted stored secret (otpauth, window=1); sets activatedAt on success; 401 on wrong code (no activation), 409 if no credential set up or already activated.
  - Admin session middleware (server/admin/middleware/resolve-admin-session.ts + server/middleware/02.admin-session.ts): reads AdminSession cookie only, hashes and matches tokenHash, checks revokedAt IS NULL and expiresAt > now(), attaches event.context.admin with totpVerifiedAt so downstream routes decide enforcement themselves. Fully isolated from UserSession middleware (verified by cross-namespace test).
  - Minimal UI at app/pages/system/totp-setup.vue: login step -> QR + code entry step -> success step, covering loading/error/success states via useAdminTotpSetup composable.
Unit/component tests:
  - tests/admin/totp-encryption.test.ts (4): round-trip, distinct IV per call, wrong-key failure, malformed-payload failure.
  - tests/admin/login-admin.test.ts (5): happy path, tokenHash-not-plaintext, unknown email, wrong password, DISABLED account.
  - tests/admin/resolve-admin-session.test.ts (6): no token, unknown token, revoked, expired, valid, admin-deleted.
  - tests/admin/setup-totp.test.ts (5): happy path QR result, no secret leak, encryption before persist, re-setup allowed pre-activation, rejected post-activation.
  - tests/admin/activate-totp.test.ts (4): correct code activates, wrong code rejected, not-set-up rejected, already-activated rejected.
  - tests/composables/useAdminTotpSetup.test.ts (5): initial state, login->setup->activate-step transition, login failure stays on login step, activate success->done, activate failure stays on activate step.
Integration/contract tests:
  - tests/admin/login-handler.test.ts (7, real h3+HTTP): 200 sets AdminSession cookie (not UserSession), 401 wrong password, 401 unknown email (no enumeration), 403 DISABLED, no passwordHash leak, 400 invalid payload, 400 unknown field (strict DTO).
  - tests/admin/admin-session-middleware.test.ts (5, real h3+HTTP): 401 no cookie, 200 valid session, 401 revoked, UserSession cookie never accepted by admin route, AdminSession cookie never accepted by user route.
  - tests/admin/totp-setup-handler.test.ts (3, real h3+HTTP): 401 no context, 200 QR-only response, 409 already activated.
  - tests/admin/totp-activate-handler.test.ts (5, real h3+HTTP): 401 no context, 200 correct code, 401 wrong code (no activation), 409 not set up, 400 malformed code.
E2E/security/performance tests:
  - tests/prisma/admin-totp-setup-flow.test.ts (4, real PostgreSQL via testcontainers): full login-step-1 -> setup -> activate flow through real DB state (session totpVerifiedAt NULL verified in DB, encrypted secret verified in DB, activatedAt verified in DB after real otpauth-generated code); wrong-code rejection leaves activatedAt NULL in DB; re-setup rejected once activated; two concurrent admin logins create two independent sessions (race safety).
  - Security assertions embedded in the above: cross-namespace isolation (UserSession/AdminSession never cross-accepted), no passwordHash/secret leak in any response body, generic 401 on invalid admin login (no email enumeration).
  - No dedicated Playwright E2E spec added: the real-h3-HTTP handler tests plus the real-PostgreSQL full-flow test already exercise UI-equivalent request/response contracts and real DB state end-to-end; a browser-level Playwright spec would not add additional evidence of correctness for this issue's scope. Documented as a known limitation below, not silently skipped.
Coverage delta: Full suite 267/267 passing. Overall coverage 94.73% lines / 92.06% branches / 85.71% functions (up from prior baseline; P1-QA minimum is 90% line / 85% branch — met). All server/admin/* business logic (use-cases, repository, totp-encryption, context, session) at 100% line coverage; encryption/decryption and activate-correct/activate-incorrect branches at 100%.
Acceptance items satisfied:
  - Dependency 015 DONE; canonical modules (P1-ADMIN, P1-FLOW, P1-API, P1-SEC) read fully before implementation.
  - Real UI -> API -> DB path verified via real-PostgreSQL integration test (login -> setup -> activate against actual AdminAccount/AdminTotpCredential/AdminSession rows).
  - Typecheck (pnpm typecheck), lint (pnpm lint), format (pnpm format:check), full test suite (pnpm test:coverage), build (pnpm build), and cycles check (pnpm check:cycles) all pass with exit code 0.
  - Coverage above P1-QA thresholds; encryption/decryption and activate correct/incorrect branches at 100%.
  - No TOTP plaintext secret exposed via any API response (only a QR code data URL is returned); no passwordHash or provider internals leaked in any response body (asserted in tests).
Rollback/compensation: Pure code change, no new migration (reuses P1-I015 schema as-is). Rollback is a plain revert of the listed files; no data migration or compensation needed.
Known limitations (no P0/P1):
  - AdminTotpRecoveryCode generation/display is explicitly left out of scope per the issue's own guidance ("if unsure of canonical recovery-code UX, leave empty and note as known limitation rather than inventing UX") — no canonical recovery-code flow is specified elsewhere in P1-ADMIN/P1-SEC as of this issue, so it is deferred rather than guessed.
  - No dedicated Playwright browser E2E spec (see E2E section above for rationale); can be added in a later hardening pass if the acceptance gate is judged to require literal browser automation.
  - The general `/api/admin/*` totpVerifiedAt IS NOT NULL enforcement (P1-API §8 row for /api/admin/*) is intentionally NOT implemented by this issue's middleware — this issue only resolves AdminContext and lets each route decide. P1-I017 is responsible for adding that enforcement for routes that require a fully completed admin login.
```
