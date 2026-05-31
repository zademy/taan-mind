<!--
  AIStreamingRewrite.vue - Side-by-side original vs AI draft comparison card
  Displays the inline rewrite result as a two-column diff (Original / AI draft)
  with Accept / Retry / Cancel actions. Manages loading and error states
  for the streaming rewrite lifecycle managed by `InlineAssistant`.

  @prop actionLabel - Display name of the active action (e.g. "Improve writing")
  @prop status      - Current rewrite lifecycle status (idle / streaming / ready / error)
  @prop original   - The user's original input text before the AI rewrite
  @prop draft       - The streamed AI rewrite output (updated in real-time)
  @prop loadingMessage - Status line shown during active streaming
  @prop error       - Error message string when status is 'error'

  @emits accept - User confirmed the draft, parent applies it to the prompt input
  @emits retry - User wants to re-run the same action with the same original text
  @emits cancel - User aborted the rewrite, draft is discarded
-->
<script setup lang="ts">
import type { InlineAIRewriteStatus } from '~/composables/useInlineAIRewrite'
import AILoadingState from './AILoadingState.vue'

defineProps<{
  actionLabel: string
  status: InlineAIRewriteStatus
  original: string
  draft: string
  loadingMessage: string
  error?: string | null
}>()

defineEmits<{
  accept: []
  retry: []
  cancel: []
}>()
</script>

<template>
  <div
    class="rounded-xl border border-muted bg-elevated/80 p-3 shadow-sm backdrop-blur"
    aria-live="polite"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted">Inline AI · {{ actionLabel }}</p>
          <AILoadingState v-if="status === 'streaming'" :message="loadingMessage" class="mt-1" />
          <p v-else-if="status === 'error'" class="mt-1 text-sm text-error">
            {{ error || 'Inline AI failed.' }}
          </p>
          <p v-else class="mt-1 text-sm text-muted">Suggestion ready. Compare before accepting.</p>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          aria-label="Close inline AI suggestion"
          @click="$emit('cancel')"
        />
      </div>

      <div class="grid gap-2 md:grid-cols-2">
        <div class="min-w-0 rounded-lg bg-muted/40 p-3">
          <p class="mb-1 text-xs font-medium uppercase tracking-wide text-dimmed">Original</p>
          <p class="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-muted">
            {{ original }}
          </p>
        </div>

        <div class="min-w-0 rounded-lg bg-primary/5 p-3 ring-1 ring-primary/15">
          <p class="mb-1 text-xs font-medium uppercase tracking-wide text-primary">AI draft</p>
          <p class="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-highlighted">
            {{ draft || 'Waiting for first tokens...' }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          v-if="status === 'streaming'"
          color="neutral"
          variant="soft"
          size="xs"
          icon="i-lucide-square"
          label="Cancel"
          @click="$emit('cancel')"
        />

        <template v-else>
          <UButton
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-lucide-rotate-cw"
            label="Retry"
            @click="$emit('retry')"
          />
          <UButton
            v-if="status === 'ready'"
            color="primary"
            size="xs"
            icon="i-lucide-check"
            label="Accept"
            @click="$emit('accept')"
          />
        </template>
      </div>
    </div>
  </div>
</template>
