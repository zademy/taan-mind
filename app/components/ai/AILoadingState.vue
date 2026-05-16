<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="inline-flex items-center gap-2 text-sm text-muted" aria-live="polite">
    <UIcon name="i-lucide-loader-2" class="size-4 animate-spin text-primary" />
    <span>{{ message }}</span>
    <span class="inline-flex w-5 overflow-hidden">
      <span class="inline-block animate-pulse">...</span>
    </span>
  </div>
</template>
