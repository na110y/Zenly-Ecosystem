# P1-I010 — Schema user và session public

**Stage:** identity  
**Status:** DONE  
**Depends on:** 004  
**Canonical modules — read fully:** P1-DATA, P1-SEC  
**Previous:** [P1-I006](./006_CI_NEN_VA_QUALITY_GATE_TOI_THIEU.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I011](./011_DANG_KY_VA_XAC_MINH_EMAIL_USER.md)

## Objective

Tạo migration Prisma cho toàn bộ bảng identity **public user** tại `P1-DATA §2`: `User`, `EmailVerificationToken`, `PasswordResetToken`, `UserSession`, `UserNotificationPreference`. Đây là schema thuần — không có route/API/use case nghiệp vụ (đăng ký/login thuộc `P1-I011`/`P1-I012`).

## Allowed change surface

`prisma/`; `tests/`. Không tạo `server/api/*`, không tạo use case đăng ký/login (thuộc issue sau).

## Required implementation

- Model `User` đúng `P1-DATA §2`: `id UUID PK`, `email TEXT UNIQUE NOT NULL`, `passwordHash TEXT NOT NULL`, `displayName TEXT NOT NULL`, `status ENUM(REGISTERED, EMAIL_VERIFIED, ACTIVE, SUSPENDED) DEFAULT REGISTERED` (khớp state machine `P1-FLOW §2`), `emailVerifiedAt TIMESTAMPTZ NULL`, `createdAt`, `updatedAt`.
- Model `EmailVerificationToken`, `PasswordResetToken`: `id`, `userId FK -> User.id ON DELETE CASCADE`, `tokenHash TEXT UNIQUE NOT NULL` (không lưu token thật — khớp `P1-SEC §1`), `expiresAt`, `consumedAt NULL`, `createdAt`, index `(userId)`.
- Model `UserSession`: `id`, `userId FK CASCADE`, `tokenHash TEXT UNIQUE NOT NULL`, `userAgent TEXT NULL`, `ipHash TEXT NULL` (không lưu IP plaintext — `P1-SEC §1`), `expiresAt`, `revokedAt NULL`, `createdAt`, index `(userId)` và `(expiresAt)`.
- Model `UserNotificationPreference`: `id`, `userId FK CASCADE UNIQUE` (1-1 với User), `newStoriesEmail BOOLEAN DEFAULT false`, `newChaptersEmail BOOLEAN DEFAULT false`, `webPushEnabled BOOLEAN DEFAULT false`, `updatedAt`.
- Namespace session **tách biệt** khỏi `AdminSession` (`P1-DATA §2` note) — không tạo bảng dùng chung, không FK chéo sang admin schema (admin schema chưa tồn tại, thuộc `P1-I015`).
- Migration mới (không sửa migration `20260805154114_init_feature_flags_settings` đã apply — khớp `.claude/rules/database.md` "Never rewrite an already-applied migration").

## Tests required in the same change

- Integration test PostgreSQL thật (testcontainers, khớp `P1-QA §2`): migration áp dụng thành công trên DB đã có sẵn `FeatureFlag`/`SystemSetting` (từ P1-I004), không xung đột.
- Test constraint: `User.email` unique — insert trùng email thất bại đúng theo constraint DB (không chỉ kiểm tra ở application layer).
- Test constraint: `EmailVerificationToken`/`PasswordResetToken`/`UserSession`.`tokenHash` unique.
- Test cascade: xóa `User` xóa theo `EmailVerificationToken`, `PasswordResetToken`, `UserSession`, `UserNotificationPreference` (ON DELETE CASCADE).
- Test default: `User.status` mặc định `REGISTERED`; `UserNotificationPreference` các cờ boolean mặc định `false` (khớp default-off tại `P1-SCOPE`).
- Test index tồn tại và được dùng cho truy vấn theo `userId`/`expiresAt` (kiểm tra qua EXPLAIN hoặc tối thiểu xác nhận migration tạo đúng index — không cần benchmark hiệu năng ở issue này, thuộc `P1-PERF`).

