<!--
  PersonalitiesModal.vue - Settings modal for custom AI personalities.
  Lets the current anonymous user manage up to three markdown prompts.
-->
<script setup lang="ts">
import type { CustomPersonality } from '#shared/utils/personalities'
import {
  DEFAULT_PERSONALITY,
  MAX_CUSTOM_PERSONALITIES,
  MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH,
  toCustomPersonalityValue
} from '#shared/utils/personalities'

const emit = defineEmits<{ close: [] }>()

const toast = useToast()
const {
  customPersonalities,
  create,
  update,
  remove,
  refresh: refreshCustomPersonalities,
  status
} = useCustomPersonalities()
const { personality } = usePersonality()

const editingId = shallowRef<string | null>(null)
const label = shallowRef('')
const prompt = shallowRef('')
const saving = shallowRef(false)
const deletingId = shallowRef<string | null>(null)

const isEditing = computed(() => editingId.value !== null)
const customCount = computed(() => customPersonalities.value?.length ?? 0)
const remainingSlots = computed(() => Math.max(MAX_CUSTOM_PERSONALITIES - customCount.value, 0))
const promptLength = computed(() => prompt.value.length)
const promptTooLong = computed(() => promptLength.value > MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH)
const createDisabledByQuota = computed(() => !isEditing.value && remainingSlots.value === 0)
const canSave = computed(
  () =>
    !saving.value &&
    !createDisabledByQuota.value &&
    label.value.trim().length > 0 &&
    prompt.value.trim().length > 0 &&
    !promptTooLong.value
)

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data
    return data?.statusMessage || data?.message || 'Could not save personality'
  }

  return 'Could not save personality'
}

function resetForm() {
  editingId.value = null
  label.value = ''
  prompt.value = ''
}

function editPersonality(item: CustomPersonality) {
  editingId.value = item.id
  label.value = item.label
  prompt.value = item.prompt
}

function getPromptPreview(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 96 ? `${normalized.slice(0, 96)}…` : normalized
}

async function savePersonality() {
  if (!canSave.value) return

  saving.value = true
  try {
    const body = {
      label: label.value.trim(),
      prompt: prompt.value
    }

    if (editingId.value) {
      await update(editingId.value, body)
      toast.add({
        title: 'Personality updated',
        icon: 'i-lucide-check'
      })
    } else {
      await create(body)
      toast.add({
        title: 'Personality added',
        description: 'It now appears in the chat selector',
        icon: 'i-lucide-sparkles'
      })
    }

    resetForm()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    saving.value = false
  }
}

async function deletePersonality(item: CustomPersonality) {
  deletingId.value = item.id
  try {
    await remove(item.id)

    if (personality.value === toCustomPersonalityValue(item.id)) {
      personality.value = DEFAULT_PERSONALITY
    }

    if (editingId.value === item.id) {
      resetForm()
    }

    toast.add({
      title: 'Personality deleted',
      icon: 'i-lucide-trash'
    })
  } catch (error) {
    toast.add({
      title: 'Error',
      description: getErrorMessage(error),
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <UModal
    title="Personalization"
    description="Add up to 3 custom personalities in Markdown. Default personalities cannot be edited here."
    :ui="{
      content: 'sm:max-w-3xl',
      footer: 'justify-between'
    }"
  >
    <template #body>
      <div class="space-y-6">
        <section class="rounded-2xl border border-default bg-elevated/40 p-4">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">
                {{ isEditing ? 'Edit personality' : 'New personality' }}
              </h3>
              <p class="mt-1 text-xs text-muted">Markdown is preserved as system prompt text.</p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ customCount }}/{{ MAX_CUSTOM_PERSONALITIES }}
            </UBadge>
          </div>

          <UAlert
            v-if="createDisabledByQuota"
            color="warning"
            variant="soft"
            icon="i-lucide-info"
            title="Limit reached"
            description="Delete a personality or edit an existing one to make changes."
            class="mb-4"
          />

          <div class="grid gap-4">
            <UFormField label="Name" required class="w-full">
              <UInput
                v-model="label"
                maxlength="60"
                placeholder="e.g. Financial analyst"
                :disabled="createDisabledByQuota || saving"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Markdown prompt"
              required
              :error="
                promptTooLong
                  ? `Maximum ${MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH} characters`
                  : undefined
              "
              class="w-full"
            >
              <UTextarea
                v-model="prompt"
                autoresize
                :rows="6"
                :maxrows="10"
                :maxlength="MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH"
                placeholder="# Personality&#10;- Respond with a clear tone&#10;- Use lists when helpful&#10;- Maintain context and precision"
                :disabled="createDisabledByQuota || saving"
                class="w-full"
              />
              <template #hint>
                <span :class="promptTooLong ? 'text-error' : 'text-muted'">
                  {{ promptLength }}/{{ MAX_CUSTOM_PERSONALITY_PROMPT_LENGTH }}
                </span>
              </template>
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                v-if="isEditing"
                color="neutral"
                variant="ghost"
                label="Cancel"
                :disabled="saving"
                @click="resetForm"
              />
              <UButton
                :label="isEditing ? 'Save changes' : 'Add personality'"
                icon="i-lucide-save"
                :loading="saving"
                :disabled="!canSave"
                @click="savePersonality"
              />
            </div>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-highlighted">Custom personalities</h3>
              <p class="text-xs text-muted">Only your custom personalities are shown.</p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-refresh-cw"
              :loading="status === 'pending'"
              @click="refreshCustomPersonalities()"
            />
          </div>

          <div class="overflow-hidden rounded-2xl border border-default">
            <table class="min-w-full divide-y divide-default text-sm">
              <thead class="bg-elevated/70 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Prompt</th>
                  <th class="w-28 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-if="customPersonalities.length === 0">
                  <td colspan="3" class="px-4 py-8 text-center text-muted">
                    You do not have custom personalities yet.
                  </td>
                </tr>
                <tr v-for="item in customPersonalities" :key="item.id" class="bg-default/40">
                  <td class="px-4 py-3 font-medium text-highlighted">
                    {{ item.label }}
                  </td>
                  <td class="max-w-md px-4 py-3 text-muted">
                    <span class="line-clamp-2">{{ getPromptPreview(item.prompt) }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-pencil"
                        aria-label="Edit personality"
                        @click="editPersonality(item)"
                      />
                      <UButton
                        color="error"
                        variant="ghost"
                        size="xs"
                        icon="i-lucide-trash"
                        aria-label="Delete personality"
                        :loading="deletingId === item.id"
                        @click="deletePersonality(item)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <p class="text-xs text-muted">{{ remainingSlots }} slots available.</p>
      <UButton color="neutral" variant="ghost" label="Close" @click="emit('close')" />
    </template>
  </UModal>
</template>
