<!--
  Thinking.vue - Collapsible thinking/reasoning block
  Displays the AI's reasoning process in a collapsible section.
  While streaming, it auto-expands and shows a timer.
  Once complete, the user can toggle visibility and see the total thinking duration.
-->
<script setup lang="ts">
/** Props: the thinking text content and whether the message is still streaming */
const props = defineProps<{
  text: string
  streaming: boolean
}>()

/** Whether the thinking block is currently expanded */
const isExpanded = ref(props.streaming)
/** Timestamp when thinking started */
const startTime = ref<number | null>(null)
/** Elapsed thinking duration in seconds */
const duration = ref(0)
/** Interval reference for the duration timer */
let timer: ReturnType<typeof setInterval> | null = null

/** Starts the duration timer, updating every 500ms */
function startTimer() {
  startTime.value = Date.now()
  timer = setInterval(() => {
    if (startTime.value) {
      duration.value = Math.round((Date.now() - startTime.value) / 1000)
    }
  }, 500)
}

/** Stops the duration timer */
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

// Start the timer immediately if already streaming
if (props.streaming) {
  startTimer()
}

/** Watch for streaming state changes to start/stop the timer and toggle expansion */
watch(
  () => props.streaming,
  val => {
    if (val) {
      isExpanded.value = true
      startTimer()
    } else {
      stopTimer()
      isExpanded.value = false
    }
  }
)

/** Clean up the timer on component unmount */
onUnmounted(() => stopTimer())

/** Computed header text showing thinking status and duration */
const headerText = computed(() => {
  if (props.streaming) return 'Thinking...'
  if (duration.value === 0) return 'Thought for less than a second'
  if (duration.value === 1) return 'Thought for 1 second'
  return `Thought for ${duration.value} seconds`
})

/** Toggles the expanded state (only when not actively streaming) */
function toggle() {
  if (!props.streaming) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <div class="my-1">
    <!-- Clickable header showing thinking status with appropriate icon -->
    <button
      class="flex items-center gap-1.5 text-sm text-muted cursor-pointer select-none hover:text-highlighted transition-colors"
      :class="{ 'cursor-default': streaming }"
      @click="toggle"
    >
      <!-- Animated sparkles icon while actively thinking -->
      <UIcon v-if="streaming" name="i-lucide-sparkles" class="size-4 animate-pulse text-muted" />
      <!-- Chevron icon that rotates based on expanded state -->
      <UIcon
        v-else
        name="i-lucide-chevron-down"
        class="size-3.5 text-muted transition-transform duration-200"
        :class="{ '-rotate-90': !isExpanded }"
      />
      <span>{{ headerText }}</span>
    </button>

    <!-- Collapsible content area with smooth grid-based animation -->
    <div
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :style="{
        display: 'grid',
        gridTemplateRows: isExpanded ? '1fr' : '0fr'
      }"
    >
      <div class="overflow-hidden">
        <!-- Thinking text with a left border accent -->
        <div
          class="pl-4 mt-1.5 border-l border-muted/30 text-sm text-muted whitespace-pre-wrap leading-relaxed"
        >
          {{ text }}
        </div>
      </div>
    </div>
  </div>
</template>
