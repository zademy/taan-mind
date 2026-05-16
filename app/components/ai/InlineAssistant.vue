<script setup lang="ts">
import {
  INLINE_AI_MIN_CHARACTERS,
  getInlineAIAction,
  type InlineAIActionId
} from '#shared/utils/inlineAi'
import AIStreamingRewrite from './AIStreamingRewrite.vue'
import InlineAIButton from './InlineAIButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    model: string
    documentIds?: number[]
    disabled?: boolean
    minCharacters?: number
    buttonClass?: string
  }>(),
  {
    documentIds: () => [],
    disabled: false,
    minCharacters: INLINE_AI_MIN_CHARACTERS,
    buttonClass: undefined
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  accepted: [action: InlineAIActionId]
}>()

const toast = useToast()
const inlineButton = useTemplateRef<InstanceType<typeof InlineAIButton>>('inlineButton')
const {
  status,
  original,
  draft,
  activeAction,
  loadingMessage,
  error,
  isBusy,
  run,
  acceptDraft,
  cancel
} = useInlineAIRewrite()

const canSuggest = computed(
  () => props.modelValue.trim().length >= props.minCharacters && !props.disabled
)
const actionLabel = computed(() =>
  activeAction.value ? (getInlineAIAction(activeAction.value)?.label ?? 'Inline AI') : 'Inline AI'
)
const showRewrite = computed(() => status.value !== 'idle')

watch(error, message => {
  if (!message) return

  toast.add({
    title: 'Inline AI failed',
    description: message,
    icon: 'i-lucide-alert-circle',
    color: 'error'
  })
})

watch(
  () => props.modelValue,
  value => {
    if (status.value === 'ready' && value !== original.value) {
      cancel()
    }
  }
)

async function runAction(action: InlineAIActionId) {
  await run({
    action,
    text: props.modelValue,
    model: props.model,
    documentIds: props.documentIds
  })
}

async function retryAction() {
  const action = activeAction.value
  const text = original.value || props.modelValue
  if (!action || !text.trim()) return

  await run({
    action,
    text,
    model: props.model,
    documentIds: props.documentIds
  })
}

function accept() {
  const action = activeAction.value
  const value = acceptDraft()
  if (!value || !action) return

  emit('update:modelValue', value)
  emit('accepted', action)
  toast.add({
    title: 'Inline AI applied',
    description: `${actionLabel.value} updated your draft.`,
    icon: 'i-lucide-sparkles',
    color: 'primary'
  })
}

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => inlineButton.value?.openMenu()
  },
  ctrl_k: {
    usingInput: true,
    handler: () => inlineButton.value?.openMenu()
  },
  escape: {
    usingInput: true,
    handler: () => {
      if (showRewrite.value) cancel()
    }
  }
})
</script>

<template>
  <div v-if="canSuggest || showRewrite" class="flex min-w-0 flex-col gap-2">
    <div class="flex justify-end">
      <InlineAIButton
        ref="inlineButton"
        :visible="canSuggest"
        :disabled="disabled"
        :loading="isBusy"
        :button-class="buttonClass"
        @select="runAction"
      />
    </div>

    <AIStreamingRewrite
      v-if="showRewrite"
      :action-label="actionLabel"
      :status="status"
      :original="original"
      :draft="draft"
      :loading-message="loadingMessage"
      :error="error"
      @accept="accept"
      @retry="retryAction"
      @cancel="cancel"
    />
  </div>
</template>
