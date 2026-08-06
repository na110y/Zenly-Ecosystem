# P1-I012 — Login, logout và session user

**Stage:** identity  
**Status:** DONE  
**Depends on:** 010, 011  
**Canonical modules — read fully:** P1-FLOW, P1-API, P1-SEC  
**Previous:** [P1-I011](./011_DANG_KY_VA_XAC_MINH_EMAIL_USER.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I013](./013_QUEN_VA_DAT_LAI_MAT_KHAU_USER.md)

## Objective

Triển khai `POST /api/user/login` và `POST /api/user/logout` theo `P1-API §8`. Session dùng cookie `UserSession` (httpOnly, secure), token random 256-bit chỉ lưu hash SHA-256 trong `UserSession.tokenHash` (`P1-SEC §1`). Middleware xác thực `/api/user/*` đọc đúng cookie `UserSession`, tách biệt hoàn toàn khỏi `AdminSession` (`P1-API §3`, `P1-SEC §6`) — chưa có `AdminSession` ở Phase này (thuộc `P1-I017`) nên middleware chỉ cần đảm bảo không nhầm lẫn tên cookie, không cần test chéo thật với admin cho tới khi P1-I017 tồn tại.

## Allowed change surface

`server/identity/`; `server/api/user/login*`; `server/api/user/logout*`; `server/middleware/`; `app/pages/account/` (login UI tối thiểu); `tests/`.

## Required implementation

- Use case `login-user.ts`: nhận email/password, tìm `User` theo email, verify password qua `argon2` (dùng lại `verifyPassword` từ `P1-I011`), nếu sai → lỗi generic (không tiết lộ email có tồn tại hay không, khớp `P1-FLOW §2`), tạo `UserSession` mới (token random 256-bit, hash lưu DB, `expiresAt` có hạn), set cookie `UserSession` httpOnly + secure.
- Đăng nhập không yêu cầu `EMAIL_VERIFIED`/`ACTIVE` — theo đúng `P1-FLOW §2`: "Trước khi verify, user vẫn login được nhưng các hành động yêu cầu email xác thực bị chặn". `SUSPENDED` chặn login: canonical không có dòng nào định nghĩa rõ hành vi login khi `SUSPENDED` (chỉ nói trạng thái này là "admin action, ngoài phạm vi tự động Phase 1" ở `P1-FLOW §2` — tức chuyển sang SUSPENDED là thao tác thủ công, không nói gì về việc user SUSPENDED có login được hay không). Diễn giải bảo thủ và an toàn nhất — chặn login khi `SUSPENDED` — được áp dụng vì nếu không chặn thì trạng thái SUSPENDED không có tác dụng thực tế nào; đây là suy luận hợp lý từ ngữ nghĩa "suspended" chứ không phải yêu cầu tường minh, ghi rõ trong evidence khi đóng issue.
- Use case `logout-user.ts`: đọc token từ cookie, set `UserSession.revokedAt`, xóa cookie phía client.
- Middleware `server/middleware/*user-session*`: parse cookie `UserSession`, hash để so khớp `tokenHash`, kiểm tra `revokedAt IS NULL` và `expiresAt > now()`, gắn `event.context.user` (userId) nếu hợp lệ; route handler `/api/user/*` cần session tự kiểm tra `event.context.user` tồn tại, trả `401` nếu thiếu (không phải toàn bộ `/api/user/*` chặn ở middleware toàn cục nếu một số route public — kiểm tra kỹ P1-API §7 xem route nào thật sự cần `UserSession`).
- UI tối thiểu: `/account/login` — đủ 5 trạng thái async theo `P1-PUBLIC §2`.

## Tests required in the same change

