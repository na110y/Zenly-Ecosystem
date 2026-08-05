# P1-REF — Technical References

**Phase:** 1 · **Version:** 2.2 · **Owns:** Nguồn kỹ thuật/pháp lý tham chiếu cho các quyết định, không tự ghi đè requirement.
**Depends on:** — (module tham chiếu độc lập)

[← P1-FUTURE](14_FUTURE_EVOLUTION.md) · [Master Index](../Zenly_Ecosystem_Phase_1_Plan.md)

> Module này **không sở hữu requirement**. Nó chỉ liệt kê nguồn kỹ thuật/pháp lý mà các module khác dựa vào khi đưa ra quyết định cụ thể (thuật toán, ngưỡng, thư viện). Nếu một nguồn ở đây mâu thuẫn với một canonical module, canonical module thắng — cập nhật lại tham chiếu ở đây, không đảo ngược.

## 1. Bảo mật & mật mã (tham chiếu cho P1-SEC)

- **OWASP ASVS / OWASP Top 10** — nguyên tắc chung cho input validation, authentication, session management, được áp dụng cụ thể tại `P1-SEC §1–3`.
- **Argon2id parameter guidance** (theo khuyến nghị cộng đồng bảo mật hiện hành tại thời điểm triển khai `P1-I010`/`P1-I015`) — dùng để chọn tham số cụ thể cho `argon2` (memory cost, iterations) khi implement, không cố định con số cứng ở đây vì khuyến nghị có thể thay đổi theo thời gian phần cứng.
- **RFC 6238 (TOTP)** — chuẩn cho `otpauth`, dùng khi triển khai `P1-I016`/`P1-I017`.
- **Content Security Policy (CSP) Level 3 / MDN CSP reference** — dùng khi cấu hình header tại `P1-I080`.

## 2. Dữ liệu & lưu trữ (tham chiếu cho P1-DATA, P1-INFRA)

- **PostgreSQL official documentation** (phiên bản khớp `postgres:17-alpine` đã dùng trong `docker-compose.yml`) — hành vi constraint, transaction isolation, `LISTEN/NOTIFY`, `SKIP LOCKED` dùng cho outbox pattern tại `P1-ARCH §5`/`P1-DATA §10`.
- **Prisma documentation** (khớp version `7.9.1` trong `package.json`) — migration workflow, schema syntax dùng khi hiện thực hóa `P1-DATA`.

## 3. Frontend & hiệu năng (tham chiếu cho P1-PERF, frontend rules)

- **Web Vitals (Google)** — định nghĩa chính thức của LCP/TBT/CLS dùng làm cơ sở ngân sách tại `P1-PERF §1`.
- **WCAG 2.1/2.2 AA** — cơ sở cho yêu cầu accessibility tại `P1-PUBLIC §12`.
- **Nuxt 4 / Nitro documentation** — hành vi SSR, caching, route rules dùng khi hiện thực `P1-ARCH`, `P1-PERF`.

## 4. Pháp lý & quyền riêng tư (tham chiếu cho P1-SEC §7–8, P1-I081)

- Quy định bảo vệ dữ liệu cá nhân áp dụng cho thị trường mục tiêu của sản phẩm (xác định cụ thể luật áp dụng — ví dụ Nghị định về bảo vệ dữ liệu cá nhân tại Việt Nam nếu sản phẩm phục vụ người dùng Việt Nam — tại thời điểm triển khai `P1-I081`, không giả định trước luật cụ thể ở đây để tránh lỗi thời).
- Chính sách bản quyền nội dung truyện (DMCA-style takedown process hoặc tương đương) — quy trình thủ công tại `P1-SEC §8`, tham chiếu khung pháp lý cụ thể khi soạn form khiếu nại thật.

## 5. Thư viện & phiên bản khóa theo package.json hiện tại

Danh sách dưới đây phản ánh trạng thái `package.json` tại thời điểm soạn Phase 1 spec — khi nâng cấp version, cập nhật tại đây và xác nhận không phá vỡ hành vi các module phụ thuộc:

```
nuxt 4.5.1, vue 3.5.40, @prisma/client 7.9.1, prisma 7.9.1,
argon2 0.45.1, jose 6.2.8, otpauth 9.5.1, qrcode 1.5.4,
resend 6.18.1, sharp 0.35.3, web-push 3.6.7, zod 4.4.3,
@vite-pwa/nuxt 1.1.1, @nuxtjs/robots 6.1.3, @nuxtjs/sitemap 8.3.2,
vitest 4.1.10, @testcontainers/postgresql 12.1.0, @playwright/test 1.62.1,
@stryker-mutator/core 9.6.1, msw 2.15.0, fast-check 4.9.0
```

Không nâng cấp dependency ngoài phạm vi issue hiện tại đang yêu cầu (khớp `CLAUDE.md`: "no speculative... dependency upgrades").

## 6. Cách dùng module này

- Khi một canonical module khác cần biện minh cho một con số/thuật toán cụ thể, nó trích dẫn mục tương ứng ở đây bằng ID (`P1-REF §1`, v.v.) thay vì chép lại toàn văn tài liệu ngoài.
- Khi một nguồn tham chiếu bên ngoài thay đổi (ví dụ khuyến nghị Argon2 cập nhật), cập nhật tại đây; canonical module chỉ cập nhật nếu con số cụ thể trong module đó (nếu có ghi cứng) bị ảnh hưởng.