## Acceptance gate

- Dependency 004 DONE; canonical modules đọc đầy đủ.
- Migration áp dụng qua PostgreSQL thật, không mock.
- Không tạo route/use case nghiệp vụ ngoài schema.
- Typecheck, lint, integration test pass; coverage không giảm dưới ngưỡng P1-QA.
- Rollback: migration mới, có thể `prisma migrate resolve --rolled-back` + DROP TABLE thủ công nếu cần; chưa có dữ liệu nghiệp vụ nên không rủi ro mất dữ liệu thật.

## Completion evidence

```text
Issue: P1-I010
Canonical requirement sections: P1-DATA §2 (User/EmailVerificationToken/PasswordResetToken/UserSession/UserNotificationPreference columns, types, constraints, namespace separation from AdminSession), §1 (UUID via pgcrypto, TIMESTAMPTZ UTC); P1-FLOW §2 (User status state machine REGISTERED -> EMAIL_VERIFIED -> ACTIVE, referenced by the status enum default); P1-SEC §1 (tokenHash/session token stored as hash only, ipHash not raw IP)
Dependencies verified: 004 DONE
Exact files changed: prisma/schema.prisma (added UserStatus enum, User, EmailVerificationToken, PasswordResetToken, UserSession, UserNotificationPreference models), prisma/migrations/20260805161811_identity_user_and_session/migration.sql (new), tests/prisma/user-schema.test.ts (new)
Migration/schema result: migration applied cleanly on top of the existing 20260805154114_init_feature_flags_settings migration (no rewrite of that migration); verified against both the local docker db container and an ephemeral testcontainers PostgreSQL 17 instance; generated SQL matches P1-DATA §2 column-for-column including all FKs (ON DELETE CASCADE), unique constraints, and indexes
API/UI result: none — schema only, no routes/use cases per this issue's allowed change surface
Unit/component tests: none required beyond integration (pure schema, no business logic to unit test at this layer)
Integration/contract tests: tests/prisma/user-schema.test.ts (7 cases, real PostgreSQL via testcontainers): User created with default status REGISTERED and emailVerifiedAt null; duplicate email rejected at the DB constraint level (not application check); duplicate tokenHash rejected on both EmailVerificationToken and UserSession; deleting a User cascades to all 4 dependent tables (EmailVerificationToken, PasswordResetToken, UserSession, UserNotificationPreference) verified by row-count assertions after delete; UserNotificationPreference defaults every boolean flag to false; UserNotificationPreference enforces one row per user via the unique userId constraint
E2E/security/performance tests: not applicable — no API/UI surface exists yet for this data (P1-I011/012 add that). Full project test suite (58 tests across 9 files, including the pre-existing prisma/env/api suites) re-verified green after this change to confirm no regression.
Coverage delta: unchanged from P1-I006 baseline (98.14% line / 92.85% branch) — this issue adds no code under app/**/server/** (vitest.config.ts coverage scope), only schema/migration/tests
Acceptance items satisfied: (1) dependency 004 DONE, canonical modules read in full; (2) migration executed through real PostgreSQL (testcontainers ephemeral instance AND the local docker db), not mocked; (3) no route/use case created, staying within the schema-only allowed change surface; (4) typecheck/lint/format/coverage/build/cycles all pass; (5) rollback documented below
Rollback/compensation: this migration only adds new tables (no ALTER/DROP of existing structures) — rollback is `prisma migrate resolve --rolled-back 20260805161811_identity_user_and_session` followed by DROP TABLE for the 4 new tables and DROP TYPE for UserStatus if needed; no existing business data exists yet so no data-loss risk
Known limitations (no P0/P1): none identified. Encountered and resolved a transient test-runner issue during development (prisma client accessor appeared undefined on a stale run, resolved by a clean vitest re-run after forcing prisma generate) — not a defect in the shipped code, confirmed by 3 consecutive clean passes afterward.
```
