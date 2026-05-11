<!--
  CreateModal.vue - Project creation modal dialog
  Provides a simple form with a project name input. Emits the form data
  on submit; the parent component owns the API call, navigation, and
  sidebar data refresh logic.
-->
<script setup lang="ts">
/**
 * Emitted when the user submits or cancels.
 * @event close - false when cancelled, or { name: string } with the project name on submit
 */
const emit = defineEmits<{ close: [false | { name: string }] }>()

/** Two-way bound project name input value */
const name = ref('')

/** Whether the form can be submitted (non-empty name) */
const canSubmit = computed(() => name.value.trim().length > 0)

/**
 * Validates and emits the trimmed project name.
 * Does nothing if the name is empty after trimming.
 */
function submit() {
  const trimmedName = name.value.trim()
  if (!trimmedName) return
  emit('close', { name: trimmedName })
}
</script>

<template>
  <UModal
    title="New project"
    description="Create a Taanwork space for related chats. A starter chat will open automatically."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField label="Project name" required>
          <UInput
            v-model="name"
            placeholder="Client onboarding, taxes, research…"
            icon="i-lucide-folder"
            autofocus
            maxlength="80"
          />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('close', false)" />
      <UButton label="Create project" :disabled="!canSubmit" @click="submit" />
    </template>
  </UModal>
</template>
