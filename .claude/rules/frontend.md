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

UI performance and animation rules

Home Hero: dreamy "tiên khí" atmosphere. Three.js only when CSS + canvas cannot achieve the effect — justify before adding. Prefer layered CSS gradient + GSAP timeline + subtle particle canvas (OffscreenCanvas). Particles: desktop ≤ 120, mobile ≤ 40.

Sections below Hero: CSS animations + GSAP ScrollTrigger + optimized images (WebP/AVIF) only. No Three.js or WebGL. Use Intersection Observer for lazy GSAP init.

Story listening page: minimal effects only. Ambient glow via CSS box-shadow + filter blur. No particle systems or GSAP loops. Audio waveform via canvas + Web Audio API.

Mobile: reduce blur to ≤ 12px, will-change on hero element only, replace Three.js with static WebP, max 2 parallel GSAP timelines, no backdrop-filter without prefers-reduced-motion guard.

All animations must respect prefers-reduced-motion. GSAP timelines must be wrapped in a reduced-motion check.

Performance budgets: LCP ≤ 2.5s on 4G mobile, TBT ≤ 200ms, hero animation JS ≤ 30 KB gzipped, no render-blocking scripts except critical CSS, CLS = 0.

Keep animation logic in composables (useHeroAnimation, useScrollReveal, useParticles), not in script setup directly.