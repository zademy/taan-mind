<!--
  ReferenceLinks.vue — Subtle "Learn more" link chips for assistant responses

  Renders a compact row of web-search chips that point the user to broad concepts
  detected in the assistant's markdown.  The links are placed *below* the answer
  body so they are helpful without interrupting the reading flow.

  Concept extraction is powered by `extractReferenceConcepts()` (app/utils/ai.ts),
  which scores headings, bold terms and multi-word / technical names, then returns
  the top-N results with pre-built DuckDuckGo search URLs.

  Props:
    text      – The raw markdown string of the assistant message.
    maxLinks  – Maximum number of reference chips to display (default: 3).

  Related files:
    app/utils/ai.ts             – extractReferenceConcepts() & scoring logic
    UButton (Nuxt UI)           – Chip rendering component
-->
<script setup lang="ts">
// ─── Props ────────────────────────────────────────────────────────────────────
// `text` is required — it is the assistant's full markdown response.
// `maxLinks` caps how many reference chips are shown; defaults to 3.
const props = withDefaults(
  defineProps<{
    /** Raw markdown text from which to extract reference concepts. */
    text: string
    /** Maximum number of reference links to render (default 3). */
    maxLinks?: number
  }>(),
  {
    maxLinks: 3
  }
)

// ─── Computed ─────────────────────────────────────────────────────────────────
// Extracts scored concepts via the multi-pass strategy in app/utils/ai.ts.
// Returns an array of { label, url } objects ready for the template chips.
const references = computed(() => extractReferenceConcepts(props.text, props.maxLinks))
</script>

<template>
  <!-- Only render the container when at least one concept was extracted -->
  <div
    v-if="references.length"
    class="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-default/70 bg-elevated/35 px-3 py-2 shadow-sm shadow-black/5"
    aria-label="Suggested references for learning more"
  >
    <!-- "Learn more" label with compass icon -->
    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
      <UIcon name="i-lucide-compass" class="size-3.5 text-primary" />
      Learn more
    </span>

    <!-- One chip per extracted concept — opens a DuckDuckGo search in a new tab -->
    <UButton
      v-for="reference in references"
      :key="reference.label"
      :href="reference.url"
      target="_blank"
      rel="noopener noreferrer"
      external
      size="xs"
      color="neutral"
      variant="soft"
      trailing-icon="i-lucide-arrow-up-right"
      :label="reference.label"
      :aria-label="`Search the web for ${reference.label}`"
      class="rounded-full"
    />
  </div>
</template>
