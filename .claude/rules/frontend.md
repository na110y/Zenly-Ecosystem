paths:

"app/**/*.vue"

"app/**/*.{css,scss}"

"app/components/**/*.ts"

"app/composables/**/*.ts"

"app/pages/**/*.ts"

Public and admin UI rules

Follow P1-PUBLIC for public UX and P1-ADMIN for CMS/System UX; do not invent screens from issue summaries.

Design mobile-first and preserve SSR/SEO behavior for public story routes.

Every async view needs loading, empty, error, forbidden/disabled, and success states where applicable.

Feature-flagged controls must disappear within the specified propagation window, but the API remains the enforcement authority.

Never render System navigation for ADMIN or USER. Treat client role checks as presentation only.

Meet keyboard navigation, focus visibility, semantic HTML, accessible names, contrast, and reduced-motion requirements.

Do not place domain decisions, secrets, raw storage paths, or privileged data in client bundles.

Add component tests for state rendering and E2E coverage for critical user journeys.