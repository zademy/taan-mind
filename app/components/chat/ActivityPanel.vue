<!--
  ActivityPanel.vue - Right-side chat activity panel
  Displays real-time per-question progress, token usage details,
  active model information, and Paperless document source links.
  Only visible on extra-large viewports (xl breakpoint) alongside the chat.
-->
<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { ChatStatus, ChatUsage } from '~/utils/chatActivity'

/** Document shape for attached Paperless sources */
type ChatDocument = {
  id: number
  title: string
}

/**
 * Component props
 * @property {ChatStatus} status - Current streaming status of the chat
 * @property {UIMessage[]} messages - All messages in the current conversation
 * @property {string} model - The active AI model identifier
 * @property {ChatUsage | null} usage - Latest token usage data from the AI response
 * @property {object | null} project - Optional parent project info
 * @property {ChatDocument[]} documents - Documents attached as context to this chat
 */
const props = defineProps<{
  status: ChatStatus
  messages: UIMessage[]
  model: string
  usage: ChatUsage | null
  project?: { id: string; name: string } | null
  documents: ChatDocument[]
}>()

/** Tool usage activities extracted from assistant messages */
const tools = computed(() => getToolActivities(props.messages))

/** Aggregated token summary across all messages and latest usage */
const tokenSummary = computed(() => getTokenSummary(props.messages, props.usage))

/** Step-by-step progress items for the current streaming cycle */
const progressItems = computed(() => getProgressItems(props.status, props.messages, tools.value))

/** Human-readable status message describing the current progress state */
const progressMessage = computed(() =>
  getProgressMessage(props.status, props.messages, tools.value)
)

/** Number of completed progress steps out of total */
const completedProgressCount = computed(() => progressItems.value.filter(item => item.done).length)

/** Up to 5 documents shown in the sources section */
const visibleDocuments = computed(() => props.documents.slice(0, 5))

/** Summary rows displayed in the Task details section */
const taskDetails = computed(() => [
  {
    label: 'Chat messages',
    icon: 'i-lucide-message-square-text',
    value: `${props.messages.length} messages`
  },
  {
    label: 'Input used',
    icon: 'i-lucide-log-in',
    value: formatTokens(tokenSummary.value.inputTokens, tokenSummary.value.estimated)
  },
  {
    label: 'Output generated',
    icon: 'i-lucide-log-out',
    value: formatTokens(tokenSummary.value.outputTokens, tokenSummary.value.estimated)
  },
  {
    label: 'Active model',
    icon: 'i-lucide-brain-circuit',
    value: getCompactModelName(props.model)
  }
])

/**
 * Formats a token count with optional estimation indicator.
 * @param value - The token count
 * @param estimated - Whether the count is estimated
 * @returns Formatted string like "≈ 1,234 tokens" or "1,234 tokens"
 */
function formatTokens(value: number, estimated: boolean) {
  const formatted = new Intl.NumberFormat('en-US').format(value)
  return `${estimated ? '≈ ' : ''}${formatted} tokens`
}

/**
 * Extracts the short model name from a fully qualified identifier.
 * E.g. "openai/gpt-4o" → "gpt-4o"
 * @param model - Full model identifier string
 */
function getCompactModelName(model: string) {
  return model.split('/').slice(-1)[0] || model
}

/**
 * Returns the Paperless preview URL for a document.
 * @param id - Paperless document ID
 */
function getDocumentPreviewUrl(id: number) {
  return `/api/paperless/documents/${id}/preview`
}

/**
 * Returns the Paperless download URL for a document.
 * @param id - Paperless document ID
 */
function getDocumentDownloadUrl(id: number) {
  return `/api/paperless/documents/${id}/download`
}
</script>

<template>
  <aside class="w-80 shrink-0 border-l border-default/70 bg-default/30 p-4 backdrop-blur-sm">
    <div class="rounded-3xl border border-default/80 bg-elevated/80 p-4 shadow-sm">
      <section>
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-muted">Progress</p>
            <p class="mt-1 text-xs text-muted">
              {{ completedProgressCount }}/{{ progressItems.length }} steps
            </p>
          </div>
          <div class="flex size-8 items-center justify-center rounded-full bg-default text-muted">
            <UIcon name="i-lucide-pin" class="size-4" />
          </div>
        </div>

        <div class="space-y-2.5">
          <div v-for="item in progressItems" :key="item.label" class="flex gap-3">
            <div
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px]"
              :class="[
                item.done
                  ? 'bg-primary text-inverted'
                  : item.active
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30 animate-pulse'
                    : 'bg-muted text-dimmed'
              ]"
            >
              <UIcon v-if="item.done" name="i-lucide-check" class="size-3" />
              <span v-else-if="item.active">•</span>
            </div>
            <p
              class="text-sm leading-5"
              :class="item.done || item.active ? 'text-default' : 'text-muted'"
            >
              {{ item.label }}
            </p>
          </div>
        </div>

        <p class="mt-4 rounded-2xl bg-default/70 px-3 py-2 text-xs leading-5 text-muted">
          {{ progressMessage }}
        </p>
      </section>

      <USeparator class="my-4" />

      <section>
        <p class="mb-3 text-sm font-medium text-muted">Task details</p>
        <div class="space-y-2.5">
          <div v-for="detail in taskDetails" :key="detail.label" class="flex items-center gap-3">
            <UIcon :name="detail.icon" class="size-4 shrink-0 text-muted" />
            <span class="min-w-0 flex-1 truncate text-sm text-default">{{ detail.label }}</span>
            <span class="max-w-32 truncate text-right text-xs font-medium text-highlighted">
              {{ detail.value }}
            </span>
          </div>
        </div>
      </section>

      <USeparator class="my-4" />

      <section>
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-muted">Sources</p>
          <UBadge v-if="props.project" color="neutral" variant="subtle" class="max-w-36 truncate">
            {{ props.project.name }}
          </UBadge>
        </div>

        <div v-if="visibleDocuments.length > 0" class="space-y-2">
          <div
            v-for="document in visibleDocuments"
            :key="document.id"
            class="group/source flex items-center gap-2 rounded-2xl bg-default/60 px-3 py-2 transition hover:bg-default"
          >
            <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-muted" />
            <NuxtLink
              :to="getDocumentPreviewUrl(document.id)"
              external
              target="_blank"
              class="min-w-0 flex-1 truncate text-sm text-default hover:text-primary"
            >
              {{ document.title }}
            </NuxtLink>
            <UButton
              :to="getDocumentDownloadUrl(document.id)"
              external
              target="_blank"
              icon="i-lucide-download"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Download ${document.title}`"
              class="opacity-70 group-hover/source:opacity-100"
            />
          </div>
        </div>

        <p
          v-else
          class="rounded-2xl border border-dashed border-default/70 bg-default/40 px-3 py-4 text-xs leading-5 text-muted"
        >
          Select Paperless documents to show preview and download links here.
        </p>
      </section>
    </div>
  </aside>
</template>
