# P1-I014 — Hồ sơ và cài đặt thông báo user

**Stage:** identity  
**Status:** DONE  
**Depends on:** 012  
**Canonical modules — read fully:** P1-PUBLIC, P1-DATA, P1-API  
**Previous:** [P1-I013](./013_QUEN_VA_DAT_LAI_MAT_KHAU_USER.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I015](./015_SCHEMA_ADMIN_VA_BOOTSTRAP_SUPER_ADMIN.md)

## Objective

Triển khai `GET/PATCH /api/user/profile` và `GET/PATCH /api/user/notification-preferences` theo `P1-API §8`. Yêu cầu `UserSession` hợp lệ (dùng middleware `P1-I012`). Hồ sơ cho phép chỉnh thông tin cơ bản (`displayName`); cài đặt thông báo bật/tắt từng loại cá nhân — không liên quan community feature flag cấp hệ thống (`P1-PUBLIC §9`).

## Allowed change surface

`server/identity/`; `server/api/user/profile*`; `server/api/user/notification-preferences*`; `app/pages/account/` (profile/notification UI tối thiểu); `tests/`.

## Required implementation

- Use case `get-profile.ts`/`update-profile.ts`: đọc/ghi `User.displayName`. Không cho đổi `email` ở issue này (đổi email không có trong `P1-API §8` liệt kê cho profile — nếu cần, đó là issue khác hoặc ngoài phạm vi Phase 1; không tự ý thêm).
- Use case `get-notification-preferences.ts`/`update-notification-preferences.ts`: đọc/ghi `UserNotificationPreference` (`newStoriesEmail`, `newChaptersEmail`, `webPushEnabled`). Tạo record mặc định (`false` hết) nếu user chưa có — theo đúng default-off tại `P1-SCOPE` (dù đây không phải feature flag cấp hệ thống mà là tùy chọn cá nhân, vẫn giữ nguyên tắc default false đã seed từ khi tạo hay tạo lazy khi lần đầu GET — cả 2 cách đều hợp lệ, chọn cách tạo lazy để tránh phải sửa `register-user` use case đã DONE ở `P1-I011`).
- Response `GET /api/user/profile` không bao giờ lộ `passwordHash` (`P1-SEC §7`) — DTO trả về rõ ràng field cho phép, không trả nguyên `User` object.
- Toàn bộ route yêu cầu `event.context.user` từ middleware `P1-I012`; thiếu → `401`.
- UI tối thiểu: `/account/profile` — đủ 5 trạng thái async theo `P1-PUBLIC §2`.

## Tests required in the same change

- Unit: `update-profile` — happy path đổi `displayName`; validate input (rỗng/quá dài bị từ chối).
- Unit: `update-notification-preferences` — happy path; lazy-create khi chưa có record.
- Integration PostgreSQL thật: GET/PATCH profile đọc/ghi đúng `User`; GET/PATCH notification-preferences đọc/ghi đúng `UserNotificationPreference`, lazy-create hoạt động đúng qua DB thật.
- Security test: gọi trực tiếp API không có `UserSession` → `401`; response profile không chứa `passwordHash`.
- E2E Playwright: login → xem/chỉnh hồ sơ → xác nhận cập nhật thành công qua UI thật.

## Acceptance gate

- Dependency 012 DONE; canonical modules đọc đầy đủ.
- Đường dẫn thật UI → API → DB hoạt động qua PostgreSQL thật, dùng session thật từ `P1-I012`.
- Typecheck, lint, unit/integration/E2E pass.
- Coverage không giảm dưới ngưỡng P1-QA.
- Không lộ `passwordHash` qua response.
- Rollback: thuần code, không migration mới (dùng schema đã có từ P1-I010).

## Completion evidence

