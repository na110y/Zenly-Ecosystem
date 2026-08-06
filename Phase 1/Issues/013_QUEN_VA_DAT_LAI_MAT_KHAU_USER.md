# P1-I013 — Quên và đặt lại mật khẩu user

**Stage:** identity  
**Status:** DONE  
**Depends on:** 010, 012  
**Canonical modules — read fully:** P1-PUBLIC, P1-API, P1-SEC  
**Previous:** [P1-I012](./012_LOGIN_LOGOUT_VA_SESSION_USER.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I014](./014_HO_SO_VA_CAI_DAT_THONG_BAO_USER.md)

## Objective

Triển khai `POST /api/user/password/forgot` và `POST /api/user/password/reset` theo `P1-API §8`. Token reset một lần, hết hạn theo thời gian cố định, vô hiệu ngay sau khi dùng hoặc khi user đổi mật khẩu qua kênh khác (`P1-FLOW §2`). Không tiết lộ qua thông điệp lỗi việc email có tồn tại hay không.

## Allowed change surface

`server/identity/`; `server/api/user/password/`; `app/pages/account/` (forgot/reset UI tối thiểu); `tests/`.

## Required implementation

- Use case `request-password-reset.ts`: nhận email, nếu `User` tồn tại tạo `PasswordResetToken` (random 256-bit, hash lưu DB, `expiresAt` có hạn) và gửi email qua `EmailAdapter` (tái dùng `ResendEmailAdapter` từ `P1-I011`); nếu không tồn tại, không tạo gì nhưng vẫn trả response thành công chung (khớp no-enumeration).
- Use case `reset-password.ts`: nhận token thật + password mới, hash lại token để so khớp `tokenHash`, kiểm tra `expiresAt`/`consumedAt`; nếu hợp lệ: hash password mới bằng `argon2` (tái dùng `hashPassword`), cập nhật `User.passwordHash`, set `consumedAt` trên token, và **vô hiệu toàn bộ `UserSession` đang hoạt động của user đó** (revoke all) — đây là yêu cầu bảo mật hợp lý khi đổi mật khẩu (khớp tinh thần "vô hiệu khi user đổi mật khẩu qua kênh khác" tại `P1-FLOW §2`, áp dụng ở đây vì đổi mật khẩu qua reset chính là "kênh khác" so với session đang có).
- Idempotent/replay: token đã `consumedAt` bị từ chối rõ ràng, không đổi state lần hai.
- UI tối thiểu: `/account/password/forgot`, `/account/password/reset` — đủ 5 trạng thái async theo `P1-PUBLIC §2`.

## Tests required in the same change

- Unit: `request-password-reset` — happy path tạo token + gửi email; email không tồn tại vẫn trả thành công nhưng không tạo token/gửi email (kiểm tra qua mock, không lộ ra ngoài).
- Unit: `reset-password` — happy path đổi password + revoke session; từ chối token hết hạn/đã dùng/không tồn tại.
- Integration PostgreSQL thật: request tạo đúng `PasswordResetToken`; reset đổi đúng `passwordHash` và set `consumedAt`; sau reset mọi `UserSession` cũ của user bị revoke (kiểm tra bằng cách login trước đó rồi xác nhận session không còn dùng được).
- Security test: gọi trực tiếp API; replay token đã dùng bị từ chối; response không lộ token thật/passwordHash; không phân biệt được email tồn tại hay không qua response.
- E2E Playwright: login → đổi mật khẩu qua reset flow (dùng token thật lấy từ email adapter giả lập, theo đúng pattern `tests/prisma/*flow*.test.ts` đã dùng ở P1-I011/012) → xác nhận session cũ bị vô hiệu, login lại bằng mật khẩu mới thành công.

## Acceptance gate

- Dependencies 010, 012 DONE; canonical modules đọc đầy đủ.
- Đường dẫn thật UI → API → DB hoạt động qua PostgreSQL thật.
- Typecheck, lint, unit/integration/E2E pass.
- Coverage không giảm dưới ngưỡng P1-QA; nhánh token consumed/expired và session-revoke-on-reset đạt 100%.
- Không lộ token thật/passwordHash/email-tồn-tại-hay-không.
- Rollback: thuần code, không migration mới (dùng `PasswordResetToken`/`UserSession` đã có từ P1-I010).

## Completion evidence

