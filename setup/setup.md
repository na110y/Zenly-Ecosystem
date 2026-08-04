ZENLY STORIES — SETUP MÔI TRƯỜNG VÀ THƯ VIỆN CHO CLAUDE CODE

Mục đích: Claude đọc file này để dựng môi trường phát triển, khởi tạo nền Nuxt và cài/cấu hình toàn bộ thư viện dùng chung đã được duyệt cho Zenly Stories.Phạm vi: chỉ setup toolchain, dependency, cấu hình nền và smoke test. Không triển khai nghiệp vụ Phase 1 trong giai đoạn setup.Thứ tự bắt buộc: hoàn tất SETUP_GATE trước; sau đó mới được đọc Plan Phase 1 và triển khai issue.

1. Lệnh thực thi dành cho Claude

Hãy thực hiện toàn bộ file này theo đúng thứ tự. Không chỉ in ra hướng dẫn cho người dùng.

Nguyên tắc:

Kiểm tra repository thật trước khi sửa.

Không xóa hoặc ghi đè file đang có nếu chưa đối chiếu nội dung.

Không đọc hoặc triển khai các file trong Phase 1/ trước khi SETUP_GATE đạt.

Trong giai đoạn setup, không tạo auth, story, chapter, feed, comment, admin, notification hoặc bất kỳ logic nghiệp vụ nào.

Không commit, push, deploy, sửa production, tạo secret thật hoặc chạy lệnh database phá hủy.

Nếu repository đã có package/config tương đương, tái sử dụng và chuẩn hóa; không tạo toolchain thứ hai.

Nếu phát hiện codebase hiện tại dùng stack khác với file này, dừng với SETUP_CONFLICT; liệt kê bằng chứng và không tự chuyển framework.

Mọi dependency phải được khóa trong pnpm-lock.yaml. Không trộn npm, Yarn hoặc Bun.

Không dùng --force, không bỏ qua lỗi peer dependency, không hạ quality gate để cài cho xong.

Không đánh dấu một kiểm tra là PASS nếu chưa thực sự chạy.

2. Stack nền cố định

Nhóm

Lựa chọn

Runtime

Node.js 24 LTS

Package manager

pnpm qua Corepack; một version duy nhất được khóa trong packageManager

Ngôn ngữ

TypeScript strict

Full-stack

Nuxt 4 + Vue 3 + Nitro

CSS

Tailwind CSS 4 qua Vite plugin

Database

PostgreSQL

ORM/migration

Prisma ORM

API

REST, prefix /api/v1

Unit/component

Vitest + Nuxt Test Utils + Vue Test Utils

Integration

PostgreSQL thật bằng Testcontainers; không dùng SQLite

E2E

Playwright

Production

Nuxt/Nitro Node server + PostgreSQL + Caddy

Không được thêm NestJS, Redis, Kafka, RabbitMQ, Elasticsearch, ClickHouse, WebSocket server, microservice, Turborepo, Kubernetes hoặc queue server riêng.

3. Preflight — kiểm tra trước khi cài

Claude phải in một bảng PREFLIGHT gồm command, version/kết quả và trạng thái.

Kiểm tra tối thiểu:

pwd
git status --short
node --version
corepack --version
pnpm --version
git --version
docker --version
docker compose version

Yêu cầu:

Node phải là 24.x LTS. Không dùng bản odd-numbered hoặc bản Current cho production baseline.

Docker Engine/Docker Desktop phải chạy được và hỗ trợ Compose v2.

Trên Windows, ưu tiên WSL2 và đặt project trong filesystem Linux để tránh HMR/test chậm.

Nếu thiếu Node, pnpm hoặc Docker, dừng với SETUP_BLOCKED; ghi đúng thành phần thiếu và cách cài. Không giả vờ tiếp tục.

Ghi lại git status --short ban đầu để phân biệt thay đổi có sẵn của người dùng với thay đổi do setup.

Kiểm tra package.json, lockfile, nuxt.config.*, tsconfig*, cấu hình test/lint và thư mục hiện có trước khi tạo mới.

Kích hoạt pnpm:

corepack enable
corepack prepare pnpm@latest --activate
pnpm --version

Sau khi chọn version pnpm ổn định, khóa đúng version đó trong trường packageManager của package.json. Không để latest trong file project.

4. Khởi tạo project nền

4.1. Nếu repository chưa có package.json

Khởi tạo một Nuxt 4 application ngay tại repository hiện tại nhưng phải bảo toàn thư mục tài liệu, .claude/, CLAUDE.md và mọi file người dùng đã có.

Không dùng lệnh ép ghi đè lên thư mục không rỗng. Nếu CLI không thể khởi tạo an toàn tại chỗ:

Tạo Nuxt skeleton ở một thư mục tạm ngoài repository.

So sánh từng file được sinh.

Chỉ đưa các file nền không xung đột vào repository.

Xóa thư mục tạm sau khi hoàn tất.

Tên package: zenly-stories. Package phải là private: true, dùng ESM và không phải monorepo.

4.2. Nếu đã có package.json

Không khởi tạo lại project.

Xác minh project là Nuxt 4/Vue 3/TypeScript.

Giữ scripts và dependency hợp lệ đang có.

Chỉ thêm phần còn thiếu trong danh mục được duyệt dưới đây.

Nếu có npm/yarn lockfile nhưng chưa có code đáng kể, báo rõ trước khi chuẩn hóa sang pnpm; không xóa lockfile cũ một cách im lặng.

Nếu code đang hoạt động đã khóa package manager khác, dừng SETUP_CONFLICT để người dùng quyết định.

4.3. File nền được phép tạo/cập nhật

package.json
pnpm-lock.yaml
.npmrc
.nvmrc
.gitignore
.editorconfig
.env.example
nuxt.config.ts
tsconfig.json
eslint.config.mjs
.prettierrc.json
.prettierignore
vitest.config.ts
playwright.config.ts
stryker.config.mjs
app/app.vue
app/assets/css/main.css
tests/setup/

Có thể tạo các thư mục rỗng mà kiến trúc nền yêu cầu, nhưng phải giữ chúng bằng .gitkeep chỉ khi thật sự cần. Chưa tạo module nghiệp vụ.

5. Danh mục thư viện phải cài

5.1. Runtime dependencies

Chỉ cài một bản ổn định tương thích với Nuxt 4 và Node 24. Dùng exact version trong package.json; lockfile là nguồn tái lập cài đặt.

nuxt
vue
vue-router
@prisma/client
zod
argon2
otpauth
qrcode
jose
uuid
sharp
web-push
resend
@vueuse/nuxt
@nuxt/image
@vite-pwa/nuxt
@nuxtjs/robots
@nuxtjs/sitemap
chart.js
vue-chartjs

Mục đích:

Library

Vai trò dự kiến

zod

Validate env và DTO runtime

argon2

Hash password

otpauth, qrcode

TOTP/QR cho Admin 2FA

jose

Token ký/xác minh có chuẩn rõ ràng

uuid

UUID, gồm nhu cầu ID theo thời gian khi issue schema yêu cầu

sharp, @nuxt/image

Xử lý và tối ưu ảnh bìa

web-push

Web Push/VAPID qua adapter

resend

Email provider Phase 1 qua adapter và hard quota

@vite-pwa/nuxt

Manifest/service worker PWA

@nuxtjs/robots, @nuxtjs/sitemap

Robots và sitemap kỹ thuật

chart.js, vue-chartjs

Dashboard analytics; không tải vào public bundle

Không cấu hình secret/provider thật trong bước này. Không gửi email hoặc Web Push thật.

5.2. Styling dependencies

tailwindcss
@tailwindcss/vite
@tailwindcss/typography

Tailwind dùng Vite plugin. Không cài đồng thời module Tailwind cũ và PostCSS pipeline thứ hai.

5.3. Development và quality dependencies

typescript
vue-tsc
prisma
eslint
@nuxt/eslint
prettier
prettier-plugin-tailwindcss
vitest
@vitest/coverage-v8
@nuxt/test-utils
@vue/test-utils
happy-dom
@playwright/test
@testcontainers/postgresql
fast-check
msw
@faker-js/faker
@axe-core/playwright
@stryker-mutator/core
@stryker-mutator/vitest-runner
@stryker-mutator/typescript-checker
tsx
knip
madge