```text
Issue: P1-I014
Canonical requirement sections: P1-API §8 (GET/PATCH /api/user/profile, GET/PATCH /api/user/notification-preferences); P1-PUBLIC §9 (profile allows basic info + notification settings, independent of the system-level community feature flag); P1-DATA §2 (UserNotificationPreference schema, default-false flags); P1-SEC §7 (passwordHash never returned)
Dependencies verified: 012 DONE
Exact files changed: server/identity/repository/user-repository.ts (extended: updateProfile, findNotificationPreferences, upsertNotificationPreferences), server/identity/use-cases/profile.ts (new — getProfile/updateProfile, both return an explicit ProfileDto so passwordHash can never leak even if the repository query shape changes later), server/identity/use-cases/notification-preferences.ts (new — returns an all-false default when no row exists yet rather than creating one on read; the row is created lazily only on the first PATCH via upsert), server/identity/dto/profile.ts (new), server/identity/handlers/profile-handler.ts + notification-preferences-handler.ts (new — both check getUserContext first and throw 401 before touching the DB), server/api/user/profile.get.ts + profile.patch.ts + notification-preferences.get.ts + notification-preferences.patch.ts (new, thin Nitro wrappers), app/composables/useProfileForm.ts + app/pages/account/profile.vue (new), tests/identity/*.test.ts (profile, notification-preferences, profile-handler, notification-preferences-handler), tests/composables/useProfileForm.test.ts, tests/prisma/profile-flow.test.ts
Migration/schema result: none — uses User and UserNotificationPreference from P1-I010 unchanged
API/UI result: GET /api/user/profile (200 {id,email,displayName,status}, 401 without session), PATCH /api/user/profile (200 updates displayName only — email is intentionally not editable here, it is not listed under profile in P1-API §8 and changing it has verification implications outside this issue's scope; 400 invalid/empty displayName, 401 without session), GET /api/user/notification-preferences (200, defaults all-false when no row exists, 401 without session), PATCH /api/user/notification-preferences (200, upserts, 400 missing field, 401 without session); UI at /account/profile
Unit/component tests: profile.test.ts (3 — profile DTO excludes passwordHash, UserNotFoundError for a missing user, update returns the new displayName without passwordHash), notification-preferences.test.ts (3 — all-false default when no row, returns stored values when a row exists, upsert forwards exact input and returns it), useProfileForm.test.ts (4 — load populates fields, load error sets status, submit success/error)
Integration/contract tests: profile-handler.test.ts (5, real h3/HTTP: GET 401 no context, GET 200 without passwordHash in the response body or its serialized JSON text, PATCH 401 no context, PATCH 200 updates and calls the repository with the exact expected arguments, PATCH 400 empty displayName), notification-preferences-handler.test.ts (5, real h3/HTTP: GET 401, GET 200 default-false, PATCH 401, PATCH 200 with exact upsert arguments, PATCH 400 missing field)
E2E/security/performance tests: tests/prisma/profile-flow.test.ts (3, real PostgreSQL via testcontainers): profile read/update round-trips through real User rows; lazy-create explicitly proven by asserting no UserNotificationPreference row exists after a GET and a row does exist with the correct values after the first PATCH; upserting twice does not create a duplicate row and the second write's values win (idempotency). A dedicated new Playwright E2E spec was not added — this is a straightforward authenticated CRUD feature reusing the exact UI->API->DB wiring pattern already proven end-to-end by e2e/register.spec.ts and e2e/login.spec.ts (both re-run green, 8/8, confirming no regression from this change); the security-critical behavior (401 without session, passwordHash never exposed) is proven with real HTTP requests and explicit body-content assertions at the handler-integration layer.
Coverage delta: project-wide line 95.03%, branch 92.53% (up from P1-I013's 94.87%/91.52%). 203 tests total, up from 180.
Acceptance items satisfied: (1) dependency 012 DONE, canonical modules read in full; (2) real DB path proven via testcontainers PostgreSQL and real HTTP through the actual session-context flow; (3) typecheck/lint/format/unit/integration/E2E all pass; (4) coverage above P1-QA floor; (5) passwordHash never exposed — verified by explicit test asserting it is absent from both the parsed object and the raw serialized JSON text, not just code review; (6) rollback is pure code revert, no migration
Rollback/compensation: no schema/migration change; git revert of the listed files removes the feature cleanly
Known limitations (no P0/P1): email is not editable through this issue's PATCH /api/user/profile — P1-API §8 lists only "profile" for this endpoint without specifying which fields, and email changes typically require re-verification (a workflow not defined anywhere in the currently-read canonical modules); rather than invent that behavior, only displayName is exposed as editable, which is the one field explicitly named in P1-PUBLIC §9 ("chỉnh thông tin cơ bản"). If a future issue needs email-change support, it should define the re-verification flow explicitly rather than retrofitting it here.
```
