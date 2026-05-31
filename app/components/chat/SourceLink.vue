<!--
  SourceLink.vue - External source link button
  Renders a small button that links to an external source URL with the site's
  favicon, a label, and an external link icon. Used in search results to display
  web sources.

  @prop url    - Full URL of the external source page
  @prop favicon - URL of the source site's favicon image (loaded lazily, hidden on error)
  @prop label   - Display label for the source (e.g. site name or article title)
-->
<script setup lang="ts">
/** Props: URL, favicon image URL, and display label for the source link */
defineProps<{
  url: string
  favicon: string
  label: string
}>()
</script>

<template>
  <!-- Pill-shaped button linking to the external source in a new tab -->
  <UButton
    :href="url"
    target="_blank"
    :avatar="{ src: favicon }"
    :label="label"
    trailing-icon="i-lucide-arrow-up-right"
    size="xs"
    color="neutral"
    variant="outline"
    class="rounded-full align-middle"
  />
</template>
