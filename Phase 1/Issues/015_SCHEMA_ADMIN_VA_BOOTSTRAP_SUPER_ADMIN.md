# P1-I015 — Schema admin và bootstrap Super Admin

**Stage:** identity  
**Status:** DONE  
**Depends on:** 004, 002  
**Canonical modules — read fully:** P1-ADMIN, P1-DATA, P1-SEC  
**Previous:** [P1-I014](./014_HO_SO_VA_CAI_DAT_THONG_BAO_USER.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I016](./016_THIET_LAP_TOTP_LAN_DAU.md)

## Objective

Tạo migration Prisma cho toàn bộ bảng identity **admin** tại `P1-DATA §3`: `AdminAccount`, `AdminTotpCredential`, `AdminTotpRecoveryCode`, `AdminSession`, `AdminAuditLog`. Cung cấp cơ chế bootstrap tài khoản SUPER_ADMIN đầu tiên — canonical không định nghĩa cơ chế cụ thể (không có UI đăng ký admin, admin đầu tiên phải được tạo bằng cách nào đó ngoài luồng UI bình thường), nên issue này thiết kế bootstrap qua CLI script đọc credential từ biến môi trường, theo cùng pattern `prisma:seed`/`seed-cli.ts` đã có từ `P1-I004`. Không triển khai TOTP setup/login admin ở issue này (thuộc `P1-I016`/`P1-I017`).

## Allowed change surface

`prisma/`; `.env.example`; `tests/`. Không tạo route API admin, không tạo UI admin (thuộc issue sau).

## Required implementation

- Model `AdminAccount` đúng `P1-DATA §3`: `id UUID PK`, `email TEXT UNIQUE NOT NULL`, `passwordHash TEXT NOT NULL`, `role ENUM(ADMIN, SUPER_ADMIN) NOT NULL`, `status ENUM(ACTIVE, DISABLED) DEFAULT ACTIVE`, `createdAt`, `updatedAt`.
- Model `AdminTotpCredential`: `id`, `adminAccountId FK -> AdminAccount.id ON DELETE CASCADE UNIQUE`, `secretEncrypted TEXT NOT NULL` (mã hóa AES-256-GCM theo `P1-SEC §1`, khóa quản lý qua env — việc mã hóa thật thuộc `P1-I016`, issue này chỉ tạo cột đúng kiểu), `activatedAt TIMESTAMPTZ NULL`, `createdAt`.
- Model `AdminTotpRecoveryCode`: `id`, `adminAccountId FK CASCADE`, `codeHash TEXT NOT NULL`, `usedAt TIMESTAMPTZ NULL`, `createdAt`, index `(adminAccountId)`.
- Model `AdminSession`: `id`, `adminAccountId FK CASCADE`, `tokenHash TEXT UNIQUE NOT NULL`, `totpVerifiedAt TIMESTAMPTZ NULL` (NULL = challenge chưa hoàn tất), `expiresAt`, `revokedAt NULL`, `createdAt`, index `(adminAccountId)`, `(expiresAt)`.
- Model `AdminAuditLog`: `id`, `adminAccountId FK -> AdminAccount.id ON DELETE SET NULL`, `action TEXT NOT NULL`, `targetType TEXT NOT NULL`, `targetId TEXT NULL`, `beforeValue JSONB NULL`, `afterValue JSONB NULL`, `createdAt`, index `(targetType, targetId)`, `(createdAt)`.
- **Bổ sung FK treo từ P1-I004**: `FeatureFlag.updatedByAdminId` và `SystemSetting.updatedByAdminId` hiện là `UUID NULL` không có constraint (ghi rõ trong evidence P1-I004). Issue này là lần đầu `AdminAccount` tồn tại — thêm migration bổ sung gắn FK thật cho 2 cột đó theo đúng expand-pattern đã định trước (`.claude/rules/database.md`), không sửa migration cũ.
- Bootstrap script `prisma/bootstrap-super-admin.ts` (CLI qua `tsx`, theo pattern `seed-cli.ts`): đọc `BOOTSTRAP_SUPER_ADMIN_EMAIL`/`BOOTSTRAP_SUPER_ADMIN_PASSWORD` từ env, hash password bằng `argon2` (tái dùng `hashPassword` từ `P1-I011`), tạo `AdminAccount` role `SUPER_ADMIN` nếu chưa có admin nào tồn tại (idempotent — không tạo trùng nếu chạy lại, và an toàn khi đã có SUPER_ADMIN khác: script kiểm tra "chưa có AdminAccount nào" chứ không phải "chưa có SUPER_ADMIN nào", để tránh vô tình tạo thêm SUPER_ADMIN qua script mỗi lần deploy).
- Thêm placeholder vào `.env.example`: `BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_SUPER_ADMIN_PASSWORD` (rỗng, không giá trị thật).
- Không tạo TOTP thật ở bước bootstrap (không có secret/QR) — tài khoản SUPER_ADMIN đầu tiên tạo xong chưa kích hoạt được TOTP nên chưa login được cho tới khi `P1-I016` triển khai thiết lập TOTP; đây là giới hạn đã biết, không phải lỗi.

