<!-- TokenUsageHeatmap.vue - Compact UTC daily activity calendar. -->
<script setup lang="ts">
import type { AIUsageDailyPoint } from '#shared/utils/aiUsage'

const props = defineProps<{
  daily: AIUsageDailyPoint[]
}>()

const maximum = computed(() => Math.max(0, ...props.daily.map(point => point.totalTokens)))
const leadingDays = computed(() => {
  const first = props.daily[0]?.date
  return first ? new Date(`${first}T00:00:00Z`).getUTCDay() : 0
})

const cells = computed(() => [
  ...Array.from({ length: leadingDays.value }, (_, index) => ({
    key: `empty-${index}`,
    empty: true as const
  })),
  ...props.daily.map(point => ({
    key: point.date,
    empty: false as const,
    point
  }))
])

function intensityClass(totalTokens: number): string {
  if (totalTokens === 0 || maximum.value === 0) return 'bg-muted/40'

  const ratio = totalTokens / maximum.value
  if (ratio <= 0.25) return 'bg-primary/20'
  if (ratio <= 0.5) return 'bg-primary/40'
  if (ratio <= 0.75) return 'bg-primary/65'
  return 'bg-primary'
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value
  )
}
</script>

<template>
  <section class="rounded-xl bg-elevated p-4 ring-1 ring-default/50">
    <div class="mb-4">
      <h2 class="text-sm font-semibold text-highlighted">Usage heatmap</h2>
      <p class="text-xs text-muted">Daily token intensity. All dates use UTC.</p>
    </div>

    <div class="overflow-x-auto pb-2">
      <div
        class="grid w-max grid-flow-col grid-rows-7 gap-1"
        role="img"
        aria-label="Daily token usage heatmap"
      >
        <template v-for="cell in cells" :key="cell.key">
          <span v-if="cell.empty" class="size-3" aria-hidden="true" />
          <span
            v-else
            class="size-3 rounded-[3px] ring-1 ring-inset ring-default/20"
            :class="intensityClass(cell.point.totalTokens)"
            :title="`${cell.point.date}: ${formatTokens(cell.point.totalTokens)} tokens`"
          />
        </template>
      </div>
    </div>

    <div class="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
      <span>Less</span>
      <span class="size-3 rounded-[3px] bg-muted/40" />
      <span class="size-3 rounded-[3px] bg-primary/20" />
      <span class="size-3 rounded-[3px] bg-primary/40" />
      <span class="size-3 rounded-[3px] bg-primary/65" />
      <span class="size-3 rounded-[3px] bg-primary" />
      <span>More</span>
    </div>
  </section>
</template>