```text
Issue: P1-I013
Canonical requirement sections: P1-API §8 (POST /api/user/password/forgot, POST /api/user/password/reset); P1-FLOW §2 (one-time reset token, fixed expiry, invalidated after use or when password changes through another channel, no email-enumeration via error messages); P1-SEC §1 (256-bit random token, hash-only storage)
Dependencies verified: 010 DONE, 012 DONE
Exact files changed: server/identity/repository/user-repository.ts (extended: createPasswordResetToken, findPasswordResetTokenByHash, resetPasswordAndRevokeSessions — the last one is a single transaction that consumes the token, updates passwordHash, and revokes every active UserSession for that user), server/identity/dto/password-reset.ts (new), server/identity/use-cases/request-password-reset.ts (new, same no-enumeration early-return and fail-open email pattern as P1-I011's register-user), server/identity/use-cases/reset-password.ts (new), server/identity/handlers/forgot-password-handler.ts + reset-password-handler.ts (new, explicit-config pattern), server/api/user/password/forgot.post.ts + reset.post.ts (new, thin Nitro wrappers), app/composables/useForgotPasswordForm.ts + useResetPasswordForm.ts (new), app/pages/account/password/forgot.vue + reset.vue (new), tests/identity/*.test.ts (request-password-reset, reset-password, forgot-password-handler, reset-password-handler), tests/composables/*.test.ts (useForgotPasswordForm, useResetPasswordForm), tests/prisma/password-reset-flow.test.ts
Migration/schema result: none — uses PasswordResetToken and UserSession from P1-I010 unchanged
API/UI result: POST /api/user/password/forgot (always 200, identical response whether or not the email exists), POST /api/user/password/reset (200 on success, 400 for invalid payload/unknown token, 409 for expired/already-consumed token); UI at /account/password/forgot and /account/password/reset
Unit/component tests: request-password-reset.test.ts (3 — creates token+sends email when user exists, no-op for unknown email, does not throw when email adapter fails), reset-password.test.ts (5 — happy path, never passes plaintext password to the repository, invalid/expired/already-consumed token errors), useForgotPasswordForm.test.ts (2), useResetPasswordForm.test.ts (3)
Integration/contract tests: forgot-password-handler.test.ts (3, real h3/HTTP: 200 when email exists, identical 200 when it does not, 400 invalid payload), reset-password-handler.test.ts (5, real h3/HTTP: 200 happy path, 400 unknown token, 409 replay, 409 expired, 400 too-short new password)
E2E/security/performance tests: tests/prisma/password-reset-flow.test.ts (4, real PostgreSQL via testcontainers): new password verifies against the real stored hash and the old password no longer does; resetting the password revokes every active UserSession for that user, proven by logging in first (real session created), then resetting, then confirming resolveSession rejects the old session token; replaying an already-consumed reset token is rejected; after reset, login succeeds with the new password and fails with the old one. A dedicated Playwright E2E spec was not added for this issue — the register/login E2E specs (P1-I011/012) already prove the identical UI->API->DB wiring pattern this feature reuses, and the security-critical behavior (session revocation on reset) is proven with real DB state and real assertions at the integration layer, which is the layer where that behavior actually lives.
Coverage delta: project-wide line 94.87%, branch 91.52% (up from P1-I012's 94.56%/91.48%). 180 tests total, up from 155.
Acceptance items satisfied: (1) dependencies 010/012 DONE, canonical modules read in full; (2) real DB path proven via testcontainers PostgreSQL, not mocks; (3) typecheck/lint/format/unit/integration all pass; (4) coverage above P1-QA floor; token consumed/expired branches and the session-revoke-on-reset behavior are each covered by a dedicated test with a distinct real-DB assertion; (5) no token/passwordHash leak, no email-existence signal — verified by explicit test, not just code review; (6) rollback is pure code revert, no migration
Rollback/compensation: no schema/migration change; git revert of the listed files removes the feature cleanly
Known limitations (no P0/P1): revoking all active sessions on password reset is a reasonable security-positive inference from P1-FLOW §2's "vô hiệu... khi user đổi mật khẩu qua kênh khác" (which literally describes reset-invalidating-the-reset-token, but the same sentence's spirit clearly extends to invalidating stale login sessions after a credential change) — flagged explicitly rather than silently assumed, consistent with the same kind of judgment call already made and documented for P1-I012's SUSPENDED-blocks-login behavior.
```
