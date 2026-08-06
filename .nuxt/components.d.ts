
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const NuxtWelcome: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtAnnouncer: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
export const NuxtImg: typeof import("../node_modules/.pnpm/@nuxt+image@2.1.0_@types+no_63fec7aec594e3e788649830a1eb4cae/node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']
export const NuxtPicture: typeof import("../node_modules/.pnpm/@nuxt+image@2.1.0_@types+no_63fec7aec594e3e788649830a1eb4cae/node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']
export const VitePwaManifest: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaManifest: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaAssets: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']
export const PwaAppleImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaAppleImage")['default']
export const PwaAppleSplashScreenImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaAppleSplashScreenImage")['default']
export const PwaFaviconImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaFaviconImage")['default']
export const PwaMaskableImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaMaskableImage")['default']
export const PwaTransparentImage: typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaTransparentImage")['default']
export const NuxtPage: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtAnnouncer: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/.pnpm/@nuxt+image@2.1.0_@types+no_63fec7aec594e3e788649830a1eb4cae/node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/.pnpm/@nuxt+image@2.1.0_@types+no_63fec7aec594e3e788649830a1eb4cae/node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']>
export const LazyVitePwaManifest: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaManifest: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaAssets: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']>
export const LazyPwaAppleImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaAppleImage")['default']>
export const LazyPwaAppleSplashScreenImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaAppleSplashScreenImage")['default']>
export const LazyPwaFaviconImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaFaviconImage")['default']>
export const LazyPwaMaskableImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaMaskableImage")['default']>
export const LazyPwaTransparentImage: LazyComponent<typeof import("../node_modules/.pnpm/@vite-pwa+nuxt@1.1.1_magica_bb8c03dfc73256c9d6e62abcae94751c/node_modules/@vite-pwa/nuxt/dist/runtime/components/nuxt4/PwaTransparentImage")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/.pnpm/nuxt@4.5.1_8585f377e5b29e5e74cd6c4991457219/node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