## Tests required in the same change

- Integration PostgreSQL thật: migration áp dụng thành công trên DB đã có sẵn dữ liệu từ các migration trước (không phá vỡ `FeatureFlag`/`SystemSetting`/`User*` hiện có).
- Integration: FK mới trên `FeatureFlag.updatedByAdminId`/`SystemSetting.updatedByAdminId` hoạt động đúng — set giá trị hợp lệ trỏ tới `AdminAccount` thật thành công; giá trị không tồn tại bị từ chối bởi constraint.
- Integration: bootstrap script tạo đúng 1 `AdminAccount` role `SUPER_ADMIN`, `passwordHash` không phải plaintext.
- Integration: chạy bootstrap script 2 lần không tạo thêm `AdminAccount` (idempotent).
- Test constraint: `AdminAccount.email` unique; `AdminTotpCredential.adminAccountId` unique (1-1); `AdminSession.tokenHash` unique.
- Test cascade: xóa `AdminAccount` xóa theo `AdminTotpCredential`/`AdminTotpRecoveryCode`/`AdminSession`; `AdminAuditLog.adminAccountId` set NULL (không xóa log).

## Acceptance gate

- Dependencies 004, 002 DONE; canonical modules đọc đầy đủ.
- Migration áp dụng qua PostgreSQL thật, không phá vỡ schema đã có.
- Không tạo route/UI admin ở issue này.
- Typecheck, lint, integration test pass; coverage không giảm dưới ngưỡng P1-QA.
- Không có secret thật trong file được track; `.env.example` chỉ chứa placeholder rỗng.
- Rollback: migration mới, expand-only (thêm bảng + thêm FK), không sửa dữ liệu hiện có; có thể rollback bằng cách xóa FK mới rồi drop bảng nếu cần.

## Completion evidence

