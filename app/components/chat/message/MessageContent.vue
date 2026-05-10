<!--
  MessageContent.vue — Chat message content renderer

  Responsible for iterating over the merged message parts of a `UIMessage` and
  rendering each part type with the appropriate child component:

    Part type            │ Component / behaviour
   ──────────────────────┼───────────────────────────────────────────────────
    Reasoning / thinking │ `<ChatMessageThinking>` — collapsible block + timer
    Tool invocation      │ Dispatched by tool name:
                         │   'chart'         → `<ChatToolChart>` (ClientOnly)
                         │   'weather'       → `<ChatToolWeather>`
                         │   'web_search'    → `<UChatTool>` + `<ChatToolSources>`
                         │   'google_search' → `<UChatTool>` + `<ChatToolSources>`
    Text (assistant)     │ `<ChatComark>` (markdown) + `<ChatMessageReferenceLinks>`
    Text (user)          │ Edit form (`<ChatMessageEdit>`) or plain `<p>`

  Key concepts:
    • `getMergedParts()` (app/utils/ai.ts) — merges consecutive text parts and
      inlines source-URL parts as MDC components so the markdown renderer can
      display interactive source links.
    • `isPartStreaming()` / `isToolStreaming()` — detect whether a part is still
      being streamed from the AI backend, enabling loading UI states.
    • Tool type guards (`isReasoningUIPart`, `isTextUIPart`, `isToolUIPart`) and
      `getToolName()` come from the `ai` package.

  Props:
    message – The full `UIMessage` object from the AI SDK.
    editing – Whether the user is currently editing this message (user role only).

  Emits:
    save(payload: UIMessage, text: string) – User confirmed an edit.
    cancelEdit()                            – User cancelled edit mode.

  Related files:
    app/utils/ai.ts          – getMergedParts, isPartStreaming, isToolStreaming
    app/utils/tool.ts        – getSearchQuery, getSources
    shared/utils/tools/*.ts  – ChartUIToolInvocation, WeatherUIToolInvocation types
-->
<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName } from 'ai'
import type { UIMessage } from 'ai'
import { isPartStreaming, isToolStreaming } from '@nuxt/ui/utils/ai'

// ─── Props ────────────────────────────────────────────────────────────────────
/** The full UIMessage object and its current editing state. */
defineProps<{
  message: UIMessage
  editing: boolean
}>()

// ─── Emits ────────────────────────────────────────────────────────────────────
/** Events for saving a user edit and for cancelling edit mode. */
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
    <!-- ── Reasoning / thinking block ──────────────────────────────────── -->
    <!-- Collapsible section showing the model's chain-of-thought reasoning -->
    <ChatMessageThinking
      v-if="isReasoningUIPart(part)"
      :text="part.text"
      :streaming="isPartStreaming(part)"
    />

    <!-- ── Tool invocation block ───────────────────────────────────────── -->
    <!-- Dispatches to the correct tool component based on tool name -->
    <template v-else-if="isToolUIPart(part)">
      <!-- Chart tool: client-only because it relies on canvas / SVG rendering -->
      <ClientOnly v-if="getToolName(part) === 'chart'">
        <ChatToolChart :invocation="{ ...(part as ChartUIToolInvocation) }" />
        <template #fallback>
          <!-- Placeholder skeleton while the chart component loads -->
          <div class="h-48 animate-pulse bg-muted/20 rounded-xl my-5" />
        </template>
      </ClientOnly>

      <!-- Weather tool: renders a gradient card with forecast data -->
      <ChatToolWeather
        v-else-if="getToolName(part) === 'weather'"
        :invocation="{ ...(part as WeatherUIToolInvocation) }"
      />

      <!-- Web search tool: covers both 'web_search' and 'google_search' providers -->
      <!-- Displays the search query and, once complete, lists source links -->
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

    <!-- ── Text content block ──────────────────────────────────────────── -->
    <template v-else-if="isTextUIPart(part)">
      <!-- Assistant messages: render as rich markdown + reference link chips -->
      <template v-if="message.role === 'assistant'">
        <ChatComark :markdown="part.text" :streaming="isPartStreaming(part)" />
        <!-- Only show reference links once the part has finished streaming -->
        <ChatMessageReferenceLinks v-if="!isPartStreaming(part)" :text="part.text" />
      </template>

      <!-- User messages: show edit form when editing, otherwise plain text -->
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
