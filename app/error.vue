<!--
  error.vue - Global error page
  Displays a formatted error page when an application error occurs
  (e.g., 404 Not Found). Sets appropriate SEO metadata for the error state.
-->
<script setup lang="ts">
import type { NuxtError } from '#app'

/** The Nuxt error object containing status code and message */
defineProps<{
  error: NuxtError
}>()

/** Set SEO metadata for the error page */
useSeoMeta({
  title: 'Page not found',
  description: 'We are sorry but this page could not be found.'
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<template>
  <!-- UApp wrapper to ensure consistent UI styling on the error page -->
  <UApp>
    <UError :error="error" />
  </UApp>
</template>
