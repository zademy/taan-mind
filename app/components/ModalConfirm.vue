<!--
  ModalConfirm.vue - Confirmation modal dialog
  Displays a modal with a title, description, and two action buttons (Delete / Cancel).
  Emits a boolean result indicating the user's choice.
-->
<script setup lang="ts">
/** Props for the modal title and description text */
defineProps<{
  title: string
  description: string
}>()

/** Emits a boolean: true = confirmed (delete), false = cancelled */
const emit = defineEmits<{ close: [boolean] }>()
</script>

<template>
  <!-- Modal dialog that cannot be dismissed by clicking outside or pressing Escape -->
  <UModal
    :title="title"
    :description="description"
    :ui="{
      footer: 'flex-row-reverse justify-start'
    }"
    :close="false"
    :dismissible="false"
  >
    <template #footer>
      <!-- Confirm deletion button -->
      <UButton label="Delete" @click="emit('close', true)" />
      <!-- Cancel button – closes the modal without confirming -->
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('close', false)" />
    </template>
  </UModal>
</template>
