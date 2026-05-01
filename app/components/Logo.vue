<!--
  Logo.vue - Application logo component
  Assets in app/assets/ are processed by Vite with hashed filenames.
-->
<script setup lang="ts">
import logoSrc from '~/assets/images/logo.png'
</script>

<template>
  <img
    :src="logoSrc"
    alt="Taan Mind"
    width="32"
    height="32"
    class="h-8 w-8 shrink-0"
  >
</template>
