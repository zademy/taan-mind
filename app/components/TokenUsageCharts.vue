<!--
  TokenUsageCharts.vue - Token usage trend and model distribution.
  Uses provider-reported tokens only; unavailable usage is represented by
  coverage metrics elsewhere instead of estimated from message characters.
-->
<script setup lang="ts">
import type { AIUsageDailyPoint, AIUsageModelBreakdown } from '#shared/utils/aiUsage'

const props = defineProps<{
  daily: AIUsageDailyPoint[]
  models: AIUsageModelBreakdown[]
}>()

const trendData = computed(() =>
  props.daily.map(point => ({
    date: point.date,
    inputTokens: point.inputTokens,
    outputTokens: point.outputTokens
  }))
)

const trendCategories = computed<Record<string, BulletLegendItemInterface>>(() => ({
  inputTokens: { name: 'Input', color: 'var(--ui-primary)' },
  outputTokens: { name: 'Output', color: '#f97316' }
}))

const modelData = computed(() =>
  props.models.slice(0, 8).map(item => ({
    label: item.label,
    totalTokens: item.totalTokens
  }))
)

const modelCategories = computed<Record<string, BulletLegendItemInterface>>(() => ({
  totalTokens: { name: 'Tokens', color: 'var(--ui-primary)' }
}))

const trendXFormatter = (tick: number): string => {
  const date = trendData.value[tick]?.date
  if (!date) return ''

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`))
}

const modelXFormatter = (tick: number): string => modelData.value[tick]?.label ?? ''
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
    <section class="rounded-xl bg-elevated p-4 ring-1 ring-default/50 xl:col-span-2">
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">Usage trend</h2>
        <p class="text-xs text-muted">Daily provider-reported input and output tokens (UTC).</p>
      </div>

      <div class="h-64">
        <AreaChart
          v-if="trendData.length"
          :data="trendData"
          :categories="trendCategories"
          :height="256"
          :x-formatter="trendXFormatter"
          :x-num-ticks="Math.min(7, trendData.length)"
          :y-grid-line="true"
          :hide-legend="false"
        />
        <div v-else class="flex h-full items-center justify-center text-sm text-muted">
          No usage data
        </div>
      </div>
    </section>

    <section class="rounded-xl bg-elevated p-4 ring-1 ring-default/50">
      <div class="mb-4">
        <h2 class="text-sm font-semibold text-highlighted">Usage by model</h2>
        <p class="text-xs text-muted">Top models for the selected period.</p>
      </div>

      <div class="h-64">
        <BarChart
          v-if="modelData.length"
          :data="modelData"
          :categories="modelCategories"
          :height="256"
          :y-axis="['totalTokens']"
          x-axis="label"
          :x-formatter="modelXFormatter"
          :hide-legend="true"
          :y-grid-line="true"
        />
        <div v-else class="flex h-full items-center justify-center text-sm text-muted">
          No model data
        </div>
      </div>
    </section>
  </div>
</template>
