<!--
  PersonalitySelect.vue - AI personality selector dropdown
  Allows the user to choose the AI personality/behavior for the current chat session.
  Uses the shared usePersonality composable for reactive state management.
-->
<script setup lang="ts">
/** Destructure the reactive personality reference and available personalities list from the composable */
const { personality, personalities } = usePersonality()
</script>

<template>
  <!-- Dropdown menu for selecting an AI personality, displays the matching icon for the current selection -->
  <USelectMenu
    v-model="personality"
    :items="personalities"
    size="sm"
    :icon="personalities.find((p) => p.value === personality)?.icon"
    variant="ghost"
    value-key="value"
    class="data-[state=open]:bg-elevated"
    :ui="{
      content: 'min-w-72',
      trailingIcon:
        'group-data-[state=open]:rotate-180 transition-transform duration-200'
    }"
  />
</template>
