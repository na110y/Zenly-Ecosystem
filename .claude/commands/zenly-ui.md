# /zenly-ui — UI performance and visual guideline for Zenly Stories

Apply this guideline whenever working on any UI component or animation.

## Visual hierarchy — "tiên khí" (fairy/immortal energy)

### Home Hero section
- Dreamy, light, elegant atmosphere
- Three.js: use ONLY when 2D CSS + canvas cannot achieve the effect. Justify before adding.
- Prefer: layered CSS gradient + GSAP timeline + subtle particle canvas (OffscreenCanvas)
- Particle count: desktop ≤ 120, mobile ≤ 40
- No heavy post-processing (bloom, SSR, depth-of-field) unless desktop-only with `matchMedia` guard

### Sections below Hero
- CSS animations + GSAP ScrollTrigger + pre-optimized images (WebP, AVIF)
- No Three.js, no WebGL in content sections
- Intersection Observer for lazy GSAP init — do not animate off-screen elements

### Story listening page
- Minimal effects only
- Ambient glow via CSS `box-shadow` + `filter: blur()` only
- No particle systems, no GSAP timeline loops
- Audio waveform: `<canvas>` + Web Audio API, not a 3D library

## Mobile performance rules

| Rule | Desktop | Mobile |
|------|---------|--------|
| Particle count | ≤ 120 | ≤ 40 |
| Blur radius | ≤ 40px | ≤ 12px |
| `will-change` layers | sparingly | hero element only |
| Three.js scenes | hero only | replace with static WebP |
| GSAP parallel timelines | ≤ 4 | ≤ 2 |
| `backdrop-filter` | yes | no (or `prefers-reduced-motion` guard) |

Detection:
```ts
const isMobile = () => window.innerWidth < 768 || navigator.hardwareConcurrency <= 2
```

## `prefers-reduced-motion` — mandatory

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
GSAP: wrap timelines in `if (!prefersReducedMotion)`.

## Performance budgets (P1-PERF)

- LCP ≤ 2.5s on 4G mid-range mobile
- TBT ≤ 200ms
- Hero animation JS ≤ 30 KB gzipped (excluding Three.js if justified)
- Images: WebP with `<picture>` AVIF fallback, lazy-load below fold
- No render-blocking scripts in `<head>` except critical CSS

## Checklist before adding any animation

- [ ] Works without JS (SSR/no-JS state acceptable)?
- [ ] Passes `prefers-reduced-motion`?
- [ ] Mobile particle/blur budget respected?
- [ ] Achievable with CSS + GSAP before reaching for Three.js?
- [ ] Asset optimized and under budget?
- [ ] No layout shift (CLS = 0)?

## Component structure

```
app/components/hero/
  HeroScene.vue          ← Three.js or CSS canvas, desktop only
  HeroParticles.vue      ← CSS/canvas fallback, always on mobile

app/components/sections/
  SectionReveal.vue      ← GSAP ScrollTrigger, lazy init

app/components/audio/
  StoryPlayer.vue        ← minimal effects, Web Audio API

app/composables/
  useHeroAnimation.ts
  useScrollReveal.ts
  useParticles.ts
```

Keep animation logic in composables, not in `<script setup>` directly.
