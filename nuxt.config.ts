/**
 * Nuxt application configuration.
 *
 * - Sets up UI, markdown rendering, database, and security modules.
 * - Configures runtime secrets for AI providers (MiniMax, GLM).
 * - Enables experimental view transitions and OpenAPI support.
 */
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@comark/nuxt',
    '@nuxthub/core',
    'nuxt-charts',
    'nuxt-csurf'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    minimaxApiKey: '',
    minimaxBaseUrl: '',
    glmApiKey: '',
    glmBaseUrl: '',
    paperlessBaseUrl: '',
    paperlessApiToken: '',
    ollamaBaseUrl: '',
    ollamaModel: '',
    syncIntervalMs: '',
    processIntervalMs: ''
  },

  routeRules: {
    '/api/ocr/**': { csurf: false } as Record<string, boolean>,
    '/api/paperless/documents/*/ocr': { csurf: false } as Record<string, boolean>,
    '/api/cache/**': { csurf: false } as Record<string, boolean>
  },

  sourcemap: {
    client: false,
    server: false
  },

  experimental: {
    viewTransition: true
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: 'node-server',
    sourceMap: false,
    minify: false,
    experimental: {
      openAPI: true,
      bundleRuntimeDependencies: false
    }
  },

  hub: {
    db: 'sqlite'
  },

  vite: {
    build: {
      sourcemap: false
    },
    optimizeDeps: {
      include: ['striptags']
    }
  },

  csurf: {
    methodsToProtect: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  }
})
