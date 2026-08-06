# P1-I019 — Quản trị admin và bảo vệ Super Admin cuối

**Stage:** identity  
**Status:** DONE  
**Depends on:** 018  
**Canonical modules — read fully:** P1-ADMIN, P1-DATA, P1-SEC  
**Previous:** [P1-I018](./018_RBAC_MIDDLEWARE_VA_MENU_THEO_ROLE.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I020](./020_RUNTIME_FEATURE_FLAGS_VA_SYSTEM_UI.md)

## Objective

Triển khai quản trị tài khoản `AdminAccount` khác (tạo/sửa role/disable) theo `P1-ADMIN §3`: chỉ `SUPER_ADMIN` thực hiện được, mọi thay đổi ghi `AdminAuditLog`. Bắt buộc bất biến "luôn còn ít nhất một SUPER_ADMIN đang hoạt động" — không được xóa, hạ quyền (đổi role sang `ADMIN`), hay vô hiệu hóa (`status = DISABLED`) `SUPER_ADMIN` cuối cùng còn active. Theo `P1-DATA §3`, bất biến này **không thể** biểu diễn bằng SQL constraint thuần (cần đếm toàn bảng) — phải enforce ở application layer trong transaction trước khi thực hiện thay đổi.

## Allowed change surface

`server/admin/`; `server/api/system/admin-accounts/` (route CRUD quản trị admin); `tests/`. Không tạo UI System đầy đủ (thuộc `P1-I020` trở đi cho phần layout/menu thật) — chỉ API, dùng cùng route xác minh tối thiểu như `P1-I018` nếu cần chứng minh qua HTTP.

## Required implementation

- Use case tạo `AdminAccount` mới (`createAdminAccount`): chỉ `SUPER_ADMIN` gọi được (`requireSuperAdmin` từ `P1-I018`), hash password bằng `argon2` (tái dùng `hashPassword`), role bất kỳ (`ADMIN` hoặc `SUPER_ADMIN`), ghi `AdminAuditLog` (`action: 'ADMIN_ACCOUNT_CREATE'`, `targetType: 'AdminAccount'`, `targetId`, `afterValue`).
- Use case đổi role (`updateAdminAccountRole`): chỉ `SUPER_ADMIN`. Nếu đổi từ `SUPER_ADMIN` sang `ADMIN`, phải kiểm tra trong cùng transaction: đếm số `AdminAccount` còn lại có `role = SUPER_ADMIN AND status = ACTIVE` (loại trừ chính account đang bị đổi) — nếu kết quả là 0, từ chối (lỗi rõ ràng, không đổi). Ghi `AdminAuditLog` (`beforeValue`/`afterValue` chứa role cũ/mới).
- Use case vô hiệu hóa (`disableAdminAccount`, đổi `status = DISABLED`): cùng logic bảo vệ — nếu account đang bị disable là `SUPER_ADMIN` đang `ACTIVE`, đếm các `SUPER_ADMIN ACTIVE` khác (loại trừ chính nó); nếu 0, từ chối. Ghi `AdminAuditLog`.
- Không triển khai xóa cứng (`DELETE`) `AdminAccount` ở issue này — schema `P1-DATA §3` không có trường xóa mềm riêng cho `AdminAccount` ngoài `status`; vô hiệu hóa qua `status = DISABLED` là cơ chế chính. Nếu cần xóa cứng thật, đó là quyết định vượt phạm vi issue này — ghi rõ known limitation thay vì tự suy diễn.
- Đếm "SUPER_ADMIN active còn lại" phải chạy trong cùng transaction Prisma với việc ghi thay đổi, để tránh race condition hai request đồng thời cùng hạ quyền/disable hai SUPER_ADMIN khác nhau và vô tình làm hệ thống còn 0 SUPER_ADMIN (mỗi request tự đếm đúng tại thời điểm transaction, DB lock hàng liên quan qua Prisma `$transaction`).
- Route tối thiểu chứng minh qua HTTP: `POST /api/system/admin-accounts`, `PATCH /api/system/admin-accounts/:id/role`, `PATCH /api/system/admin-accounts/:id/status` — dùng `requireSuperAdmin` (`P1-I018`), DTO strict (`zod`), không trả `passwordHash` qua response.

## Tests required in the same change

