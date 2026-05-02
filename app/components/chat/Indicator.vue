<!--
  Indicator.vue - Animated matrix dot indicator
  Displays a 4x4 grid of dots that animate through predefined patterns
  to indicate that the AI is processing/thinking. Cycles through patterns
  with a 120ms interval.
-->
<script setup lang="ts">
/** Grid dimensions */
const size = 4
const gap = 2
/** Total number of dots in the grid */
const totalDots = size * size

/**
 * Predefined animation patterns.
 * Each pattern is an array of steps; each step is an array of dot indices
 * that should be active (visible) during that step.
 */
const patterns = [
  [[0], [1], [2], [3], [7], [11], [15], [14], [13], [12], [8], [4], [5], [6], [10], [9]],
  [
    [0, 4, 8, 12],
    [1, 5, 9, 13],
    [2, 6, 10, 14],
    [3, 7, 11, 15]
  ],
  [
    [5, 6, 9, 10],
    [1, 4, 7, 8, 11, 14],
    [0, 3, 12, 15],
    [1, 4, 7, 8, 11, 14],
    [5, 6, 9, 10]
  ],
  [[0], [1, 4], [2, 5, 8], [3, 6, 9, 12], [7, 10, 13], [11, 14], [15]]
]

/** Set of currently active dot indices */
const activeDots = ref<Set<number>>(new Set())
/** Current pattern index in the patterns array */
let patternIndex = 0
/** Current step index within the current pattern */
let stepIndex = 0

/** Advances to the next step in the animation, cycling patterns */
function nextStep() {
  const pattern = patterns[patternIndex]
  if (!pattern) return

  activeDots.value = new Set(pattern[stepIndex])
  stepIndex++

  // Reset step and advance to next pattern when current pattern completes
  if (stepIndex >= pattern.length) {
    stepIndex = 0
    patternIndex = (patternIndex + 1) % patterns.length
  }
}

/** Reference to the animation interval for cleanup */
let matrixInterval: ReturnType<typeof setInterval> | undefined

/** Start the animation loop when the component is mounted */
if (import.meta.client) {
  onMounted(() => {
    nextStep()
    matrixInterval = setInterval(nextStep, 120)
  })
}

/** Clear the animation interval when the component is unmounted */
onUnmounted(() => {
  clearInterval(matrixInterval)
})
</script>

<template>
  <!-- 4x4 grid container for the animated dots -->
  <div
    class="shrink-0 grid size-5"
    :style="{
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      gap: `${gap}px`
    }"
  >
    <!-- Render each dot with active/inactive opacity and scale transitions -->
    <span
      v-for="i in totalDots"
      :key="i"
      class="rounded-sm bg-linear-to-br from-primary/80 to-primary/40 transition-all duration-150"
      :class="activeDots.has(i - 1) ? 'opacity-100 scale-100' : 'opacity-30 scale-75'"
    />
  </div>
</template>
