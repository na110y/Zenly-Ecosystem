# PHASE 1 — ATOMIC ISSUE INDEX

**Version:** 2.2-execution.1  
**Canonical requirements:** Phase 1 v2.2 modules remain LOCKED. This folder only sequences implementation.

> AI must read: `Zenly_Ecosystem_Phase_1_Plan.md` → this index → exactly one issue → every canonical module named in that issue. Do not load all issues at once.

## Execution rules

1. Work on exactly one issue at a time. Parallel work is allowed only when dependencies do not overlap.
2. An issue may not redefine business rules, schema, role, API, flag or acceptance. Canonical module wins; conflict means `SPEC_CONFLICT` and stop.
3. Tests ship in the same change as implementation. Final regression issues supplement them; they do not excuse missing per-issue tests.
4. Before code, print: issue ID, dependencies verified, canonical modules read, intended files, migrations/API/UI impact.
5. Before close, provide: changed files, migration result, unit/integration/E2E evidence as applicable, coverage delta, acceptance mapping and rollback note.
6. Do not start the next issue until every dependency is DONE and current issue gates pass.

## Status legend

`TODO` → `IN_PROGRESS` → `BLOCKED` or `DONE`. Only update status/evidence; do not edit requirement meaning here.

## Ordered issue registry

| Order | Issue                                                                                                             | Stage      | Depends on                   | Canonical modules                            | Status |
| ------:| -------------------------------------------------------------------------------------------------------------------| ------------| ------------------------------| ----------------------------------------------| --------|
| 001   | [P1-I001 — Khởi tạo Nuxt Nitro strict](001_KHOI_TAO_NUXT_NITRO_STRICT.md)                                         | foundation | —                            | P1-SCOPE, P1-ARCH, P1-QA                     | DONE   |
| 002   | [P1-I002 — Kiểm tra cấu hình môi trường](002_KIEM_TRA_CAU_HINH_MOI_TRUONG.md)                                     | foundation | 001                          | P1-ARCH, P1-SEC, P1-INFRA                    | TODO   |
| 003   | [P1-I003 — Docker local với PostgreSQL](003_DOCKER_LOCAL_VOI_POSTGRESQL.md)                                       | foundation | 001, 002                     | P1-ARCH, P1-INFRA                            | TODO   |
| 004   | [P1-I004 — Prisma migration và seed nền](004_PRISMA_MIGRATION_VA_SEED_NEN.md)                                     | foundation | 003                          | P1-DATA, P1-QA                               | TODO   |
| 005   | [P1-I005 — Chuẩn response lỗi và request context](005_CHUAN_RESPONSE_LOI_VA_REQUEST_CONTEXT.md)                   | foundation | 001, 002                     | P1-API, P1-SEC                               | TODO   |
| 006   | [P1-I006 — CI nền và quality gate tối thiểu](006_CI_NEN_VA_QUALITY_GATE_TOI_THIEU.md)                             | foundation | 001, 004, 005                | P1-QA                                        | TODO   |
| 010   | [P1-I010 — Schema user và session public](010_SCHEMA_USER_VA_SESSION_PUBLIC.md)                                   | identity   | 004                          | P1-DATA, P1-SEC                              | TODO   |
| 011   | [P1-I011 — Đăng ký và xác minh email user](011_DANG_KY_VA_XAC_MINH_EMAIL_USER.md)                                 | identity   | 002, 010                     | P1-PUBLIC, P1-FLOW, P1-API, P1-SEC           | TODO   |
| 012   | [P1-I012 — Login logout và session user](012_LOGIN_LOGOUT_VA_SESSION_USER.md)                                     | identity   | 010, 011                     | P1-FLOW, P1-API, P1-SEC                      | TODO   |
| 013   | [P1-I013 — Quên và đặt lại mật khẩu user](013_QUEN_VA_DAT_LAI_MAT_KHAU_USER.md)                                   | identity   | 010, 012                     | P1-PUBLIC, P1-API, P1-SEC                    | TODO   |
| 014   | [P1-I014 — Hồ sơ và cài đặt thông báo user](014_HO_SO_VA_CAI_DAT_THONG_BAO_USER.md)                               | identity   | 012                          | P1-PUBLIC, P1-DATA, P1-API                   | TODO   |
| 015   | [P1-I015 — Schema admin và bootstrap Super Admin](015_SCHEMA_ADMIN_VA_BOOTSTRAP_SUPER_ADMIN.md)                   | identity   | 004, 002                     | P1-ADMIN, P1-DATA, P1-SEC                    | TODO   |
| 016   | [P1-I016 — Thiết lập TOTP lần đầu](016_THIET_LAP_TOTP_LAN_DAU.md)                                                 | identity   | 015                          | P1-ADMIN, P1-FLOW, P1-API, P1-SEC            | TODO   |
| 017   | [P1-I017 — Đăng nhập Admin bắt buộc TOTP](017_DANG_NHAP_ADMIN_BAT_BUOC_TOTP.md)                                   | identity   | 016, 005                     | P1-ADMIN, P1-FLOW, P1-API, P1-SEC            | TODO   |
| 018   | [P1-I018 — RBAC middleware và menu theo role](018_RBAC_MIDDLEWARE_VA_MENU_THEO_ROLE.md)                           | identity   | 017                          | P1-ADMIN, P1-API, P1-SEC                     | TODO   |
| 019   | [P1-I019 — Quản trị admin và bảo vệ Super Admin cuối](019_QUAN_TRI_ADMIN_VA_BAO_VE_SUPER_ADMIN_CUOI.md)           | identity   | 018                          | P1-ADMIN, P1-DATA, P1-SEC                    | TODO   |
| 020   | [P1-I020 — Runtime feature flags và System UI](020_RUNTIME_FEATURE_FLAGS_VA_SYSTEM_UI.md)                         | identity   | 018, 019                     | P1-ADMIN, P1-DATA, P1-API                    | TODO   |
| 030   | [P1-I030 — Schema truyện và repository](030_SCHEMA_TRUYEN_VA_REPOSITORY.md)                                       | stories    | 004                          | P1-DATA, P1-FLOW                             | TODO   |
| 031   | [P1-I031 — Admin CRUD bộ truyện](031_ADMIN_CRUD_BO_TRUYEN.md)                                                     | stories    | 018, 030                     | P1-ADMIN, P1-API, P1-SEC                     | TODO   |
| 032   | [P1-I032 — Upload và xử lý ảnh bìa](032_UPLOAD_VA_XU_LY_ANH_BIA.md)                                               | stories    | 031                          | P1-ADMIN, P1-SEC, P1-PERF                    | TODO   |
| 033   | [P1-I033 — Schema chương và private TXT storage](033_SCHEMA_CHUONG_VA_PRIVATE_TXT_STORAGE.md)                     | stories    | 030                          | P1-DATA, P1-SEC                              | TODO   |
| 034   | [P1-I034 — Admin CRUD một chương TXT](034_ADMIN_CRUD_MOT_CHUONG_TXT.md)                                           | stories    | 031, 033                     | P1-ADMIN, P1-API, P1-SEC                     | TODO   |
| 035   | [P1-I035 — Bulk import TXT bằng admin job](035_BULK_IMPORT_TXT_BANG_ADMIN_JOB.md)                                 | stories    | 034                          | P1-ADMIN, P1-DATA, P1-API                    | TODO   |
| 036   | [P1-I036 — Publish truyện/chương và publication event](036_PUBLISH_TRUYEN_CHUONG_VA_PUBLICATION_EVENT.md)         | stories    | 031, 034                     | P1-FLOW, P1-DATA, P1-API                     | TODO   |
| 037   | [P1-I037 — Kho truyện public và chi tiết truyện](037_KHO_TRUYEN_PUBLIC_VA_CHI_TIET_TRUYEN.md)                     | stories    | 036                          | P1-PUBLIC, P1-API, P1-PERF                   | TODO   |
| 038   | [P1-I038 — Trang đọc chương và CTA nghe YouTube](038_TRANG_DOC_CHUONG_VA_CTA_NGHE_YOUTUBE.md)                     | stories    | 033, 036, 037                | P1-PUBLIC, P1-FLOW, P1-API, P1-SEC           | TODO   |
| 039   | [P1-I039 — Public counters truyện](039_PUBLIC_COUNTERS_TRUYEN.md)                                                 | stories    | 036, 038                     | P1-PUBLIC, P1-DATA, P1-API                   | TODO   |
| 040   | [P1-I040 — Schema feed và bài chính thức](040_SCHEMA_FEED_VA_BAI_CHINH_THUC.md)                                   | community  | 004, 018                     | P1-DATA, P1-ADMIN                            | TODO   |
| 041   | [P1-I041 — Feed public cursor và UI tải dần](041_FEED_PUBLIC_CURSOR_VA_UI_TAI_DAN.md)                             | community  | 037, 040                     | P1-PUBLIC, P1-API, P1-PERF                   | TODO   |
| 042   | [P1-I042 — User posting text-only bị khóa mặc định](042_USER_POSTING_TEXT_ONLY_BI_KHOA_MAC_DINH.md)               | community  | 012, 020, 040                | P1-SCOPE, P1-PUBLIC, P1-API, P1-SEC          | TODO   |
| 043   | [P1-I043 — Visitor identity an toàn cho guest](043_VISITOR_IDENTITY_AN_TOAN_CHO_GUEST.md)                         | community  | 002                          | P1-PUBLIC, P1-DATA, P1-SEC                   | TODO   |
| 044   | [P1-I044 — Like và unlike cho guest/user](044_LIKE_VA_UNLIKE_CHO_GUEST_USER.md)                                   | community  | 012, 039, 041, 043           | P1-PUBLIC, P1-DATA, P1-API                   | TODO   |
| 045   | [P1-I045 — Tạo và liệt kê comment](045_TAO_VA_LIET_KE_COMMENT.md)                                                 | community  | 038, 043                     | P1-PUBLIC, P1-FLOW, P1-DATA, P1-API          | TODO   |
| 046   | [P1-I046 — Reply và quyền sửa xóa 15 phút](046_REPLY_VA_QUYEN_SUA_XOA_15_PHUT.md)                                 | community  | 045                          | P1-PUBLIC, P1-FLOW, P1-API, P1-SEC           | TODO   |
| 047   | [P1-I047 — Admin moderation post và comment](047_ADMIN_MODERATION_POST_VA_COMMENT.md)                             | community  | 018, 040, 045, 046           | P1-ADMIN, P1-API, P1-DATA                    | TODO   |
| 048   | [P1-I048 — Automated moderation adapter](048_AUTOMATED_MODERATION_ADAPTER.md)                                     | community  | 045                          | P1-SEC, P1-QA                                | TODO   |
| 049   | [P1-I049 — Rate limit spam CAPTCHA và micro-batch comment](049_RATE_LIMIT_SPAM_CAPTCHA_VA_MICRO_BATCH_COMMENT.md) | community  | 043, 045, 048                | P1-SEC, P1-DATA, P1-INFRA                    | TODO   |
| 050   | [P1-I050 — Abuse Guard và block UI Super Admin](050_ABUSE_GUARD_VA_BLOCK_UI_SUPER_ADMIN.md)                       | community  | 018, 049                     | P1-ADMIN, P1-DATA, P1-SEC                    | TODO   |
| 060   | [P1-I060 — Contact capture và consent ledger](060_CONTACT_CAPTURE_VA_CONSENT_LEDGER.md)                           | engagement | 043                          | P1-PUBLIC, P1-DATA, P1-SEC                   | TODO   |
| 061   | [P1-I061 — Yêu cầu truyện cho guest và user](061_YEU_CAU_TRUYEN_CHO_GUEST_VA_USER.md)                             | engagement | 012, 060                     | P1-PUBLIC, P1-FLOW, P1-DATA, P1-API          | TODO   |
| 062   | [P1-I062 — Subscription email xác minh và hủy nhận](062_SUBSCRIPTION_EMAIL_XAC_MINH_VA_HUY_NHAN.md)               | engagement | 011, 037, 060                | P1-PUBLIC, P1-DATA, P1-API, P1-SEC           | TODO   |
| 063   | [P1-I063 — Đăng ký Web Push](063_DANG_KY_WEB_PUSH.md)                                                             | engagement | 020, 062                     | P1-PUBLIC, P1-DATA, P1-API, P1-PERF          | TODO   |
| 064   | [P1-I064 — Notification chuông trong website](064_NOTIFICATION_CHUONG_TRONG_WEBSITE.md)                           | engagement | 012, 036                     | P1-PUBLIC, P1-DATA, P1-API                   | TODO   |
| 065   | [P1-I065 — Publication fan-out và outbox chống trùng](065_PUBLICATION_FAN_OUT_VA_OUTBOX_CHONG_TRUNG.md)           | engagement | 036, 062, 063, 064           | P1-FLOW, P1-DATA, P1-QA                      | TODO   |
| 066   | [P1-I066 — Worker gửi email và Web Push](066_WORKER_GUI_EMAIL_VA_WEB_PUSH.md)                                     | engagement | 002, 065                     | P1-FLOW, P1-INFRA, P1-QA                     | TODO   |
| 067   | [P1-I067 — Cost guard quota và ưu tiên email bắt buộc](067_COST_GUARD_QUOTA_VA_UU_TIEN_EMAIL_BAT_BUOC.md)         | engagement | 066                          | P1-ADMIN, P1-INFRA, P1-QA                    | TODO   |
| 068   | [P1-I068 — Công tắc auto-send chỉ Super Admin](068_CONG_TAC_AUTO_SEND_CHI_SUPER_ADMIN.md)                         | engagement | 020, 065, 067                | P1-ADMIN, P1-FLOW, P1-API                    | TODO   |
| 070   | [P1-I070 — Tracking link CRUD và redirect](070_TRACKING_LINK_CRUD_VA_REDIRECT.md)                                 | analytics  | 018, 005                     | P1-ADMIN, P1-FLOW, P1-DATA, P1-API           | TODO   |
| 071   | [P1-I071 — Attribution visitor và session analytics](071_ATTRIBUTION_VISITOR_VA_SESSION_ANALYTICS.md)             | analytics  | 043, 070                     | P1-FLOW, P1-DATA, P1-SEC                     | TODO   |
| 072   | [P1-I072 — Ghi analytics event không chậm request](072_GHI_ANALYTICS_EVENT_KHONG_CHAM_REQUEST.md)                 | analytics  | 071                          | P1-FLOW, P1-DATA, P1-INFRA                   | TODO   |
| 073   | [P1-I073 — Aggregate analytics hằng ngày](073_AGGREGATE_ANALYTICS_HANG_NGAY.md)                                   | analytics  | 072                          | P1-DATA, P1-API                              | TODO   |
| 074   | [P1-I074 — Dashboard analytics Admin](074_DASHBOARD_ANALYTICS_ADMIN.md)                                           | analytics  | 073, 018                     | P1-ADMIN, P1-API, P1-PERF                    | TODO   |
| 075   | [P1-I075 — Current online users bằng polling](075_CURRENT_ONLINE_USERS_BANG_POLLING.md)                           | analytics  | 071                          | P1-ADMIN, P1-FLOW, P1-DATA                   | TODO   |
| 080   | [P1-I080 — Security headers CSRF CORS và CSP](080_SECURITY_HEADERS_CSRF_CORS_VA_CSP.md)                           | hardening  | 005, 012, 017                | P1-SEC, P1-INFRA                             | TODO   |
| 081   | [P1-I081 — Quyền riêng tư export và copyright workflow](081_QUYEN_RIENG_TU_EXPORT_VA_COPYRIGHT_WORKFLOW.md)       | hardening  | 060, 018                     | P1-PUBLIC, P1-ADMIN, P1-DATA, P1-SEC, P1-REF | TODO   |
| 082   | [P1-I082 — SEO metadata và structured data](082_SEO_METADATA_VA_STRUCTURED_DATA.md)                               | hardening  | 037, 038                     | P1-PERF, P1-PUBLIC                           | TODO   |
| 083   | [P1-I083 — Robots sitemap và crawler policy](083_ROBOTS_SITEMAP_VA_CRAWLER_POLICY.md)                             | hardening  | 036, 082, 050                | P1-PERF, P1-SEC                              | TODO   |
| 084   | [P1-I084 — Cache matrix và invalidation](084_CACHE_MATRIX_VA_INVALIDATION.md)                                     | hardening  | 036, 041, 047, 068           | P1-PERF, P1-SEC                              | TODO   |
| 085   | [P1-I085 — PWA manifest và service worker an toàn](085_PWA_MANIFEST_VA_SERVICE_WORKER_AN_TOAN.md)                 | hardening  | 063, 084                     | P1-PERF, P1-PUBLIC                           | TODO   |
| 086   | [P1-I086 — Mobile UX accessibility và performance budget](086_MOBILE_UX_ACCESSIBILITY_VA_PERFORMANCE_BUDGET.md)   | hardening  | 041, 038, 074, 085           | P1-PUBLIC, P1-ADMIN, P1-PERF, P1-QA          | TODO   |
| 090   | [P1-I090 — Production Compose Caddy TLS](090_PRODUCTION_COMPOSE_CADDY_TLS.md)                                     | infra      | 003, 080, 084                | P1-INFRA, P1-ARCH, P1-SEC                    | TODO   |
| 091   | [P1-I091 — Tuning VPS 2 GB và resource guard](091_TUNING_VPS_2_GB_VA_RESOURCE_GUARD.md)                           | infra      | 090, 072, 084                | P1-INFRA, P1-PERF                            | TODO   |
| 092   | [P1-I092 — Health readiness migration và deploy rollback](092_HEALTH_READINESS_MIGRATION_VA_DEPLOY_ROLLBACK.md)   | infra      | 090, 006                     | P1-INFRA, P1-QA                              | TODO   |
| 093   | [P1-I093 — Backup ngoài VPS 0đ và restore](093_BACKUP_NGOAI_VPS_0D_VA_RESTORE.md)                                 | infra      | 033, 032, 090                | P1-INFRA, P1-DATA, P1-SEC                    | TODO   |
| 094   | [P1-I094 — Observability uptime và cảnh báo tối thiểu](094_OBSERVABILITY_UPTIME_VA_CANH_BAO_TOI_THIEU.md)         | infra      | 091, 092                     | P1-INFRA, P1-ADMIN                           | TODO   |
| 100   | [P1-I100 — Test harness PostgreSQL và fixtures](100_TEST_HARNESS_POSTGRESQL_VA_FIXTURES.md)                       | quality    | 004, 006                     | P1-QA                                        | TODO   |
| 101   | [P1-I101 — Regression suite Auth RBAC 2FA Flags](101_REGRESSION_SUITE_AUTH_RBAC_2FA_FLAGS.md)                     | quality    | 020, 100                     | P1-QA, P1-ACCEPT                             | TODO   |
| 102   | [P1-I102 — Regression suite CMS publish và import](102_REGRESSION_SUITE_CMS_PUBLISH_VA_IMPORT.md)                 | quality    | 039, 100                     | P1-QA, P1-ACCEPT                             | TODO   |
| 103   | [P1-I103 — Regression suite Community và moderation](103_REGRESSION_SUITE_COMMUNITY_VA_MODERATION.md)             | quality    | 050, 100                     | P1-QA, P1-ACCEPT                             | TODO   |
| 104   | [P1-I104 — Regression suite Notification và quota](104_REGRESSION_SUITE_NOTIFICATION_VA_QUOTA.md)                 | quality    | 068, 100                     | P1-QA, P1-ACCEPT                             | TODO   |
| 105   | [P1-I105 — Regression suite Analytics cache SEO Security](105_REGRESSION_SUITE_ANALYTICS_CACHE_SEO_SECURITY.md)   | quality    | 086, 100                     | P1-QA, P1-ACCEPT                             | TODO   |
| 106   | [P1-I106 — Load soak trên cấu hình VPS 2 GB](106_LOAD_SOAK_TREN_CAU_HINH_VPS_2_GB.md)                             | quality    | 091, 101, 102, 103, 104, 105 | P1-QA, P1-INFRA, P1-ACCEPT                   | TODO   |
| 107   | [P1-I107 — Staging acceptance và migration rehearsal](107_STAGING_ACCEPTANCE_VA_MIGRATION_REHEARSAL.md)           | quality    | 092, 093, 106                | P1-ROADMAP, P1-QA, P1-ACCEPT                 | TODO   |
| 108   | [P1-I108 — Production go-live và runbook](108_PRODUCTION_GO_LIVE_VA_RUNBOOK.md)                                   | quality    | 094, 107                     | P1-INFRA, P1-ACCEPT                          | TODO   |

## Definition of Ready

- Dependencies are DONE and their migrations are applied.
- Canonical modules are readable and contain no unresolved contradiction.
- Inputs, provider keys/test doubles and test database are available.
- Scope fits this single issue; otherwise stop and split without changing requirements.

## Definition of Done

- Implementation, tests and docs for this issue are in the same PR/change.
- Happy path, invalid input, authorization/ownership, state boundary, retry/idempotency/concurrency/provider failure are covered wherever applicable.
- PostgreSQL integration tests use PostgreSQL, never SQLite substitution.
- Project gates remain at least 90% line and 85% branch; critical business branches defined in P1-QA are fully exercised.
- No P0/P1 defect, no unexplained flaky/skipped test, no secret/PII/cache leakage.
- Evidence template in the issue is completed.

