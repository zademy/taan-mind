<!--
  Transcript.vue — Reusable chat transcript renderer

  Renders a read-only or owner-editable list of UIMessage records with
  incremental history loading. Owner actions are opt-in so public share pages can
  reuse the exact message renderer without exposing chat mutation controls.
-->
<script setup lang="ts">
import type { UIMessage } from 'ai'

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

const props = withDefaults(
  defineProps<{
    messages: UIMessage[]
    status?: ChatStatus
    latestMessageId?: string | null
    editingMessageId?: string | null
    showActions?: boolean
    shouldAutoScroll?: boolean
    shouldScrollToBottom?: boolean
    spacingOffset?: number
    initialVisibleMessages?: number
    messageBatchSize?: number
    messagesClass?: string
    resetKey?: string
  }>(),
  {
    status: 'ready',
    latestMessageId: null,
    editingMessageId: null,
    showActions: false,
    shouldAutoScroll: true,
    shouldScrollToBottom: true,
    spacingOffset: 0,
    initialVisibleMessages: 80,
    messageBatchSize: 40,
    messagesClass: '',
    resetKey: ''
  }
)

const emit = defineEmits<{
  edit: [message: UIMessage]
  regenerate: [message: UIMessage]
  save: [message: UIMessage, text: string]
  cancelEdit: []
}>()

/** Maximum number of messages rendered at once for long conversations. */
const visibleMessageCount = ref(props.initialVisibleMessages)

watch(
  () => props.resetKey,
  () => {
    visibleMessageCount.value = props.initialVisibleMessages
  }
)

/** Only render the most recent messages by default for very long conversations. */
const visibleMessages = computed(() => {
  const start = Math.max(0, props.messages.length - visibleMessageCount.value)
  return props.messages.slice(start)
})

/** Number of messages hidden above the current viewport window. */
const hiddenMessageCount = computed(() =>
  Math.max(0, props.messages.length - visibleMessageCount.value)
)

/** Reveals older messages in batches without forcing all history to render at once. */
function showOlderMessages() {
  visibleMessageCount.value += props.messageBatchSize
}

/** Small memo key for Vue render skipping on stable, non-streaming messages. */
function getMessageMemoKey(message: UIMessage) {
  if (message.id !== props.latestMessageId) {
    return `${message.parts.length}:${message.role}`
  }

  return message.parts
    .map(part => {
      if ('text' in part && typeof part.text === 'string') {
        return `${part.type}:${part.text.length}:${part.text.slice(-16)}`
      }
      if ('state' in part && typeof part.state === 'string') {
        return `${part.type}:${part.state}`
      }
      return part.type
    })
    .join('|')
}
</script>

<template>
  <UChatMessages
    :should-auto-scroll="props.shouldAutoScroll"
    :should-scroll-to-bottom="props.shouldScrollToBottom"
    :messages="visibleMessages"
    :status="props.status"
    :spacing-offset="props.spacingOffset"
    :class="props.messagesClass"
  >
    <template v-if="hiddenMessageCount > 0" #leading>
      <div class="flex justify-center py-2">
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-history"
          :label="`Show ${Math.min(props.messageBatchSize, hiddenMessageCount)} older messages`"
          @click="showOlderMessages"
        />
      </div>
    </template>

    <!-- Custom streaming indicator with animated dots -->
    <template #indicator>
      <div class="flex items-center gap-2">
        <ClientOnly>
          <ChatIndicator />
        </ClientOnly>
        <UChatShimmer text="Thinking..." class="text-sm" />
      </div>
    </template>

    <!-- Message content with lightweight CSS animation -->
    <template #content="{ message }">
      <div
        v-memo="[message.id, getMessageMemoKey(message), props.editingMessageId === message.id]"
        class="chat-message-enter"
      >
        <ChatMessageContent
          :message="message"
          :editing="props.editingMessageId === message.id"
          @save="(msg, text) => emit('save', msg, text)"
          @cancel-edit="emit('cancelEdit')"
        />
      </div>
    </template>

    <!-- Owner-only message action buttons (copy, edit, regenerate) -->
    <template v-if="props.showActions" #actions="{ message }">
      <ChatMessageActions
        :message="message"
        :streaming="props.status === 'streaming' && message.id === props.latestMessageId"
        :editing="props.editingMessageId === message.id"
        @edit="emit('edit', message)"
        @regenerate="emit('regenerate', message)"
      />
    </template>
  </UChatMessages>
</template>
