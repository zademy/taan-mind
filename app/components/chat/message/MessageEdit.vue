<!--
  MessageEdit.vue - Inline message editing component
  Provides an inline textarea and save/cancel buttons for editing
  a user's chat message. Emits the updated text or a cancel event.
-->
<script setup lang="ts">
import type { UIMessage } from 'ai'

/** Props: the message being edited and its current text content */
const props = defineProps<{
  message: UIMessage
  text: string
}>()

/** Emits the save action with the message and new text, or a cancel action */
const emit = defineEmits<{
  save: [message: UIMessage, text: string]
  cancel: []
}>()

/** Local reactive copy of the text being edited */
const editingText = ref(props.text)
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <!-- Auto-resizing textarea for editing the message content -->
    <UTextarea
      v-model="editingText"
      autofocus
      autoresize
      :rows="1"
      size="xl"
      variant="none"
      :ui="{ base: 'p-0' }"
    />

    <!-- Action buttons: Cancel and Save -->
    <div class="flex gap-1.5 justify-end">
      <UButton
        size="sm"
        variant="soft"
        color="neutral"
        label="Cancel"
        @click="emit('cancel')"
      />
      <!-- Save is disabled when text is empty or unchanged -->
      <UButton
        size="sm"
        label="Save"
        :disabled="!editingText.trim() || editingText === text"
        @click="emit('save', message, editingText)"
      />
    </div>
  </div>
</template>
