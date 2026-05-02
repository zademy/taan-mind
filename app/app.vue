<!--
  app.vue - Root application component
  Sets up global SEO metadata, theme color based on color mode,
  and wraps the app with NuxtLayout and NuxtPage for routing.
-->
<script setup lang="ts">
/** Reactive color mode (dark/light) provided by Nuxt */
const colorMode = useColorMode()

/** Computes the theme-color meta tag value based on the current color mode */
const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'))

/** Google Fonts stylesheet loaded from head instead of CSS @import */
const fontStylesheetUrl =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap'

/** Configures the HTML head with meta tags, favicon, and language attribute */
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    },
    { rel: 'stylesheet', href: fontStylesheetUrl },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png'
    },
    { rel: 'manifest', href: '/site.webmanifest' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

/** Application title and description used across SEO meta tags */
const title = 'Paperless UI Chat'
const description = 'AI chat interface powered by MiniMax and GLM.'

/** Sets Open Graph and Twitter Card SEO metadata */
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <!-- Root UI app wrapper with toaster and tooltip configuration -->
  <UApp :toaster="{ position: 'top-right' }" :tooltip="{ delayDuration: 200 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
