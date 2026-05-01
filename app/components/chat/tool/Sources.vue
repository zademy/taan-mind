<!--
  Sources.vue - Web search sources list
  Renders a scrollable list of source links from a web search tool result.
  Each source shows its favicon, title, and domain name, linking to the
  original URL in a new tab.
-->
<script setup lang="ts">
/** Props: array of source objects from the web search tool output */
defineProps<{
  sources: Source[]
}>()
</script>

<template>
  <!-- Scrollable container for source links, only rendered when sources exist -->
  <div v-if="sources.length" class="p-1 border border-default rounded-md max-h-40 overflow-y-auto">
    <!-- Individual source link with favicon, title, and domain -->
    <a
      v-for="source in sources"
      :key="source.url"
      :href="source.url"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 px-2 py-1 text-sm text-muted hover:text-default hover:bg-elevated/50 transition-colors min-w-0 rounded-md"
    >
      <!-- Favicon image with fallback to hide on error -->
      <img
        :src="getFaviconUrl(source.url)"
        :alt="getDomain(source.url)"
        class="size-4 shrink-0 rounded-sm"
        loading="lazy"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      >
      <!-- Source title (truncated if too long) -->
      <span class="truncate">{{ source.title || getDomain(source.url) }}</span>
      <!-- Domain name shown on the right when a title is present -->
      <span v-if="source.title" class="text-xs text-dimmed ms-auto shrink-0">{{ getDomain(source.url) }}</span>
    </a>
  </div>
</template>
