<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { InlineAIActionId } from '#shared/utils/inlineAi'
import { getInlineAIActionsByCategory } from '#shared/utils/inlineAi'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    disabled?: boolean
    loading?: boolean
    buttonClass?: string
  }>(),
  {
    visible: true,
    disabled: false,
    loading: false,
    buttonClass: undefined
  }
)

const emit = defineEmits<{
  select: [action: InlineAIActionId]
}>()

const open = shallowRef(false)

const items = computed<DropdownMenuItem[][]>(() => [
  getInlineAIActionsByCategory('writing').map(action => ({
    label: action.label,
    description: action.description,
    icon: action.icon,
    disabled: props.disabled || props.loading,
    onSelect: () => emit('select', action.value)
  })),
  getInlineAIActionsByCategory('document').map(action => ({
    label: action.label,
    description: action.description,
    icon: action.icon,
    disabled: props.disabled || props.loading,
    onSelect: () => emit('select', action.value)
  }))
])

function openMenu() {
  if (props.disabled || props.loading || !props.visible) return
  open.value = true
}

defineExpose({ openMenu })
</script>

<template>
  <UDropdownMenu
    v-if="visible"
    v-model:open="open"
    :items="items"
    :content="{ side: 'top', align: 'end', sideOffset: 8, collisionPadding: 12 }"
    :ui="{ content: 'w-72' }"
  >
    <UButton
      color="primary"
      variant="soft"
      size="xs"
      icon="i-lucide-sparkles"
      label="AI"
      :loading="loading"
      :disabled="disabled"
      :class="buttonClass"
      aria-label="Open inline AI actions"
    />
  </UDropdownMenu>
</template>