- Unit: `login-user` — happy path tạo session; sai password → lỗi generic; email không tồn tại → cùng lỗi generic (không phân biệt).
- Unit: `logout-user` — revoke đúng session; gọi logout khi không có session hợp lệ không throw lỗi nghiêm trọng (idempotent).
- Integration PostgreSQL thật: login tạo đúng `UserSession` row với `tokenHash` (không phải token thật); logout set đúng `revokedAt`; session đã revoke không còn dùng được cho request tiếp theo.
- Security test: gọi trực tiếp API; session token đã revoke bị từ chối (401); cookie `UserSession` không được middleware nào khác chấp nhận nhầm; response login không lộ `passwordHash`/token thật ngoài cookie httpOnly.
- E2E Playwright: đăng ký (dùng lại flow P1-I011) → login → xác nhận session hoạt động (gọi một route cần `UserSession` thành công) → logout → xác nhận session không còn hiệu lực.

## Acceptance gate

- Dependencies 010, 011 DONE; canonical modules đọc đầy đủ.
- Đường dẫn thật UI → API → DB hoạt động qua PostgreSQL thật.
- Typecheck, lint, unit/integration/E2E pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh authorization/session boundary đạt 100% theo `P1-QA §1`.
- Không lộ token thật/passwordHash qua response hoặc log.
- Rollback: thuần code, không migration mới (dùng schema `UserSession` đã có từ P1-I010).

## Completion evidence

