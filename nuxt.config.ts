// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  modules: [
    '@vueuse/nuxt',
    '@nuxt/image',
    '@vite-pwa/nuxt',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [(await import('@tailwindcss/vite')).default()],
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  runtimeConfig: {
    sessionSecret: '',
    dataEncryptionKey: '',
    visitorHmacKey: '',
    totpEncryptionKey: '',
    resendApiKey: '',
    emailFrom: '',
    vapidPublicKey: '',
    vapidPrivateKey: '',
    vapidSubject: '',
    databaseUrl: process.env.DATABASE_URL ?? '',
    public: {
      siteUrl: '',
    },
  },

  nitro: {
    preset: 'node-server',
  },

  pwa: {
    registerType: 'autoUpdate',
  },
})
