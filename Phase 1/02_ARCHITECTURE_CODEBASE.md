# P1-ARCH — Architecture & Codebase

**Phase:** 1 · **Version:** 2.2 · **Owns:** Kiến trúc modular monolith, công nghệ, module backend, repository và nguyên tắc small-VPS-first.
**Depends on:** [P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md)

[← P1-SCOPE](01_PRODUCT_SCOPE_RELEASE.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Kiến trúc ở đây phải tuân thủ nguyên vẹn invariant #1 của `P1-SCOPE §3`: một Nuxt/Nitro modular monolith + PostgreSQL + Caddy, chạy được trên VPS 2 GB, không Redis/microservice/queue server riêng.

## 1. Kiểu kiến trúc

- **Modular monolith** duy nhất: một Nuxt 4 (Nitro) application phục vụ cả SSR public UI, admin CMS UI và toàn bộ API — không tách thành nhiều service/process độc lập.
- **Một repository** (mono-repo đơn, không phải multi-package monorepo phức tạp) chứa toàn bộ `app/`, `server/`, `prisma/`.
- Không có application service thứ hai. Background/async work bắt buộc chạy trong cùng process Nitro hoặc một worker script dùng chung database, theo thiết kế outbox/job PostgreSQL-backed (chi tiết tại `P1-FLOW` và `P1-INFRA`) — không dùng broker riêng.

## 2. Technology stack (khóa theo `package.json` hiện có)

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Framework | Nuxt 4 / Nitro | SSR, server routes trong `server/api` |
| Ngôn ngữ | TypeScript (strict) | Không `any`, không unchecked cast, không tắt diagnostic |
| Database | PostgreSQL | Không SQLite kể cả trong test |
| ORM | Prisma (`@prisma/client`, `prisma`) | Schema tại `prisma/` |
| Auth/crypto | `argon2` (password hash), `jose` (JWT/session), `otpauth` (TOTP admin) | |
| Email | `resend` | Free-tier trong Phase 1, không auto-overage |
| Web Push | `web-push` | Opt-in, không dịch vụ trả phí thay thế |
| Ảnh | `sharp`, `@nuxt/image` | Xử lý cover ảnh, không lưu media user-uploaded trong bài đăng |
| Validation | `zod` | Runtime schema cho mọi request/DTO |
| UI | Vue 3, `vue-router`, `chart.js`/`vue-chartjs` (admin dashboard) | |
| SEO | `@nuxtjs/robots`, `@nuxtjs/sitemap` | |
| PWA | `@vite-pwa/nuxt` | Service worker an toàn, xem `P1-PERF` |
| Test | `vitest`, `@testcontainers/postgresql`, `@playwright/test`, `@stryker-mutator/*`, `msw` | PostgreSQL thật qua testcontainers cho integration test |
| Lint/format/deps | `eslint`, `prettier`, `knip`, `madge` | `check:cycles` giữ module boundary không có circular import |
| Reverse proxy / TLS | Caddy | Production, ngoài phạm vi Node process (xem `P1-INFRA`) |

Không thêm runtime dependency mới trừ khi issue hiện tại yêu cầu và đã đánh giá ngân sách VPS 2 GB (theo `.claude/rules/architecture.md`).

## 3. Cấu trúc thư mục

```
app/              # Nuxt UI: pages, components, composables (public + admin)
  assets/         # css, ảnh tĩnh
server/           # Nitro backend
  api/            # route handlers — mỏng, chỉ parse/validate/authN/authZ/gọi use case/map response
  <module>/       # domain module theo nghiệp vụ (xem mục 4)
prisma/           # schema.prisma, migrations, seed
storage/          # private file storage (TXT chương, ảnh bìa) — không public trực tiếp
docs/             # tài liệu kỹ thuật bổ sung ngoài Phase 1 spec
```

AI phải kiểm tra cấu trúc thật của repo trước khi tạo file mới; không giả định thư mục đã tồn tại nếu chưa thấy trên đĩa.

## 4. Module boundary (server-side)

Server code tổ chức theo **business module**, mỗi module sở hữu một domain (ví dụ: `identity`, `stories`, `community`, `notifications`, `analytics`, `moderation`, `admin`). Quy tắc:

- Mỗi module export một **public boundary** (ví dụ `index.ts` hoặc thư mục `public/`); các module khác chỉ được import qua boundary này, không import sâu vào file nội bộ của module khác.
- Trong mỗi module, tách 3 lớp:
  1. **Route handler** (`server/api/**`) — thin: parse input, validate (zod), authenticate, authorize, gọi đúng một use case, map response theo `P1-API`. Không chứa business logic.
  2. **Use case / domain service** — chứa toàn bộ quyết định nghiệp vụ (state transition, business rule). Không phụ thuộc trực tiếp Prisma hay HTTP.
  3. **Repository** — persistence, dùng Prisma, đặt tại `server/*/repository/` hoặc `server/*/repositories/`.
  4. **Provider adapter** — mọi lời gọi dịch vụ ngoài (email, Web Push, moderation AI) phải nằm sau một adapter interface, không gọi SDK provider trực tiếp từ use case.
- `check:cycles` (madge) phải xanh — không circular import giữa module.

## 5. Background work

- Không có worker process độc lập ngoài Nitro/Node runtime đã khai báo trong Docker Compose (xem `P1-INFRA`).
- Async/deferred work (publication fan-out, email/Web Push gửi hàng loạt, aggregate analytics hằng ngày) dùng **PostgreSQL-backed outbox/job table**: ghi job trong cùng transaction với sự kiện nghiệp vụ, một polling worker đọc job theo trạng thái, cập nhật atomic. Idempotency và retry theo đặc tả tại module sở hữu nghiệp vụ đó (`P1-FLOW`, `P1-DATA`).
- Không dùng cron ngoài process, không dùng message queue (RabbitMQ/Kafka/BullMQ+Redis...).

## 6. Small-VPS-first principle

- Mọi quyết định kiến trúc phải đánh giá được trên máy 2 GB RAM: số process chạy đồng thời, memory footprint của mỗi dependency, kích thước image Docker.
- Ưu tiên giải pháp PostgreSQL-native (LISTEN/NOTIFY, advisory lock, outbox table) thay vì thêm hạ tầng phụ trợ.
- Cache trong-process (nếu cần) phải có giới hạn kích thước rõ ràng và không phải nguồn sự thật lâu dài — dữ liệu bền vững luôn nằm trong PostgreSQL.
- Chi tiết ngân sách tài nguyên cụ thể (CPU/RAM per service, resource guard) thuộc `P1-INFRA`.

## 7. Ranh giới với các module khác

- Route/API shape và DTO: sở hữu bởi `P1-API`, không định nghĩa lại ở đây.
- Schema bảng, index, constraint: sở hữu bởi `P1-DATA`.
- Business rule/state machine: sở hữu bởi `P1-FLOW`.
- Ngân sách hạ tầng, Docker Compose, backup: sở hữu bởi `P1-INFRA`.

Module này chỉ mô tả **hình dạng kiến trúc** (loại kiến trúc, stack, module boundary, background-work pattern) — không lặp lại nội dung các module trên.