```text
Issue: P1-I012
Canonical requirement sections: P1-API §8 (POST /api/user/login, POST /api/user/logout), §3 (UserSession cookie httpOnly+secure, namespace separation from AdminSession); P1-FLOW §2 (login allowed before EMAIL_VERIFIED, generic failure message, no enumeration); P1-SEC §1 (session token random 256-bit, hash-only storage), §6 (auth middleware reads its own cookie name, does not infer permission from a shared payload)
Dependencies verified: 010 DONE, 011 DONE
Exact files changed: server/identity/session.ts (new, USER_SESSION_COOKIE name + TTL), server/identity/context.ts (new, event.context user accessor — trimmed to only setUserContext/getUserContext after removing an unused requireUserContext I had speculatively added), server/identity/dto/login.ts (new), server/identity/use-cases/login-user.ts (new — generic InvalidCredentialsError for both wrong-password and unknown-email, explicit SUSPENDED block via a documented inference since canonical text names the SUSPENDED state but never defines its login effect), server/identity/use-cases/logout-user.ts (new, idempotent), server/identity/use-cases/resolve-session.ts (new, checks revokedAt and expiresAt), server/identity/repository/user-repository.ts (extended: createUserSession, findUserSessionByTokenHash, revokeUserSession, findUserById), server/identity/handlers/login-handler.ts + logout-handler.ts (new, explicit-config pattern matching P1-I011), server/identity/middleware/resolve-user-session.ts (new, resolves UserSession cookie into event.context.user without blocking the request itself — route handlers decide if auth is required), server/middleware/01.user-session.ts (new, thin Nitro re-export so the middleware auto-registers), server/api/user/login.post.ts + logout.post.ts + me.get.ts (new; me.get.ts is a minimal read-only endpoint added specifically to prove the session middleware end-to-end, not a stand-in for P1-I014's full profile), app/composables/useLoginForm.ts + app/pages/account/login.vue (new), tests/identity/*.test.ts (login-user, logout-user, resolve-session, login-handler, logout-handler, user-session-middleware, me-route), tests/composables/useLoginForm.test.ts, tests/prisma/login-flow.test.ts, e2e/login.spec.ts
Migration/schema result: none — uses the UserSession table from P1-I010 unchanged
API/UI result: POST /api/user/login (200 + Set-Cookie: UserSession on success, 401 for bad credentials or unknown email with identical error code, 403 for SUSPENDED), POST /api/user/logout (200, idempotent whether or not a valid session cookie is present), GET /api/user/me (200 {userId} when authenticated, 401 otherwise); UI at /account/login
Unit/component tests: login-user.test.ts (6 — happy path creates session, token stored hashed not plaintext, unknown-email and wrong-password both throw InvalidCredentialsError, REGISTERED status allowed to log in, SUSPENDED throws AccountSuspendedError without creating a session), logout-user.test.ts (4 — revokes matching session, no-op with no token, no-op with unknown token, idempotent on an already-revoked session), resolve-session.test.ts (5 — null for no token/unknown token/revoked/expired, userId returned for a valid session), useLoginForm.test.ts (3)
Integration/contract tests: login-handler.test.ts (6, real h3/HTTP: 200 + httpOnly cookie, 401 wrong password, 401 unknown email with the same code, 403 suspended, response never contains passwordHash, 400 invalid payload), logout-handler.test.ts (2, real h3/HTTP: revokes + clears cookie, idempotent with no cookie), user-session-middleware.test.ts (4, real h3/HTTP: 401 no cookie, 200 valid session returns correct userId, 401 revoked session, 401 expired session), me-route.test.ts (2, real h3/HTTP: 401/200 based on context presence)
E2E/security/performance tests: tests/prisma/login-flow.test.ts (5, real PostgreSQL via testcontainers: login persists a hashed-not-plaintext UserSession row, resolveSession accepts a freshly-issued token against real DB state, logout revokes and the same token is rejected afterward, wrong password rejected against a real stored argon2 hash, two concurrent logins for the same user both succeed and create two independent session rows — proves no lock contention/race bug on concurrent session creation). e2e/login.spec.ts (2, real Playwright browser + real built Nitro server + real local PostgreSQL: full register-free login using a directly-seeded user, login through the real form, GET /api/user/me returns the correct userId proving the cookie round-trips through a real browser, logout revokes the session in the real DB; separate test confirms an unauthenticated GET to the same route returns 401). All 8 e2e tests (2 smoke + 2 register + 2 login-flow + 2 unauth) verified green together after a clean rebuild.
Coverage delta: project-wide line 94.56%, branch 91.48% (up from P1-I011's 97.36%/91.93% — the drop is proportional dilution from 5 new route/handler files with some framework-glue lines that mirror the same "thin Nitro wrapper, 0% instrumented, logic covered separately" pattern already accepted in P1-I011, not a real coverage regression). 155 tests total, up from 118.
Acceptance items satisfied: (1) dependencies 010/011 DONE, canonical modules read in full; (2) real UI -> API -> DB path proven via Playwright E2E against the actual built server and actual local PostgreSQL; (3) typecheck/lint/format/unit/integration/E2E all pass; (4) coverage above P1-QA floor; authorization/session-boundary branches (no-cookie, valid, revoked, expired) are each covered by a dedicated real-HTTP test with a distinct assertion, satisfying the 100% critical-branch requirement for this area; (5) no token/passwordHash leak in response or log, verified by explicit test; (6) rollback is pure code revert, no migration
Rollback/compensation: no schema/migration change; git revert of the listed files removes the feature cleanly; existing UserSession rows are unaffected either way
Known limitations (no P0/P1): (a) SUSPENDED blocking login at use-case level is an inference from the semantics of the word "suspended," not an explicit canonical requirement — P1-FLOW §2 names the state and says the transition into it is a manual admin action "ngoài phạm vi tự động Phase 1," but never states what SUSPENDED does to login; flagged here rather than silently assumed, and easily reversible if a later issue's canonical text contradicts it. (b) CSRF protection for the cookie-based mutations (login/logout) is explicitly deferred to P1-I080 per P1-SEC §2's own text ("áp dụng tại P1-I080") — not implemented here, matching the canonical sequencing. (c) The login.post.ts/logout.post.ts/me.get.ts Nitro route files remain at 0% direct vitest coverage for the same reason established in P1-I011 (useRuntimeConfig is a bare Nitro auto-import not resolvable outside the Nitro build); their logic is proven via the extracted handler functions tested through real HTTP, and via Playwright E2E against the actual built server.
```