- Unit: `updateAdminAccountRole`/`disableAdminAccount` — cho phép đổi/disable khi còn SUPER_ADMIN active khác; từ chối khi đó là SUPER_ADMIN active cuối cùng.
- Unit: `createAdminAccount` — tạo đúng, hash password không phải plaintext, ghi audit log.
- Integration PostgreSQL thật: hai request đồng thời (`Promise.all`) cùng cố hạ quyền hai `SUPER_ADMIN` khác nhau khi hệ thống chỉ có đúng hai `SUPER_ADMIN active` — tối đa một request thành công, request còn lại bị từ chối do bất biến (race safety thật, không chỉ giả lập tuần tự).
- Integration: `AdminAuditLog` ghi đúng `beforeValue`/`afterValue` cho mỗi hành động.
- Security test: gọi trực tiếp API với role `ADMIN` (không phải `SUPER_ADMIN`) — `403` cho cả 3 route; `UserSession` không được chấp nhận.
- Test: response không bao giờ chứa `passwordHash`.

## Acceptance gate

- Dependency 018 DONE; canonical modules đọc đầy đủ.
- Bất biến "luôn còn ít nhất một SUPER_ADMIN active" được chứng minh đúng dưới điều kiện đồng thời thật qua PostgreSQL thật, không chỉ test tuần tự.
- Typecheck, lint, unit/integration/security test pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh chặn/cho-phép của bất biến SUPER_ADMIN cuối đạt 100%.
- Không lộ `passwordHash` qua response.
- Rollback: thuần code, không migration mới (dùng schema `AdminAccount`/`AdminAuditLog` đã có từ `P1-I015`).

## Completion evidence

