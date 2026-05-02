<!--
  MessageContent.vue - Chat message content renderer
  Renders the different parts of a chat message including:
  - Thinking/reasoning blocks (collapsible)
  - Tool invocations (charts, weather, web search)
  - Text content (markdown for assistant, plain text or edit mode for user)
-->
<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName } from 'ai'
import type { UIMessage } from 'ai'
import { isPartStreaming, isToolStreaming } from '@nuxt/ui/utils/ai'

/** Props: the message object and its current editing state */
defineProps<{
  message: UIMessage
  editing: boolean
}>()

/** Emits events for saving an edit and cancelling edit mode */
const emit = defineEmits<{
  save: [message: UIMessage, text: string]
  cancelEdit: []
}>()
</script>

<template>
  <!-- Iterate over merged message parts and render each type appropriately -->
  <template
    v-for="(part, index) in getMergedParts(message.parts)"
    :key="`${message.id}-${part.type}-${index}`"
  >
    <!-- Reasoning/thinking block -->
    <ChatMessageThinking
      v-if="isReasoningUIPart(part)"
      :text="part.text"
      :streaming="isPartStreaming(part)"
    />

    <!-- Tool invocation block: dispatches to the correct tool component -->
    <template v-else-if="isToolUIPart(part)">
      <!-- Chart tool (client-only: uses canvas/SVG rendering) -->
      <ClientOnly v-if="getToolName(part) === 'chart'">
        <ChatToolChart :invocation="{ ...(part as ChartUIToolInvocation) }" />
        <template #fallback>
          <div class="h-48 animate-pulse bg-muted/20 rounded-xl my-5" />
        </template>
      </ClientOnly>
      <!-- Weather tool -->
      <ChatToolWeather
        v-else-if="getToolName(part) === 'weather'"
        :invocation="{ ...(part as WeatherUIToolInvocation) }"
      />
      <!-- Web search tool (Google Search or generic web search) -->
      <UChatTool
        v-else-if="getToolName(part) === 'web_search' || getToolName(part) === 'google_search'"
        :text="isToolStreaming(part) ? 'Searching the web...' : 'Searched the web'"
        :suffix="getSearchQuery(part)"
        :streaming="isToolStreaming(part)"
        chevron="leading"
      >
        <ChatToolSources :sources="getSources(part)" />
      </UChatTool>
    </template>

    <!-- Text content block -->
    <template v-else-if="isTextUIPart(part)">
      <!-- Assistant messages render as markdown -->
      <ChatComark
        v-if="message.role === 'assistant'"
        :markdown="part.text"
        :streaming="isPartStreaming(part)"
      />
      <!-- User messages: show edit form or plain text -->
      <template v-else-if="message.role === 'user'">
        <ChatMessageEdit
          v-if="editing"
          :message="message"
          :text="part.text"
          @save="(msg, text) => emit('save', msg, text)"
          @cancel="emit('cancelEdit')"
        />
        <p v-else class="whitespace-pre-wrap">
          {{ part.text }}
        </p>
      </template>
    </template>
  </template>
</template>