```text
Issue: P1-I015
Canonical requirement sections: P1-DATA §3 (AdminAccount/AdminTotpCredential/AdminTotpRecoveryCode/AdminSession/AdminAuditLog columns, types, constraints; "luôn còn ít nhất một SUPER_ADMIN active" enforced at application layer, not this issue — that is P1-I019); P1-ADMIN §2 (admin auth requires password + TOTP, no bypass — TOTP itself is P1-I016, this issue only creates the account row a SUPER_ADMIN needs to exist before TOTP setup is possible), §3 (SUPER_ADMIN protection, deferred to P1-I019); P1-SEC §1 (AdminTotpCredential.secretEncrypted column typed for AES-256-GCM ciphertext — actual encryption logic is P1-I016's scope, this issue only creates the correctly-typed column)
Dependencies verified: 004 DONE, 002 DONE
Exact files changed: prisma/schema.prisma (added AdminRole/AdminStatus enums, AdminAccount/AdminTotpCredential/AdminTotpRecoveryCode/AdminSession/AdminAuditLog models; added the FK relation on FeatureFlag.updatedByAdminId and SystemSetting.updatedByAdminId that P1-I004 deliberately left unconstrained until AdminAccount existed), prisma/migrations/20260806033248_identity_admin_and_flag_fk/migration.sql (new — single migration creating all 5 admin tables plus the two FK ALTER TABLE statements; does not touch or rewrite any prior migration), prisma/bootstrap-super-admin.ts (new — pure function taking a PrismaClient, checks adminAccount.count() === 0 before creating; deliberately checks "any AdminAccount exists" rather than "any SUPER_ADMIN exists" so the script cannot be used to silently mint extra SUPER_ADMINs on repeated deploys once at least one admin of any role exists), prisma/bootstrap-super-admin-cli.ts (new, thin CLI wrapper reading BOOTSTRAP_SUPER_ADMIN_EMAIL/BOOTSTRAP_SUPER_ADMIN_PASSWORD from env, same split pattern as seed.ts/seed-cli.ts from P1-I004), package.json (added prisma:bootstrap-super-admin script), .env.example (added the two new env var placeholders, empty — no real credentials committed), tests/prisma/admin-schema.test.ts (new)
Migration/schema result: migration verified against both an ephemeral testcontainers PostgreSQL 17 instance and the real local docker db container; confirmed it does not break existing FeatureFlag/SystemSetting/User data from prior migrations; the FK backfill on FeatureFlag/SystemSetting.updatedByAdminId was verified to actually enforce referential integrity (a nonexistent adminId is rejected by the DB, a real one is accepted)
API/UI result: none — schema and bootstrap tooling only, no routes/UI per this issue's allowed change surface
Unit/component tests: none required beyond integration (pure schema + a single small function, fully exercised by real-DB integration tests)
Integration/contract tests: tests/prisma/admin-schema.test.ts (11 cases, real PostgreSQL): prior tables unaffected; FeatureFlag/SystemSetting FK accepts a real AdminAccount id and rejects a nonexistent one; AdminAccount.email uniqueness enforced at the DB constraint level; AdminTotpCredential enforces one-per-admin (unique adminAccountId); AdminSession.tokenHash uniqueness enforced; deleting an AdminAccount cascades to AdminTotpCredential/AdminTotpRecoveryCode/AdminSession but sets AdminAuditLog.adminAccountId to NULL rather than deleting the log row (audit trail survives account deletion, matching P1-DATA's ON DELETE SET NULL); bootstrapSuperAdmin creates exactly one SUPER_ADMIN with an argon2-hashed (never plaintext) password against a fresh ephemeral database with zero prior AdminAccount rows; running bootstrapSuperAdmin twice (second call with different email/password) does not create a second row — the first-created admin wins, proving the guard is a real DB count check under real conditions, not a mocked assumption
E2E/security/performance tests: manual verification against the real local docker db container (not just ephemeral testcontainers): ran the bootstrap CLI with real env vars, confirmed via direct psql query that exactly one SUPER_ADMIN row was created with the correct email/role/status; ran the CLI a second time with different credentials and confirmed via psql the row count stayed at 1 (idempotency holds against real persisted state, not just a fresh throwaway database)
Coverage delta: unchanged from P1-I014 (95.03% line / 92.53% branch) — prisma/*.ts tooling scripts are outside the vitest coverage scope (app/**, server/** only), consistent with the same treatment already established for prisma/seed.ts and prisma/client.ts in P1-I004; all 214 tests (up from 203) pass
Acceptance items satisfied: (1) dependencies 004/002 DONE, canonical modules read in full; (2) migration and bootstrap both executed through real PostgreSQL (ephemeral testcontainers AND the persistent local docker db), not mocked; (3) no route/UI created, staying within the schema-only allowed change surface; (4) typecheck/lint/format/coverage/build/cycles all pass; (5) no real secret committed — .env.example placeholders are empty, the local docker db credentials used for manual verification are dev-only and never committed; (6) rollback documented below
Rollback/compensation: this migration is purely additive (5 new tables + 2 new FK constraints on existing nullable columns) — no data was altered or destroyed; rollback is `prisma migrate resolve --rolled-back 20260806033248_identity_admin_and_flag_fk` followed by dropping the FK constraints and the 5 new tables/enums if needed; the AdminAccount row created by the manual bootstrap verification against the local db is real local dev data, not a concern for rollback since it is not committed anywhere
Known limitations (no P0/P1): the "at least one SUPER_ADMIN must remain active" invariant from P1-ADMIN §3 / P1-DATA §3 is explicitly NOT enforced by this issue — it is P1-I019's scope ("Quản trị admin và bảo vệ Super Admin cuối"), and this issue only creates the schema and the one-time initial-account bootstrap path. AdminTotpCredential.secretEncrypted currently accepts any TEXT value; the actual AES-256-GCM encryption/decryption logic is P1-I016's scope — this issue only guarantees the column exists with the correct type and constraints. A freshly-bootstrapped SUPER_ADMIN cannot log in yet (no TOTP credential, no admin login route) until P1-I016 and P1-I017 land — this is an expected, sequenced gap, not a defect.
```