```text
Issue: P1-I019
Canonical requirement sections: P1-ADMIN §3 (SUPER_ADMIN-only admin account management with audit log; last-active-SUPER_ADMIN protection against delete/demote/disable); P1-DATA §3 (AdminAccount/AdminAuditLog schema; explicit note that the "at least one active SUPER_ADMIN" invariant cannot be a SQL CHECK constraint and must be enforced at the application layer in a transaction); P1-SEC (password hashing, no plaintext/hash exposure, unchanged from prior issues).
Dependencies verified: P1-I018 Status: DONE (confirmed via issue_context.py 019 — Ready: YES).
Exact files changed:
  - Phase 1/Issues/019_QUAN_TRI_ADMIN_VA_BAO_VE_SUPER_ADMIN_CUOI.md (new — file did not exist despite being referenced by 00_ISSUE_INDEX.md; drafted from the Master plan + P1-ADMIN/P1-DATA before implementation, same pattern as P1-I017/P1-I018)
  - Phase 1/Issues/00_ISSUE_INDEX.md (status TODO -> IN_PROGRESS -> DONE for row 019)
  - server/admin/repository/admin-repository.ts (extended — added createAdminAccount, createAuditLog, updateAdminAccountRole, disableAdminAccount, and the private withLastActiveSuperAdminGuard helper; exported LastActiveSuperAdminError)
  - server/admin/use-cases/create-admin-account.ts (new)
  - server/admin/use-cases/update-admin-account-role.ts (new)
  - server/admin/use-cases/disable-admin-account.ts (new)
  - server/admin/dto/admin-accounts.ts (new — strict zod schemas, password min length 8)
  - server/admin/handlers/create-admin-account-handler.ts (new)
  - server/admin/handlers/update-admin-account-role-handler.ts (new)
  - server/admin/handlers/disable-admin-account-handler.ts (new)
  - server/api/system/admin-accounts/index.post.ts (new route)
  - server/api/system/admin-accounts/[id]/role.patch.ts (new route)
  - server/api/system/admin-accounts/[id]/status.patch.ts (new route)
  - tests/admin/create-admin-account.test.ts (new, 3 tests)
  - tests/admin/update-admin-account-role.test.ts (new, 3 tests)
  - tests/admin/disable-admin-account.test.ts (new, 3 tests)
  - tests/admin/admin-accounts-handlers.test.ts (new, 17 tests, real h3+HTTP)
  - tests/prisma/admin-accounts-last-super-admin-flow.test.ts (new, 6 tests, real PostgreSQL, including a genuine-concurrency race test)
Migration/schema result: No new migration — AdminAccount and AdminAuditLog already exist from P1-I015; this issue only adds application-layer logic reading/writing them.
API/UI result:
  - POST /api/system/admin-accounts: SUPER_ADMIN-only (403 for ADMIN, 401 for no session); creates a new AdminAccount with an argon2-hashed password; 409 on duplicate email (Prisma P2002); response never includes passwordHash; writes an ADMIN_ACCOUNT_CREATE audit log row attributed to the actor.
  - PATCH /api/system/admin-accounts/:id/role: SUPER_ADMIN-only; 404 if the target does not exist; 409 if the change would demote the last active SUPER_ADMIN; writes an ADMIN_ACCOUNT_ROLE_CHANGE audit log with before/after role values.
  - PATCH /api/system/admin-accounts/:id/status: SUPER_ADMIN-only; 404 if the target does not exist; 409 if disabling would remove the last active SUPER_ADMIN; writes an ADMIN_ACCOUNT_DISABLE audit log.
  - The last-active-SUPER_ADMIN guard (server/admin/repository/admin-repository.ts, withLastActiveSuperAdminGuard) runs inside a real Prisma interactive transaction using `SELECT id FROM "AdminAccount" WHERE role='SUPER_ADMIN' AND status='ACTIVE' FOR UPDATE` to lock every currently-active SUPER_ADMIN row before counting — this is what makes the invariant race-safe: two concurrent transactions attempting to demote/disable two different SUPER_ADMINs cannot both observe "others remain," because the second transaction blocks on the row lock until the first commits or rolls back, then re-evaluates against the post-commit state.
Unit/component tests:
  - tests/admin/create-admin-account.test.ts (3): password is hashed before persisting; ADMIN_ACCOUNT_CREATE audit log is written and attributed to the actor; the returned account object never carries passwordHash.
  - tests/admin/update-admin-account-role.test.ts (3): role change + audit log with before/after values; AdminAccountNotFoundError when target missing (no audit log written); LastActiveSuperAdminError propagates from the repository without writing an audit log (mutation and audit log are only recorded together, never a log for a rejected mutation).
  - tests/admin/disable-admin-account.test.ts (3): same three shapes for disable.
Integration/contract tests:
  - tests/admin/admin-accounts-handlers.test.ts (17, real h3+HTTP): full 401/403/404/409/400/200/500 matrix across all three routes, including P2002-duplicate-email handling and confirming unexpected errors are rethrown as 500 rather than silently swallowed by the catch blocks (this was specifically added after the first coverage run showed the generic-rethrow branches were untested).
E2E/security/performance tests:
  - tests/prisma/admin-accounts-last-super-admin-flow.test.ts (6, real PostgreSQL via testcontainers): createAdminAccount persists a real row + audit log; demoting a SUPER_ADMIN succeeds when another active SUPER_ADMIN remains; demoting/disabling the last active SUPER_ADMIN is rejected and leaves the row unchanged in the database; a DISABLED SUPER_ADMIN does not count toward the active quorum; and — the key race-safety proof — two genuinely concurrent transactions (`Promise.allSettled`, not sequential calls) attempting to demote two different SUPER_ADMINs when exactly two active SUPER_ADMINs exist: exactly one succeeds, exactly one is rejected with LastActiveSuperAdminError, and the final database state has exactly one ACTIVE SUPER_ADMIN among the two — never zero.
  - A real bug was caught and fixed during this issue: the first version of the concurrency test file did not isolate itself from SUPER_ADMIN rows seeded by earlier tests in the same file (sharing one testcontainers database), so "the last active SUPER_ADMIN" assertions intermittently failed depending on test execution order — not because the production guard was wrong (it correctly counts the whole table, which is the actual required invariant), but because the test's premise assumed a scoped view that didn't match reality. Fixed by adding a beforeEach that disables any pre-existing ACTIVE SUPER_ADMIN before each test, making every test deterministic regardless of order, per the testing rule that fixtures must be explicit and isolated.
Coverage delta: Full suite 336/336 passing (up from 304 after P1-I018). Overall coverage 93.79% lines / 92.18% branches / 83.56% functions — above the P1-QA minimum (90% line / 85% branch). The last-active-SUPER_ADMIN allow/reject branch is covered by both unit tests (mocked) and the real-PostgreSQL concurrency test (unmocked, genuine race).
Acceptance items satisfied:
  - Dependency 018 DONE; canonical modules (P1-ADMIN, P1-DATA, P1-SEC) read fully; issue_context.py 019 confirmed Ready: YES before implementation.
  - The "always at least one active SUPER_ADMIN" invariant is proven under real concurrent PostgreSQL transactions, not just sequential test calls — matching the acceptance gate's explicit requirement.
  - Typecheck, lint, format, full test suite (test:coverage), build, and check:cycles all pass with exit code 0.
  - Coverage above P1-QA thresholds; the guard's allow/reject branches at 100% coverage across unit + real-DB tests.
  - passwordHash never appears in any API response (asserted in tests).
Rollback/compensation: Pure code change, no new migration (reuses P1-I015's AdminAccount/AdminAuditLog schema as-is). Rollback is a plain revert of the listed files; no data migration or compensation needed.
Known limitations (no P0/P1):
  - No hard DELETE for AdminAccount was implemented — status=DISABLED is the only deactivation mechanism, per this issue's own explicit scoping decision (P1-DATA §3 has no soft-delete field beyond status for AdminAccount, and inventing a hard-delete UX was judged out of scope rather than guessed at).
  - The three routes are minimal API-only surfaces; no System UI screens for admin account management exist yet (System UI/CMS layout is P1-I020+ scope).
  - Password minimum length is set to 8 characters in the DTO (createAdminAccountBodySchema) as a reasonable baseline; P1-SEC does not specify an exact minimum for admin account passwords beyond requiring Argon2id hashing, so this is a judgment call rather than a canonical requirement — flagged here rather than silently assumed.
```

