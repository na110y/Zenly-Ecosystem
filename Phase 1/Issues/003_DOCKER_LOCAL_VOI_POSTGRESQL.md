# P1-I003 — Docker local với PostgreSQL

**Stage:** foundation  
**Status:** DONE  
**Depends on:** 001, 002  
**Canonical modules — read fully:** P1-ARCH, P1-INFRA  
**Previous:** [P1-I002](./002_KIEM_TRA_CAU_HINH_MOI_TRUONG.md) · **Index:** [Atomic Issue Index](./00_ISSUE_INDEX.md) · **Next:** [P1-I004](./004_PRISMA_MIGRATION_VA_SEED_NEN.md)

## Objective

Đảm bảo `docker-compose.yml` cục bộ khởi động đúng `app` + `db` (+ `db-test`) theo `P1-INFRA §1`, biến môi trường tuân thủ ngưỡng validate của `P1-I002` (≥32 byte, không placeholder dev khi `NODE_ENV=production`), và `app` container thực sự kết nối được PostgreSQL container.

## Allowed change surface

`docker-compose.yml`; `Dockerfile`; `.dockerignore`; `.env.example`. Không thêm service ngoài `app`/`db`/`db-test` (không Redis/broker — khớp `P1-SCOPE §3.1`, `P1-INFRA` header).

## Required implementation

- Sửa `docker-compose.yml`: service `app` hiện đặt `NODE_ENV: production` nhưng dùng secret placeholder dev (`change_me`, `dev_*`, và `NUXT_VISITOR_HMAC_KEY` chỉ 20 byte) — sau `P1-I002`, container này sẽ bị `EnvValidationError` chặn boot đúng như thiết kế. Local Docker Compose không phải production thật, nên đổi `app.environment.NODE_ENV` thành `development` để hợp lệ với validate hiện có, đồng thời set lại `NUXT_VISITOR_HMAC_KEY` (và mọi secret khác) đủ ≥32 byte để nhất quán với `.env.example` đã sửa ở `P1-I002`.
- Xác nhận `db`/`db-test` healthcheck, volume, cổng đúng theo `P1-INFRA §1` (đã có sẵn, chỉ audit không viết lại nếu đã đúng).
- Xác nhận `Dockerfile` build image `app` chạy được `node .output/server/index.mjs` sau `pnpm build` (audit, sửa nếu thiếu bước).
- Không cấu hình secret thật, không thêm service thứ hai ngoài đã liệt kê.

## Tests required in the same change

- Smoke test thủ công có ghi log: `docker compose up -d db db-test`, xác nhận cả hai container `healthy`/accept connections.
- Smoke test thủ công: `docker compose up -d app` sau khi `db` healthy, xác nhận `app` container không bị `EnvValidationError` (log sạch, container ở trạng thái running, không restart loop).
- Xác nhận `app` container trả HTTP 200 tại route gốc qua cổng map `3000`.
- `docker compose down` dọn sạch, không rác container/network treo lại (kiểm tra bằng `docker compose ps`).

## Acceptance gate

- Dependencies 001, 002 đã DONE; canonical modules đã đọc đầy đủ.
- `app` container boot thành công qua validate `P1-I002` thật (không bypass/mock).
- Không thêm service ngoài `app`/`db`/`db-test`; ngân sách VPS 2 GB không bị ảnh hưởng bởi thay đổi này (không đổi image/resource limit).
- Không có secret thật trong file được track.
- Rollback: revert `docker-compose.yml`/`Dockerfile` bằng git revert; không có migration/state phá hủy.

## Completion evidence

```text
Issue: P1-I003
Canonical requirement sections: P1-INFRA §1 (docker services app/db/db-test), §2 (env vars, validated by P1-I002), §3 (2 GB budget, no new service); P1-ARCH §1 (one app process, no second service)
Dependencies verified: 001 DONE, 002 DONE
Exact files changed: docker-compose.yml (app.environment.NODE_ENV production -> development to match local-compose reality; NUXT_VISITOR_HMAC_KEY lengthened from 20 to >=32 bytes so P1-I002 validation accepts it)
Migration/schema result: none
API/UI result: none
Unit/component tests: not applicable (infra config change, no application code)
Integration/contract tests: not applicable
E2E/security/performance tests: manual Docker Compose smoke test with evidence: (1) `docker compose up -d db db-test` -> both accept connections (pg_isready confirmed on both); (2) `docker compose up -d --build app` -> image rebuilt, app container started and stayed up (verified 10s+ without restart loop), no EnvValidationError in logs; (3) curl http://localhost:3000/ -> HTTP 200; (4) `docker compose down` -> all 3 containers + network removed cleanly, `docker compose ps -a` empty, no orphaned resources; (5) `docker compose up -d` (full stack) restored to running state matching pre-change state, HTTP 200 reconfirmed
Coverage delta: unchanged (no application code touched)
Acceptance items satisfied: (1) dependencies 001/002 DONE, canonical modules read in full; (2) app container boot verified through real P1-I002 validation (previously would have failed: NODE_ENV was production with dev-placeholder secrets and a 20-byte key, both now fixed to be internally consistent); (3) no service added beyond app/db/db-test, no image/resource-limit change so 2 GB budget unaffected; (4) no secret leaked (dev placeholders only, matches .env.example pattern); (5) rollback via git revert, no destructive state
Rollback/compensation: git revert of docker-compose.yml; no volumes/data affected by this change
Known limitations (no P0/P1): db-test has no healthcheck block in compose (pre-existing, not part of this issue's objective — app only depends_on db, not db-test); Dockerfile itself still hardcodes ENV NODE_ENV=production at the image layer, which is correct for real production images (P1-I090 will use this Dockerfile for prod) — docker-compose.yml's environment: override at container-run time is what makes local compose behave as development, and this override was confirmed to take precedence via `docker compose config`
```
