<!--
  MessageActions.vue - Chat message action buttons
  Renders contextual action buttons for a chat message:
  - Assistant messages: copy and regenerate actions (shown when streaming is complete)
  - User messages: edit action and timestamp tooltip (shown when not streaming/editing)
-->
<script setup lang="ts">
import type { UIMessage } from 'ai'
import { useClipboard } from '@vueuse/core'
import { getTextFromMessage } from '@nuxt/ui/utils/ai'

/** Props: the message object, streaming state, and editing state */
const props = defineProps<{
  message: UIMessage & { createdAt?: string | Date }
  streaming: boolean
  editing: boolean
}>()

const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

/** Computed property that formats the message creation date for display and tooltip */
const formattedDate = computed(() => {
  if (!props.message.createdAt) return null
  if (!isMounted.value) return null

  const date = new Date(props.message.createdAt)

  return {
    /** Short time format for inline display (e.g. "3:45 PM") */
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    }),
    /** Full date/time format for tooltip (e.g. "Apr 25, 2026, 3:45 PM") */
    full: date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    /** ISO string for the datetime attribute */
    iso: date.toISOString()
  }
})

/** Emits events for editing and regenerating messages */
const emit = defineEmits<{
  edit: [message: UIMessage]
  regenerate: [message: UIMessage]
}>()

/** Clipboard utility and copied state feedback */
const clipboard = useClipboard()
const copied = ref(false)

/** Copies the message text to the clipboard and shows feedback for 2 seconds */
function copy() {
  clipboard.copy(getTextFromMessage(props.message))
  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <!-- Assistant actions: copy and regenerate (visible only when streaming is done) -->
  <template v-if="message.role === 'assistant' && !streaming">
    <UTooltip text="Copy response">
      <UButton
        size="sm"
        :color="copied ? 'primary' : 'neutral'"
        variant="ghost"
        :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
        aria-label="Copy response"
        @click="copy"
      />
    </UTooltip>

    <UTooltip text="Regenerate response">
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-rotate-cw"
        aria-label="Regenerate response"
        @click="emit('regenerate', message)"
      />
    </UTooltip>
  </template>

  <!-- User actions: timestamp and edit button (visible when not streaming or editing) -->
  <template v-if="message.role === 'user' && !streaming && !editing">
    <UTooltip v-if="formattedDate" :text="formattedDate.full">
      <time :datetime="formattedDate.iso" class="text-xs text-muted mr-1.5">
        {{ formattedDate.time }}
      </time>
    </UTooltip>

    <UTooltip text="Edit message">
      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-pencil"
        aria-label="Edit message"
        @click="emit('edit', message)"
      />
    </UTooltip>
  </template>
</template>
