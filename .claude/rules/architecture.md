paths:

"app/**/*.{ts,vue,css}"

"server/**/*.ts"

"nuxt.config.ts"

"package.json"

Architecture boundaries

Preserve the Nuxt/Nitro modular monolith and small-VPS-first design.

Organize server code by business module. Do not create imports that bypass a module's public boundary.

Keep route handlers thin: parse/validate input, authenticate/authorize, call one use case, map the documented response.

Put business decisions in use cases/domain services, persistence in repositories, and provider calls behind adapters.

Avoid new runtime dependencies unless the current issue requires them and the 2 GB VPS budget is assessed.

Do not introduce Redis, a broker, a second application service, or an in-memory source of durable truth.

Background work must use the PostgreSQL-backed outbox/job design specified by the canonical modules.