## Post-DONE correction (route naming, discovered while drafting P1-I020)

While drafting P1-I017/P1-I018/P1-I019 this issue's routes were built using `P1-ADMIN`/`P1-DATA`/`P1-SEC` alone (as listed in "Canonical modules — read fully" above); `P1-API §10`'s exact System API route table was not cross-checked at that time. While drafting **P1-I020** and reading `P1-API §10` in full, a real deviation surfaced: the canonical contract specifies `GET/POST /api/system/admins` plus a single `PATCH /api/system/admins/:id` (one endpoint handling both role and status, `409` on last-SUPER_ADMIN demotion) — not the `/api/system/admin-accounts` + separate `/role`/`/status` PATCH endpoints this issue originally shipped. Per explicit user decision, this was corrected in the same change surface before proceeding to P1-I020:

- Routes renamed: `POST /api/system/admins`, `GET /api/system/admins` (new — was missing entirely), `PATCH /api/system/admins/:id` (merged; was two separate role/status endpoints).
- `server/admin/use-cases/update-admin-account-role.ts` and `disable-admin-account.ts` replaced by a single `server/admin/use-cases/update-admin-account.ts` accepting `{ role?, status? }`, applying either/both in one call, and writing one `ADMIN_ACCOUNT_UPDATE` audit log entry covering whichever fields actually changed (no-op, no audit log, if the request matches current state).
- `server/admin/repository/admin-repository.ts` gained `enableAdminAccount` (status ACTIVE was previously unreachable — only DISABLED existed) and `listAdminAccounts`, backing the new `GET` endpoint.
- New use case `server/admin/use-cases/list-admin-accounts.ts` + handler `server/admin/handlers/list-admin-accounts-handler.ts` for `GET /api/system/admins`.
- All tests updated/added accordingly: tests/admin/update-admin-account.test.ts (8 tests, replacing the old split-route unit tests), tests/admin/list-admin-accounts.test.ts (1 test), tests/admin/admin-accounts-handlers.test.ts rewritten for the merged routes (23 tests total across GET/POST/PATCH, including the new re-enable and combined role+status-in-one-request cases), tests/prisma/admin-accounts-last-super-admin-flow.test.ts updated to call updateAdminAccount and gained a re-enable case (7 tests total).
- Full quality gate re-run after the fix: typecheck/lint/format/build/check:cycles all pass; full suite 342/342 passing; coverage 93.83% lines / 92.8% branches — still above the P1-QA minimum.
- This correction is scoped entirely within P1-I019's original allowed change surface (server/admin/, server/api/system/, tests/) — no other issue's files were touched, and P1-I018's requireSuperAdmin/requireVerifiedAdmin guards were reused unchanged.
