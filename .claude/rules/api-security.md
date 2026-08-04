paths:

"server/api/**/*.ts"

"server/middleware/**/*.ts"

"server//auth//*.ts"

"server//moderation//*.ts"

"server//notifications//*.ts"

API and security rules

Read P1-API and P1-SEC named by the current issue before editing protected endpoints.

Validate content type, body size, runtime schema, unknown fields, identifiers, cursors, and state transitions before the use case runs.

Authenticate first, authorize server-side second, then evaluate ownership and runtime feature flags.

Keep public-user and admin session namespaces isolated. Admin access requires a completed TOTP challenge.

Use the standard error envelope and stable error codes. Never return stack traces or provider/database internals.

Mutations that can be retried must be idempotent as specified. Enforce race safety in PostgreSQL, not only in JavaScript.

Apply CSRF, CORS, CSP, rate-limit, CAPTCHA, audit, and privacy controls exactly where the canonical contract requires them.

Test direct API calls that bypass the UI for every role and disabled feature state.