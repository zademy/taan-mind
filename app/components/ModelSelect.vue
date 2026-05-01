<!--
  ModelSelect.vue - AI model selector dropdown
  Allows the user to choose which AI model to use for the current chat session.
  Uses the shared useModels composable for reactive state management.
-->
<script setup lang="ts">
/** Destructure the reactive model reference and available models list from the composable */
const { model, models } = useModels()
</script>

<template>
  <!-- Dropdown menu for selecting an AI model, displays the matching icon for the current selection -->
  <USelectMenu
    v-model="model"
    :items="models"
    size="sm"
    :icon="models.find(m => m.value === model)?.icon"
    variant="ghost"
    value-key="value"
    class="data-[state=open]:bg-elevated"
    :ui="{
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
