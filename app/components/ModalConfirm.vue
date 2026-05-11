<!--
  ModalConfirm.vue - Confirmation modal dialog
  Displays a modal with a title, description, and two action buttons (Delete / Cancel).
  Emits a boolean result indicating the user's choice.
-->
<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

/** Props for the modal title and description text */
/**
 * Component props for the confirmation modal.
 * @property {string} title - Modal header text
 * @property {string} description - Descriptive body text explaining the action
 * @property {string} confirmLabel - Label for the confirmation button
 * @property {string} cancelLabel - Label for the cancellation button
 * @property {ButtonProps['color']} confirmColor - Color theme for the confirmation button
 */
const props = withDefaults(
  defineProps<{
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    confirmColor?: ButtonProps['color']
  }>(),
  {
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    confirmColor: 'error'
  }
)

/**
 * Emitted when the user clicks either button.
 * @event close - true if confirmed, false if cancelled
 */
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
      <UButton
        :label="props.confirmLabel"
        :color="props.confirmColor"
        @click="emit('close', true)"
      />
      <!-- Cancel button – closes the modal without confirming -->
      <UButton
        color="neutral"
        variant="ghost"
        :label="props.cancelLabel"
        @click="emit('close', false)"
      />
    </template>
  </UModal>
</template>