Mục đích:

Nhóm

Công cụ

Static

TypeScript strict, ESLint, Prettier, Knip, Madge

Unit/component

Vitest, Nuxt Test Utils, Vue Test Utils, happy-dom

Coverage

@vitest/coverage-v8

Integration

PostgreSQL Testcontainers

Contract/provider fake

MSW

Property-based

fast-check

Fixture

Faker, chỉ tạo dữ liệu giả

E2E/accessibility

Playwright + axe

Mutation

Stryker + Vitest runner

5.4. Type packages

Chỉ thêm package @types/* nếu package gốc không cung cấp type và TypeScript thực sự báo thiếu. Dự kiến có thể cần:

@types/qrcode
@types/web-push

Không cài hàng loạt @types/* theo phỏng đoán.

5.5. Dependency không được cài ở setup

SDK CAPTCHA khi chưa chốt provider.

SDK Automated Moderation/AI khi chưa chốt provider và contract.

Zalo/SMS SDK.

Payment/VIP/marketplace SDK.

Redis/queue/search/realtime client.

UI framework lớn thứ hai nếu Tailwind/components nội bộ đã đủ.

Analytics/session-replay SaaS.

Các dependency provider-specific chỉ được thêm ở atomic issue tương ứng sau khi canonical requirement và adapter đã được đọc. Việc này ngăn lockfile phình to và tránh khóa nhầm Zenly vào một provider chưa được quyết định.

6. Cách cài dependency

Không copy mù một command nếu repository đã có dependency tương đương. Claude phải tính danh sách còn thiếu rồi cài theo nhóm bằng pnpm.

Mẫu thực thi cho project mới:

pnpm add -E nuxt vue vue-router @prisma/client zod argon2 otpauth qrcode jose uuid sharp web-push resend @vueuse/nuxt @nuxt/image @vite-pwa/nuxt @nuxtjs/robots @nuxtjs/sitemap chart.js vue-chartjs

pnpm add -DE tailwindcss @tailwindcss/vite @tailwindcss/typography typescript vue-tsc prisma eslint @nuxt/eslint prettier prettier-plugin-tailwindcss vitest @vitest/coverage-v8 @nuxt/test-utils @vue/test-utils happy-dom @playwright/test @testcontainers/postgresql fast-check msw @faker-js/faker @axe-core/playwright @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker tsx knip madge

Sau đó chỉ cài type package thực sự thiếu:

pnpm add -DE @types/qrcode @types/web-push

Quy tắc version:

Dùng stable release, không dùng alpha/beta/rc/nightly.

Nuxt phải ở major 4.

Không tự nâng major của project đang tồn tại trong bước setup.

Sau khi cài, chạy pnpm outdated và ghi nhận; không nâng tiếp chỉ vì có package mới hơn.

Không chạy auto-fix audit phá compatibility. Lỗ hổng nghiêm trọng phải được báo cùng dependency path và phương án an toàn.

7. Cấu hình bắt buộc

7.1. package.json

Phải có tối thiểu các scripts sau; có thể giữ thêm script hợp lệ đang tồn tại:

{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "typecheck": "nuxt typecheck",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format:check": "prettier . --check",
    "format": "prettier . --write",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:mutation": "stryker run",
    "check:deps": "knip",
    "check:cycles": "madge --circular --extensions ts,vue app server",
    "prisma:generate": "prisma generate",
    "prisma:validate": "prisma validate",
    "prisma:format": "prisma format",
    "setup:verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}

Không chạy migration/seed trong postinstall.

7.2. TypeScript

Bật strict mode thực sự.

Không skipLibCheck chỉ để che lỗi do setup nếu có thể xử lý đúng.

Không thêm any, @ts-ignore, @ts-nocheck hoặc tắt diagnostic để pass.

tsconfig.json phải kế thừa cấu hình Nuxt sinh ra và không copy toàn bộ .nuxt/tsconfig.json.

7.3. Nuxt

nuxt.config.ts chỉ cấu hình nền:

Tailwind CSS 4 qua @tailwindcss/vite.

Các Nuxt modules đã duyệt.

CSS entry chung.

Type checking/devtools theo môi trường phù hợp.

Runtime config chỉ chứa key name/placeholder; secret server-only không được đưa vào public.

Không cấu hình route nghiệp vụ hoặc provider thật trong setup.

Production target là Nitro Node server.

7.4. Tailwind

app/assets/css/main.css import Tailwind theo chuẩn Tailwind 4.

Có Typography plugin cho trang đọc chương, nhưng chưa thiết kế giao diện truyện ở setup.

Không tạo design system hoặc art direction trước khi đọc canonical public UX module.

7.5. Prisma

Cấu hình generator/client và datasource PostgreSQL tối thiểu nếu schema chưa tồn tại.

Chưa tạo bảng nghiệp vụ, migration hoặc seed Phase 1 trong setup.

prisma generate và prisma validate phải chạy được.

Integration về sau luôn dùng PostgreSQL thật; không thêm SQLite datasource.

7.6. Test

vitest.config.ts phải hỗ trợ test TypeScript và Vue/Nuxt.

Tạo đúng một smoke test setup tối thiểu để chứng minh runner hoạt động; không giả lập test nghiệp vụ.

playwright.config.ts dùng web server từ package script, timeout hữu hạn và desktop/mobile project tối thiểu.

Cài browser cần thiết bằng:

pnpm exec playwright install chromium

Không cài toàn bộ browser nếu máy/ngân sách dung lượng không cần; Safari/iPhone thật được test thủ công/pre-release sau.

Testcontainers phải chỉ được kiểm tra khi Docker sẵn sàng. Không thay bằng SQLite nếu Docker lỗi.

7.7. Lint và format

Dùng flat ESLint config tương thích Nuxt 4.

Prettier chịu trách nhiệm format; tránh bật hai rule formatter đối nghịch.

Prettier Tailwind plugin phải sắp xếp class mà không thay đổi hành vi Vue template.

Generated output như .nuxt, .output, coverage, Playwright report, storage runtime và Prisma generated files phải được ignore phù hợp.

7.8. Environment placeholder

Chỉ tạo .env.example; không tạo hoặc sửa .env thật.

Placeholder tối thiểu có thể gồm:

NODE_ENV=development
DATABASE_URL=postgresql://zenly:change_me@localhost:5432/zenly
TEST_DATABASE_URL=postgresql://zenly_test:change_me@localhost:5433/zenly_test
NUXT_SESSION_SECRET=replace_with_at_least_32_random_bytes
NUXT_DATA_ENCRYPTION_KEY=replace_with_32_byte_key
NUXT_VISITOR_HMAC_KEY=replace_with_random_secret
NUXT_TOTP_ENCRYPTION_KEY=replace_with_32_byte_key
NUXT_RESEND_API_KEY=
NUXT_EMAIL_FROM=
NUXT_VAPID_PUBLIC_KEY=
NUXT_VAPID_PRIVATE_KEY=
NUXT_VAPID_SUBJECT=mailto:admin@example.com

Tên biến cuối cùng phải được issue cấu hình môi trường xác nhận sau khi đọc Plan; setup không được tự coi placeholder là contract canonical.

8. Setup smoke test

Smoke test ở giai đoạn này chỉ chứng minh toolchain hoạt động:

Nuxt prepare sinh type thành công.

TypeScript strict chạy thành công.

ESLint và format check chạy thành công.

Vitest chạy smoke test thật.

Prisma generate/validate thành công.

Nuxt production build thành công.

Nitro output khởi động được và trả HTML cho route nền.

Playwright Chromium khởi động được với một smoke page tối thiểu nếu môi trường cho phép.

Docker/Testcontainers có thể tạo rồi đóng một PostgreSQL test container nếu Docker sẵn sàng.

Không có secret thật trong file được track.

Không gọi API email, Web Push, AI hoặc CAPTCHA thật.

9. SETUP_GATE bắt buộc

Chạy fail-fast theo thứ tự:

pnpm install --frozen-lockfile
pnpm exec nuxt prepare
pnpm prisma:generate
pnpm prisma:validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:cycles
pnpm check:deps

Sau đó chạy các smoke test Playwright và PostgreSQL container nếu đã cấu hình trong setup.

Gate chỉ PASS khi:

pnpm-lock.yaml tồn tại và frozen install thành công.

Không còn lỗi type/lint/format/build.

Smoke test không bị skip để che lỗi.

Prisma target là PostgreSQL.

Không có package bị trùng vai trò hoặc toolchain thứ hai.

Không có dependency bị cấm.

Không có secret thật, token thật hoặc dữ liệu production.

git diff --check không báo lỗi whitespace.

Nếu bất kỳ bước bắt buộc nào fail, trạng thái là SETUP_FAILED hoặc SETUP_BLOCKED; sửa nguyên nhân trong phạm vi setup rồi chạy lại. Không được chuyển sang Plan Phase 1.

10. Báo cáo hoàn tất setup

Khi gate đạt, Claude phải in đúng cấu trúc:

SETUP_READY

Environment:
- OS/WSL:
- Node:
- pnpm:
- Docker/Compose:

Installed:
- Runtime dependencies:
- Dev/test dependencies:
- Lockfile:

Configured files:
- ...

Verification:
- frozen install:
- prisma generate/validate:
- format/lint/typecheck:
- unit smoke:
- PostgreSQL container smoke:
- Playwright smoke:
- production build/Nitro start:
- dependency/cycle check:

Pre-existing user changes preserved:
- ...

Warnings or deferred provider SDKs:
- ...

Không đánh dấu issue Phase 1 là DONE chỉ vì setup đã đạt.

11. Chỉ sau SETUP_READY mới chuyển sang code Phase 1

Sau khi in SETUP_READY, Claude mới được đọc theo thứ tự:

CLAUDE.md

Zenly_Ecosystem_Phase_1_Plan.md

Phase 1/Issues/00_ISSUE_INDEX.md

Phase 1/Issues/001_KHOI_TAO_NUXT_NITRO_STRICT.md

Toàn bộ canonical modules mà P1-I001 yêu cầu đọc

Sau đó:

Chạy python3 .claude/scripts/validate_phase_docs.py.

Chạy python3 .claude/scripts/issue_context.py P1-I001 hoặc ID tương đương mà script chấp nhận.

Đối chiếu setup vừa tạo với allowed change surface và acceptance của P1-I001.

Không làm lại file đã đúng; chỉ hoàn thiện phần issue còn thiếu.

Nếu setup và canonical module mâu thuẫn, dừng SPEC_CONFLICT; canonical Plan thắng nhưng không sửa âm thầm.

Viết test/evidence đúng issue, chạy quality gate rồi mới xem xét đóng P1-I001.

Chỉ sau khi P1-I001 thật sự DONE mới lấy issue dependency-ready tiếp theo.

Luồng cuối cùng:

setup.md
  → cài môi trường + thư viện
  → SETUP_GATE
  → SETUP_READY
  → CLAUDE.md
  → Phase 1 Master
  → Issue Index
  → đúng một atomic issue
  → canonical modules của issue
  → code + test + evidence

12. Điều kiện dừng bắt buộc

Claude phải dừng và báo rõ khi gặp một trong các trạng thái:

Mã

Khi nào dùng

SETUP_BLOCKED

Thiếu Node/Docker/quyền cài hoặc môi trường không chạy được

SETUP_CONFLICT

Repository hiện tại dùng stack/package manager khác hoặc file đang có xung đột

SETUP_FAILED

Cài đặt hoặc gate kỹ thuật thất bại sau khi đã thử khắc phục an toàn

SPEC_CONFLICT

Sau setup, Plan/issue/code mâu thuẫn nhau

SETUP_READY

Toàn bộ setup gate đã chạy và PASS

Không được biến trạng thái BLOCKED/FAILED thành READY bằng cách bỏ test, bỏ package, dùng mock thay PostgreSQL, tắt TypeScript strict hoặc giảm kiểm tra.